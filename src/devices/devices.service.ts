import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CommandStatusDto } from './dto/command-status.dto.js';
import { ConnectDeviceDto } from './dto/connect-device.dto.js';
import { TelemetryDto } from './dto/telemetry.dto.js';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}
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
        hopperFoodGrams: dto.hopperFoodGrams,
        motorStatus: dto.motorStatus,
        sensorStatus: dto.sensorStatus,
        firmwareVersion: dto.firmwareVersion,
        lastSeenAt: new Date(dto.reportedAt),
        isOnline: true,
      },
    });
    return telemetry;
  }
  pending(feederId: string) { return this.prisma.deviceCommand.findMany({ where: { feederId, status: { in: ['queued', 'sent', 'processing'] } }, orderBy: { createdAt: 'asc' } }); }
  async commandStatus(commandId: string, dto: CommandStatusDto) {
    const command = await this.prisma.deviceCommand.findUnique({ where: { id: commandId } });
    if (!command) throw new NotFoundException('Comando no encontrado');
    return this.prisma.deviceCommand.update({ where: { id: commandId }, data: { ...dto, ...(dto.status === 'sent' ? { sentAt: new Date() } : {}), ...(['completed', 'failed', 'expired'].includes(dto.status) ? { completedAt: new Date() } : {}) } });
  }
  async createCommand(feederId: string, type: string, requestedGrams?: number) {
    await this.feeder(feederId);
    return this.prisma.deviceCommand.create({ data: { id: randomUUID(), feederId, type, requestedGrams } });
  }
}
