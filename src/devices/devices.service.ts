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
  constructor(private readonly prisma: PrismaService, private readonly alerts: AlertsService) {}
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
  async telemetry(feederId: string, dto: TelemetryDto) {
    await this.feeder(feederId);
    const telemetry = await this.prisma.deviceTelemetry.create({ data: { feederId, ...dto, reportedAt: new Date(dto.reportedAt) } });
    await this.prisma.feeder.update({ where: { id: feederId }, data: { isOnline: true, lastSeenAt: new Date(dto.reportedAt) } });
    await this.prisma.feederStatus.create({
      data: {
        feederId,
        plateFoodGrams: dto.plateFoodGrams,
        hopperFoodPercent: dto.hopperFoodPercent,
        motorStatus: dto.motorStatus,
        sensorStatus: dto.sensorStatus,
        firmwareVersion: dto.firmwareVersion,
        lastSeenAt: new Date(dto.reportedAt),
        isOnline: true,
      },
    });
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
  pending(feederId: string) { return this.prisma.deviceCommand.findMany({ where: { feederId, status: { in: ['queued', 'sent', 'processing'] } }, orderBy: { createdAt: 'asc' } }); }
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
