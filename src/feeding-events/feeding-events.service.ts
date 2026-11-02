import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeedingEventDto } from './dto/create-feeding-event.dto.js';
import { UpdateFeedingEventDto } from './dto/update-feeding-event.dto.js';

@Injectable()
export class FeedingEventsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertFeeder(feederId: string) {
    const feeder = await this.prisma.feeder.findUnique({ where: { id: feederId } });
    if (!feeder) throw new NotFoundException('Comedero no encontrado');
  }

  async list(feederId: string, from?: string, to?: string) {
    await this.assertFeeder(feederId);
    return this.prisma.feedingEvent.findMany({
      where: {
        feederId,
        ...(from || to ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(feederId: string, eventId: string) {
    const event = await this.prisma.feedingEvent.findFirst({ where: { id: eventId, feederId } });
    if (!event) throw new NotFoundException('Evento de alimentación no encontrado');
    return event;
  }

  async create(feederId: string, dto: CreateFeedingEventDto) {
    await this.assertFeeder(feederId);
    return this.prisma.feedingEvent.create({
      data: {
        feederId,
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        dispensedAt: dto.dispensedAt ? new Date(dto.dispensedAt) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  async update(feederId: string, eventId: string, dto: UpdateFeedingEventDto) {
    await this.findOne(feederId, eventId);
    return this.prisma.feedingEvent.update({
      where: { id: eventId },
      data: {
        ...dto,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        dispensedAt: dto.dispensedAt ? new Date(dto.dispensedAt) : undefined,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : undefined,
      },
    });
  }

  async summary(feederId: string, from?: string, to?: string) {
    const events = await this.list(feederId, from, to);
    return events.reduce<Record<string, { date: string; dispensedGrams: number; consumedGrams: number; feedingCount: number; completedCount: number; partialCount: number; skippedCount: number }>>((result, event) => {
      const date = event.createdAt.toISOString().slice(0, 10);
      const item = result[date] ?? { date, dispensedGrams: 0, consumedGrams: 0, feedingCount: 0, completedCount: 0, partialCount: 0, skippedCount: 0 };
      item.dispensedGrams += event.dispensedGrams ?? 0;
      item.consumedGrams += event.consumedGrams ?? 0;
      item.feedingCount += 1;
      if (event.status === 'completed') item.completedCount += 1;
      if (event.status === 'partial') item.partialCount += 1;
      if (event.status === 'skipped') item.skippedCount += 1;
      result[date] = item;
      return result;
    }, {});
  }
}
