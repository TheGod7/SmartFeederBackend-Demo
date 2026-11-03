import { AlertsService } from '../alerts/alerts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SchedulerService } from './scheduler.service.js';

describe('SchedulerService', () => {
  const now = new Date('2026-11-03T14:08:30.000Z');
  const schedule = {
    id: 'schedule-1',
    feederId: 'feeder-1',
    time: '08:08',
    grams: 25,
    enabled: true,
    daysOfWeek: '[2]',
    timezone: 'America/Mexico_City',
    feeder: { id: 'feeder-1', timezone: 'UTC' },
  };

  it('creates one event and one queued command for the matching minute', async () => {
    const create = vi.fn()
      .mockResolvedValueOnce({ id: 'event-1' })
      .mockResolvedValueOnce({ id: 'command-1', status: 'queued' });
    const prisma = {
      schedule: { findMany: vi.fn().mockResolvedValue([schedule]) },
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        feedingEvent: { create },
        deviceCommand: { create },
      })),
      deviceCommand: { findMany: vi.fn().mockResolvedValue([]) },
      feeder: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const alerts = { createAutomatic: vi.fn() } as unknown as AlertsService;
    const service = new SchedulerService(prisma, alerts);

    await service.runCycle(now);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0][0].data.status).toBe('scheduled');
    expect(create.mock.calls[1][0].data).toMatchObject({
      feedingEventId: 'event-1',
      executionKey: 'schedule-1:2026-11-03T08:08',
      requestedGrams: 25,
      status: 'queued',
    });
  });

  it('does not create a command on a non-matching weekday or time', async () => {
    const create = vi.fn();
    const prisma = {
      schedule: { findMany: vi.fn().mockResolvedValue([{ ...schedule, time: '08:09' }]) },
      $transaction: vi.fn(),
      deviceCommand: { findMany: vi.fn().mockResolvedValue([]) },
      feeder: { findMany: vi.fn().mockResolvedValue([]) },
    } as unknown as PrismaService;
    const alerts = { createAutomatic: vi.fn() } as unknown as AlertsService;
    const service = new SchedulerService(prisma, alerts);

    await service.runCycle(now);

    expect(create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('expires stale queued commands and marks their event skipped', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const update = vi.fn().mockResolvedValue({});
    const prisma = {
      schedule: { findMany: vi.fn().mockResolvedValue([]) },
      deviceCommand: {
        findMany: vi.fn().mockResolvedValueOnce([{
          id: 'command-1',
          feederId: 'feeder-1',
          feedingEventId: 'event-1',
          status: 'queued',
        }]).mockResolvedValue([]),
      },
      feeder: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        deviceCommand: { updateMany },
        feedingEvent: { update },
      })),
    } as unknown as PrismaService;
    const alerts = { createAutomatic: vi.fn() } as unknown as AlertsService;
    const service = new SchedulerService(prisma, alerts);

    await service.runCycle(new Date('2026-11-03T14:20:00.000Z'));

    expect(updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'command-1', status: 'queued' } }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'event-1' }, data: expect.objectContaining({ status: 'skipped' }) }));
    expect(alerts.createAutomatic).toHaveBeenCalledWith('feeder-1', expect.objectContaining({ type: 'command_timeout' }));
  });
});
