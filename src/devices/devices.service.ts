import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommandStatusDto } from './dto/command-status.dto.js';
import { ConnectDeviceDto } from './dto/connect-device.dto.js';
import { TelemetryDto } from './dto/telemetry.dto.js';
import { DispenseResultDto } from './dto/dispense-result.dto.js';
import { AlertsService } from '../alerts/alerts.service.js';

@Injectable()
export class DevicesService {
  private static readonly PLATE_FOOD_THRESHOLD_GRAMS = 2;
  private static readonly UNEATEN_FOOD_ALERT_DELAY_MS = 20 * 60 * 1000;
  private static readonly MIN_VALID_DEVICE_TIME_MS = Date.parse('2020-01-01T00:00:00.000Z');
  private static readonly MAX_DEVICE_CLOCK_SKEW_MS = 10 * 60 * 1000;
  private static readonly RECENT_DISPENSE_WINDOW_MS = 6 * 60 * 60 * 1000;
  constructor(private readonly prisma: PrismaService, private readonly alerts: AlertsService) {}
  private deviceReportedAt(value: string, now = new Date()) {
    const reportedAt = new Date(value);
    if (
      !Number.isFinite(reportedAt.getTime()) ||
      reportedAt.getTime() < DevicesService.MIN_VALID_DEVICE_TIME_MS ||
      reportedAt.getTime() > now.getTime() + DevicesService.MAX_DEVICE_CLOCK_SKEW_MS
    ) {
      return now;
    }
    return reportedAt;
  }
  private async feeder(id: string) {
    const feeder = await this.prisma.feeder.findUnique({ where: { id } });
    if (!feeder) throw new NotFoundException('Dispositivo no encontrado');
    return feeder;
  }
  async connect(dto: ConnectDeviceDto) {
    if (dto.testCode !== (process.env.DEVICE_TEST_CODE ?? 'SMART-FEEDER-TEST')) {
      throw new BadRequestException('Código de prueba inválido');
    }
    const feeder = await this.prisma.feeder.findUnique({ where: { deviceCode: dto.deviceCode } });
    if (!feeder) throw new NotFoundException('Código de dispositivo no registrado');
    const now = new Date();
    await this.prisma.feeder.update({ where: { id: feeder.id }, data: { isOnline: true, lastSeenAt: now } });
    return { connected: true, feederId: feeder.id, deviceCode: feeder.deviceCode, serverTime: now.toISOString() };
  }
  async requestTelemetry(feederId: string) {
    await this.feeder(feederId);
    return this.prisma.deviceCommand.create({
      data: { feederId, type: 'telemetry_request', payload: '{}' },
    });
  }
  async telemetry(feederId: string, dto: TelemetryDto) {
    await this.feeder(feederId);
    const reportedAt = this.deviceReportedAt(dto.reportedAt);
    const latestStatus = await this.prisma.feederStatus.findFirst({
      where: { feederId },
      orderBy: { createdAt: 'desc' },
    });
    const telemetry = await this.prisma.deviceTelemetry.create({ data: { feederId, ...dto, reportedAt } });
    await this.prisma.feeder.update({ where: { id: feederId }, data: { isOnline: true, lastSeenAt: reportedAt } });
    await this.prisma.feederStatus.create({
      data: {
        feederId,
        plateFoodGrams: dto.plateFoodGrams ?? latestStatus?.plateFoodGrams,
        petPresent: dto.petPresent ?? latestStatus?.petPresent,
        petDistanceMm: dto.petDistanceMm ?? latestStatus?.petDistanceMm,
        hopperFoodPercent: dto.hopperFoodPercent !== undefined
          ? dto.hopperFoodPercent
          : latestStatus?.hopperFoodPercent,
        hopperDistanceMm: dto.hopperDistanceMm !== undefined
          ? dto.hopperDistanceMm
          : latestStatus?.hopperDistanceMm,
        motorStatus: dto.motorStatus ?? latestStatus?.motorStatus,
        sensorStatus: dto.sensorStatus ?? latestStatus?.sensorStatus,
        firmwareVersion: dto.firmwareVersion ?? latestStatus?.firmwareVersion,
        lastSeenAt: reportedAt,
        isOnline: true,
      },
    });
    if (dto.petEvent === 'detected') {
      const activeSession = await this.prisma.petPresenceSession.findFirst({
        where: { feederId, status: 'active' },
        orderBy: { detectedAt: 'desc' },
      });
      if (!activeSession) {
        const latestDispense = await this.prisma.deviceCommand.findFirst({
          where: {
            feederId,
            type: 'dispense',
            status: 'completed',
            completedAt: {
              lte: reportedAt,
              gte: new Date(reportedAt.getTime() - DevicesService.RECENT_DISPENSE_WINDOW_MS),
            },
          },
          orderBy: { completedAt: 'desc' },
        });
        const feedingEventId = latestDispense?.feedingEventId ?? undefined;
        await this.prisma.petPresenceSession.create({
          data: {
            feederId,
            feedingEventId,
            detectedAt: reportedAt,
            foodBeforeGrams: dto.plateFoodGrams,
            expectedGrams: latestDispense?.requestedGrams,
            status: 'active',
          },
        });
        await this.alerts.createAutomatic(feederId, {
          type: 'pet_detected',
          title: 'Mascota detectada',
          detail: 'Se detectó una mascota frente al comedero.',
          category: 'feeding',
          metadata: { petEvent: dto.petEvent, foodBeforeGrams: dto.plateFoodGrams },
        });
      }
    } else if (dto.petEvent === 'left') {
      const activeSession = await this.prisma.petPresenceSession.findFirst({
        where: { feederId, status: 'active' },
        orderBy: { detectedAt: 'desc' },
      });
      if (activeSession) {
        const consumedGrams = activeSession.foodBeforeGrams !== null && dto.plateFoodGrams !== undefined
          ? Math.max(0, activeSession.foodBeforeGrams - dto.plateFoodGrams)
          : null;
        const completedSession = await this.prisma.$transaction(async (transaction) => {
          const session = await transaction.petPresenceSession.update({
            where: { id: activeSession.id },
            data: {
              leftAt: reportedAt,
              foodAfterGrams: dto.plateFoodGrams,
              consumedGrams,
              status: 'completed',
            },
          });
          if (session.feedingEventId && consumedGrams !== null) {
            await transaction.feedingEvent.update({
              where: { id: session.feedingEventId },
              data: {
                consumedGrams,
                remainingGrams: dto.plateFoodGrams,
              },
            });
          }
          return session;
        });
        await this.alerts.createAutomatic(feederId, {
          type: 'pet_left',
          title: 'Mascota ya no está',
          detail: consumedGrams === null
            ? 'La mascota dejó de detectarse después de 20 segundos de ausencia confirmada.'
            : `La mascota dejó de detectarse después de 20 segundos de ausencia confirmada. Consumo estimado: ${consumedGrams} g.`,
          category: 'feeding',
          metadata: {
            petEvent: dto.petEvent,
            sessionId: completedSession.id,
            consumedGrams,
            foodBeforeGrams: activeSession.foodBeforeGrams,
            foodAfterGrams: dto.plateFoodGrams,
          },
        });
        if (consumedGrams !== null && consumedGrams === 0) {
          await this.alerts.createAutomatic(feederId, {
            type: 'food_untouched',
            title: 'Comida no consumida',
            detail: 'La mascota estuvo frente al comedero, pero no se detectó consumo.',
            category: 'feeding',
            metadata: { sessionId: completedSession.id, consumedGrams },
          });
        } else if (
          consumedGrams !== null &&
          activeSession.expectedGrams !== null &&
          consumedGrams < activeSession.expectedGrams
        ) {
          await this.alerts.createAutomatic(feederId, {
            type: 'food_partial',
            title: 'Comida consumida parcialmente',
            detail: `La mascota consumió ${consumedGrams} g de ${activeSession.expectedGrams} g.`,
            category: 'feeding',
            metadata: {
              sessionId: completedSession.id,
              consumedGrams,
              expectedGrams: activeSession.expectedGrams,
            },
          });
        }
      }
    }
    if (
      dto.petEvent === undefined &&
      dto.petPresent !== true &&
      dto.plateFoodGrams !== undefined &&
      dto.plateFoodGrams > DevicesService.PLATE_FOOD_THRESHOLD_GRAMS
    ) {
      const latestDispense = await this.prisma.deviceCommand.findFirst({
        where: { feederId, type: 'dispense', status: 'completed' },
        orderBy: { completedAt: 'desc' },
      });
      if (
        latestDispense?.completedAt &&
        Date.now() - latestDispense.completedAt.getTime() >= DevicesService.UNEATEN_FOOD_ALERT_DELAY_MS
      ) {
        await this.alerts.createAutomatic(feederId, {
          type: 'food_untouched',
          title: 'Comida sin recoger',
          detail: 'Han pasado 20 minutos y todavía queda comida en el plato. El gato pudo saltarse esta comida.',
          category: 'feeding',
          metadata: {
            commandId: latestDispense.id,
            plateFoodGrams: dto.plateFoodGrams,
          },
          dedupeKey: latestDispense.id,
        });
      }
    }
    if (dto.motorStatus === 'blocked' || dto.motorStatus === 'error') {
      await this.alerts.createAutomatic(feederId, {
        type: 'motor_error',
        title: 'Problema con el motor',
        detail: dto.motorStatus === 'blocked' ? 'El ESP32 reportó un motor bloqueado.' : 'El ESP32 reportó un error de motor.',
        category: 'device',
        metadata: { motorStatus: dto.motorStatus },
      });
    }
    if (dto.sensorStatus === 'error') {
      await this.alerts.createAutomatic(feederId, {
        type: 'sensor_error',
        title: 'Problema con un sensor',
        detail: 'El ESP32 reportó una lectura de sensor defectuosa.',
        category: 'device',
      });
    }
    if (dto.hopperFoodPercent === 0) {
      await this.alerts.createAutomatic(feederId, {
        type: 'hopper_empty',
        title: 'Depósito vacío',
        detail: 'El ESP32 reportó que no queda comida en el depósito.',
        category: 'hopper',
      });
    }
    return telemetry;
  }
  async pending(feederId: string) {
    const commands = await this.prisma.deviceCommand.findMany({
      where: { feederId, status: { in: ['queued', 'sent'] } },
      orderBy: { createdAt: 'asc' },
    });
    const latestStatus = await this.prisma.feederStatus.findFirst({
      where: { feederId },
      orderBy: { createdAt: 'desc' },
    });
    if (latestStatus?.plateFoodGrams === undefined || latestStatus.plateFoodGrams === null) {
      return commands;
    }

    const readyCommands = [];
    for (const command of commands) {
      if (command.type !== 'dispense' || !['queued', 'sent'].includes(command.status)) {
        readyCommands.push(command);
        continue;
      }
      if (
        command.requestedGrams === null ||
        latestStatus.plateFoodGrams < command.requestedGrams
      ) {
        readyCommands.push(command);
        continue;
      }
      const reason = `El plato tiene ${latestStatus.plateFoodGrams} g y el nuevo comando solicitaba ${command.requestedGrams} g; se omitió el dispensado.`;
      await this.prisma.$transaction(async (transaction) => {
        await transaction.deviceCommand.update({
          where: { id: command.id },
          data: { status: 'failed', failureReason: reason, completedAt: new Date() },
        });
        if (command.feedingEventId) {
          await transaction.feedingEvent.update({
            where: { id: command.feedingEventId },
            data: { status: 'skipped', failureReason: reason, completedAt: new Date() },
          });
        }
      });
      await this.alerts.createAutomatic(feederId, {
        type: 'food_skipped',
        title: 'Dispensado omitido',
        detail: 'El gato se saltó comida anterior y el plato ya tiene suficiente comida para la siguiente ración.',
        category: 'feeding',
        metadata: { commandId: command.id, plateFoodGrams: latestStatus?.plateFoodGrams },
        dedupeKey: command.id,
      });
    }
    return readyCommands;
  }
  async commandStatus(commandId: string, dto: CommandStatusDto) {
    const existing = await this.prisma.deviceCommand.findUnique({ where: { id: commandId } });
    if (!existing) throw new NotFoundException('Comando no encontrado');
    const now = new Date();
    const command = await this.prisma.deviceCommand.update({
      where: { id: commandId },
      data: { ...dto, ...(dto.status === 'sent' ? { sentAt: now } : {}), ...(dto.status === 'processing' ? { processingAt: now } : {}), ...(['completed', 'failed', 'expired'].includes(dto.status) ? { completedAt: now } : {}) },
    });
    if (command.feedingEventId && ['completed', 'failed', 'expired'].includes(dto.status)) {
      await this.prisma.feedingEvent.update({
        where: { id: command.feedingEventId },
        data: { status: dto.status === 'completed' ? 'completed' : dto.status === 'expired' ? 'skipped' : 'failed', completedAt: now, failureReason: dto.failureReason },
      });
    }
    return command;
  }
  async dispenseResult(feederId: string, dto: DispenseResultDto) {
    await this.feeder(feederId);
    const now = new Date();
    const result = await this.prisma.$transaction(async (transaction) => {
      const command = await transaction.deviceCommand.findFirst({ where: { id: dto.commandId, feederId }, include: { feedingEvent: true } });
      if (!command) throw new NotFoundException('Comando no encontrado para este comedero');
      if (['completed', 'failed', 'expired'].includes(command.status)) return { command, event: command.feedingEvent };

      const eventId = dto.feedingEventId ?? command.feedingEventId;
      const event = eventId
        ? await transaction.feedingEvent.findFirst({ where: { id: eventId, feederId } })
        : await transaction.feedingEvent.create({ data: { feederId, scheduleId: dto.scheduleId, status: dto.status } });
      if (!event) throw new NotFoundException('Evento de alimentación no encontrado');
      const commandStatus = dto.status === 'completed' || dto.status === 'partial' || dto.status === 'skipped' ? 'completed' : 'failed';
      const updatedCommand = await transaction.deviceCommand.update({
        where: { id: command.id },
        data: { status: commandStatus, failureReason: dto.failureReason ?? dto.hardwareErrorCode, completedAt: new Date(dto.completedAt ?? now), processingAt: command.processingAt ?? (dto.startedAt ? new Date(dto.startedAt) : undefined) },
      });
      const updatedEvent = await transaction.feedingEvent.update({
        where: { id: event.id },
        data: {
          status: dto.status,
          startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
          dispensedAt: dto.dispensedAt ? new Date(dto.dispensedAt) : undefined,
          completedAt: dto.completedAt ? new Date(dto.completedAt) : now,
          dispensedGrams: dto.dispensedGrams,
          consumedGrams: dto.consumedGrams,
          remainingGrams: dto.remainingGrams,
          failureReason: dto.failureReason ?? dto.hardwareErrorCode,
        },
      });
      const latestStatus = await transaction.feederStatus.findFirst({ where: { feederId }, orderBy: { createdAt: 'desc' } });
      await transaction.feederStatus.create({
        data: {
          feederId,
          plateFoodGrams: latestStatus?.plateFoodGrams,
          petPresent: latestStatus?.petPresent,
          petDistanceMm: latestStatus?.petDistanceMm,
          hopperDistanceMm: latestStatus?.hopperDistanceMm,
          hopperFoodPercent: latestStatus?.hopperFoodPercent,
          lastDispensedGrams: dto.dispensedGrams,
          lastDispensedAt: dto.dispensedAt ? new Date(dto.dispensedAt) : now,
          isOnline: true,
          lastSeenAt: now,
          firmwareVersion: latestStatus?.firmwareVersion,
          motorStatus: dto.status === 'failed' ? 'error' : 'ready',
          sensorStatus: latestStatus?.sensorStatus ?? 'not_calibrated',
        },
      });
      return { command: updatedCommand, event: updatedEvent };
    });
    if (result.event && ['failed', 'partial', 'skipped'].includes(dto.status)) {
      await this.alerts.createAutomatic(feederId, {
        type: dto.status === 'failed' ? 'dispense_failed' : dto.status === 'partial' ? 'dispense_partial' : 'dispense_skipped',
        title: dto.status === 'failed' ? 'Error al dispensar' : dto.status === 'partial' ? 'Dispensación parcial' : 'Dispensación omitida',
        detail: dto.failureReason ?? dto.hardwareErrorCode ?? 'La ración no se completó totalmente.',
        category: 'feeding',
        metadata: { commandId: dto.commandId, feedingEventId: result.event.id },
        dedupeKey: dto.commandId,
      });
    }
    return result;
  }
  async createCommand(feederId: string, type: string, requestedGrams?: number) {
    await this.feeder(feederId);
    return this.prisma.deviceCommand.create({ data: { id: randomUUID(), feederId, type, requestedGrams } });
  }
}
