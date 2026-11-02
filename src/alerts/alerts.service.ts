import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list(feederId: string, unread?: boolean) {
    return this.prisma.alert.findMany({ where: { feederId, ...(unread === undefined ? {} : { read: !unread }) }, orderBy: { createdAt: 'desc' } });
  }
  create(feederId: string, dto: CreateAlertDto) {
    return this.prisma.alert.create({ data: { feederId, ...dto, severity: dto.severity ?? 'info', metadata: dto.metadata ? JSON.stringify(dto.metadata) : undefined } });
  }
  async read(alertId: string) {
    const alert = await this.prisma.alert.findUnique({ where: { id: alertId } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');
    return this.prisma.alert.update({ where: { id: alertId }, data: { read: true, readAt: new Date() } });
  }
  readAll(feederId: string) {
    return this.prisma.alert.updateMany({ where: { feederId, read: false }, data: { read: true, readAt: new Date() } });
  }
}
