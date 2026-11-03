import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  COMMAND_PROCESSING_TIMEOUT_MS,
  COMMAND_QUEUED_TIMEOUT_MS,
  COMMAND_SENT_TIMEOUT_MS,
  DEVICE_OFFLINE_TIMEOUT_MS,
  SCHEDULER_INTERVAL_MS,
  configuredTimeout,
} from './scheduler.constants.js';

type LocalScheduleTime = {
  dateKey: string;
  time: string;
  dayOfWeek: number;
};

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private interval?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  async onModuleInit() {
    this.interval = setInterval(() => {
      void this.runCycle();
    }, SCHEDULER_INTERVAL_MS);
    if (process.env.NODE_ENV !== 'test') await this.runCycle();
  }

  onModuleDestroy() {
    if (this.interval) clearInterval(this.interval);
  }

  async runCycle(now = new Date()) {
    if (this.running) return;
    this.running = true;
    try {
      await this.createScheduledCommands(now);
      await this.expireCommands(now);
      await this.markOfflineFeeders(now);
    } finally {
      this.running = false;
    }
  }

  private localTime(now: Date, timezone: string): LocalScheduleTime | null {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(now);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return {
        dateKey: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
        dayOfWeek: weekdays[values.weekday] ?? -1,
      };
    } catch {
      return null;
    }
  }

  private async createScheduledCommands(now: Date) {
    const schedules = await this.prisma.schedule.findMany({
      where: { enabled: true },
      include: { feeder: true },
    });

    for (const schedule of schedules) {
      const local = this.localTime(now, schedule.timezone || schedule.feeder.timezone);
      if (!local || local.time !== schedule.time) continue;
      const days = JSON.parse(schedule.daysOfWeek) as number[];
      if (!days.includes(local.dayOfWeek)) continue;

      const executionKey = `${schedule.id}:${local.dateKey}T${schedule.time}`;
      try {
        await this.prisma.$transaction(async (transaction) => {
          const event = await transaction.feedingEvent.create({
            data: {
              feederId: schedule.feederId,
              scheduleId: schedule.id,
              scheduledAt: now,
              status: 'scheduled',
            },
          });
          await transaction.deviceCommand.create({
            data: {
              feederId: schedule.feederId,
              feedingEventId: event.id,
              executionKey,
              type: 'dispense',
              requestedGrams: schedule.grams,
              payload: JSON.stringify({ scheduleId: schedule.id, feedingEventId: event.id }),
              status: 'queued',
            },
          });
        });
      } catch (error) {
        if (!this.isUniqueViolation(error)) throw error;
      }
    }
  }

  private async expireCommands(now: Date) {
    const limits = [
      { status: 'queued', age: configuredTimeout('COMMAND_QUEUED_TIMEOUT_MS', COMMAND_QUEUED_TIMEOUT_MS), terminal: 'expired' },
      { status: 'sent', age: configuredTimeout('COMMAND_SENT_TIMEOUT_MS', COMMAND_SENT_TIMEOUT_MS), terminal: 'expired' },
      { status: 'processing', age: configuredTimeout('COMMAND_PROCESSING_TIMEOUT_MS', COMMAND_PROCESSING_TIMEOUT_MS), terminal: 'failed' },
    ] as const;

    for (const limit of limits) {
      const commands = await this.prisma.deviceCommand.findMany({
        where: {
          status: limit.status,
          ...(limit.status === 'queued' ? { createdAt: { lt: new Date(now.getTime() - limit.age) } } :
            limit.status === 'sent' ? { sentAt: { lt: new Date(now.getTime() - limit.age) } } :
              { processingAt: { lt: new Date(now.getTime() - limit.age) } }),
        },
        include: { feedingEvent: true },
      });
      for (const command of commands) {
        await this.prisma.$transaction(async (transaction) => {
          const updated = await transaction.deviceCommand.updateMany({
            where: { id: command.id, status: limit.status },
            data: { status: limit.terminal, failureReason: 'El dispositivo no confirmó la ejecución', completedAt: now },
          });
          if (!updated.count) return;
          if (command.feedingEventId) {
            await transaction.feedingEvent.update({
              where: { id: command.feedingEventId },
              data: { status: limit.terminal === 'expired' ? 'skipped' : 'failed', completedAt: now, failureReason: 'El dispositivo no confirmó la ejecución' },
            });
          }
        });
        await this.alerts.createAutomatic(command.feederId, {
          type: 'command_timeout',
          title: 'Dispensación no confirmada',
          detail: `El comando ${command.id} no fue confirmado por el ESP32.`,
          category: 'feeding',
          metadata: { commandId: command.id, status: limit.terminal },
          dedupeKey: command.id,
        });
      }
    }
  }

  private async markOfflineFeeders(now: Date) {
    const cutoff = new Date(now.getTime() - configuredTimeout('DEVICE_OFFLINE_TIMEOUT_MS', DEVICE_OFFLINE_TIMEOUT_MS));
    const feeders = await this.prisma.feeder.findMany({
      where: { isOnline: true, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: cutoff } }] },
    });
    for (const feeder of feeders) {
      const updated = await this.prisma.feeder.updateMany({ where: { id: feeder.id, isOnline: true }, data: { isOnline: false } });
      if (!updated.count) continue;
      await this.alerts.createAutomatic(feeder.id, {
        type: 'device_offline',
        title: 'Comedero desconectado',
        detail: 'No se recibió telemetría del ESP32 dentro del tiempo esperado.',
        category: 'device',
        metadata: { lastSeenAt: feeder.lastSeenAt?.toISOString() ?? null },
      });
    }
  }

  private isUniqueViolation(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}
