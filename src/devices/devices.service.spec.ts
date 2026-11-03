import { AlertsService } from '../alerts/alerts.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DevicesService } from './devices.service.js';

describe('DevicesService', () => {
  function createService() {
    const command = {
      id: 'command-1',
      feederId: 'feeder-1',
      feedingEventId: 'event-1',
      status: 'processing',
      processingAt: new Date('2026-11-03T14:00:00.000Z'),
      feedingEvent: { id: 'event-1', status: 'dispensing' },
    };
    const transactionFindFirst = vi.fn().mockResolvedValue(command);
    const prisma = {
      feeder: { findUnique: vi.fn().mockResolvedValue({ id: 'feeder-1' }) },
      deviceCommand: { findFirst: vi.fn().mockResolvedValue(command) },
      $transaction: vi.fn(async (callback: (transaction: unknown) => Promise<unknown>) => callback({
        deviceCommand: { findFirst: transactionFindFirst, update: vi.fn().mockResolvedValue({ ...command, status: 'completed' }) },
        feedingEvent: {
          findFirst: vi.fn().mockResolvedValue({ id: 'event-1', status: 'dispensing' }),
          update: vi.fn().mockResolvedValue({ id: 'event-1', status: 'completed' }),
        },
        feederStatus: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({}) },
      })),
    } as unknown as PrismaService;
    const alerts = { createAutomatic: vi.fn().mockResolvedValue({}) } as unknown as AlertsService;
    return { service: new DevicesService(prisma, alerts), prisma, alerts, transactionFindFirst };
  }

  it('updates command, event and status for a completed result', async () => {
    const { service, alerts } = createService();

    const result = await service.dispenseResult('feeder-1', {
      commandId: 'command-1',
      feedingEventId: 'event-1',
      status: 'completed',
      dispensedGrams: 25,
    });

    expect(result.command.status).toBe('completed');
    expect(result.event?.status).toBe('completed');
    expect(alerts.createAutomatic).not.toHaveBeenCalled();
  });

  it('creates a warning for a partial result and keeps the event partial', async () => {
    const { service, alerts } = createService();

    await service.dispenseResult('feeder-1', {
      commandId: 'command-1',
      feedingEventId: 'event-1',
      status: 'partial',
      dispensedGrams: 10,
      failureReason: 'Depósito casi vacío',
    });

    expect(alerts.createAutomatic).toHaveBeenCalledWith('feeder-1', expect.objectContaining({
      type: 'dispense_partial',
      dedupeKey: 'command-1',
    }));
  });

  it('does not execute a duplicate result for a terminal command', async () => {
    const { service, alerts, transactionFindFirst } = createService();
    transactionFindFirst.mockResolvedValueOnce({
      id: 'command-1',
      feederId: 'feeder-1',
      feedingEventId: 'event-1',
      status: 'completed',
      feedingEvent: { id: 'event-1', status: 'completed' },
    } as never);

    const result = await service.dispenseResult('feeder-1', {
      commandId: 'command-1',
      status: 'completed',
      dispensedGrams: 25,
    });

    expect(result.command.status).toBe('completed');
    expect(alerts.createAutomatic).not.toHaveBeenCalled();
  });
});
