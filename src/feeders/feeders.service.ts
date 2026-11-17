import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeederDto } from './dto/create-feeder.dto.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { DispenseDto } from './dto/dispense.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';
import { DEMO_USER_ID } from '../common/demo-user.js';

const TELEMETRY_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class FeedersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() { return this.prisma.feeder.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { createdAt: 'desc' } }); }

  async findOne(id: string) {
    const feeder = await this.prisma.feeder.findFirst({ where: { id, userId: DEMO_USER_ID } });
    if (!feeder) throw new NotFoundException('Comedero no encontrado');
    return feeder;
  }

  create(dto: CreateFeederDto) {
    return this.prisma.feeder.create({ data: { ...dto, userId: DEMO_USER_ID } });
  }

  async schedulesFor(feederId: string) {
    await this.findOne(feederId);
    const schedules = await this.prisma.schedule.findMany({ where: { feederId }, orderBy: { time: 'asc' } });
    return schedules.map((schedule) => ({ ...schedule, daysOfWeek: JSON.parse(schedule.daysOfWeek) as number[] }));
  }

  async createSchedule(feederId: string, dto: CreateScheduleDto) {
    await this.findOne(feederId);
    const duplicate = await this.prisma.schedule.findFirst({ where: { feederId, time: dto.time, enabled: true } });
    if (duplicate && dto.enabled) throw new BadRequestException('Ya existe un horario activo a esa hora');
    const schedule = await this.prisma.schedule.create({ data: { ...dto, daysOfWeek: JSON.stringify(dto.daysOfWeek), feederId } });
    return { ...schedule, daysOfWeek: dto.daysOfWeek };
  }

  async calibrationFor(feederId: string) {
    await this.findOne(feederId);
    return this.prisma.calibration.findMany({ where: { feederId }, orderBy: { createdAt: 'desc' } });
  }

  async createCalibration(feederId: string, kind: 'tare' | 'weight', knownGrams?: number) {
    await this.findOne(feederId);
    const active = await this.prisma.calibration.findFirst({
      where: { feederId, status: { in: ['queued', 'sent', 'processing'] } },
    });
    if (active) throw new BadRequestException('Ya existe una calibración en curso');
    return this.prisma.$transaction(async (transaction) => {
      const command = await transaction.deviceCommand.create({
        data: {
          feederId,
          type: kind === 'tare' ? 'calibration_tare' : 'calibration_weight',
          payload: JSON.stringify({ kind, ...(knownGrams === undefined ? {} : { knownGrams }) }),
        },
      });
      return transaction.calibration.create({
        data: { feederId, commandId: command.id, kind, knownGrams },
        include: { command: true },
      });
    });
  }

  async findSchedule(id: string) {
    const schedule = await this.prisma.schedule.findFirst({ where: { id, feeder: { userId: DEMO_USER_ID } } });
    if (!schedule) throw new NotFoundException('Horario no encontrado');
    return { ...schedule, daysOfWeek: JSON.parse(schedule.daysOfWeek) as number[] };
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto) {
    await this.findSchedule(id);
    const data = {
      ...(dto.time === undefined ? {} : { time: dto.time }),
      ...(dto.grams === undefined ? {} : { grams: dto.grams }),
      ...(dto.enabled === undefined ? {} : { enabled: dto.enabled }),
      ...(dto.timezone === undefined ? {} : { timezone: dto.timezone }),
      ...(dto.daysOfWeek === undefined ? {} : { daysOfWeek: JSON.stringify(dto.daysOfWeek) }),
    };
    const schedule = await this.prisma.schedule.update({ where: { id }, data });
    return { ...schedule, daysOfWeek: JSON.parse(schedule.daysOfWeek) as number[] };
  }

  async removeSchedule(id: string) {
    await this.findSchedule(id);
    await this.prisma.schedule.delete({ where: { id } });
  }

  async status(feederId: string) {
    await this.findOne(feederId);
    const latest = await this.prisma.feederStatus.findFirst({ where: { feederId }, orderBy: { createdAt: 'desc' } });
    const lastDispensedEvent = await this.prisma.feedingEvent.findFirst({
      where: { feederId, dispensedGrams: { not: null } },
      orderBy: [{ dispensedAt: 'desc' }, { createdAt: 'desc' }],
      select: { dispensedGrams: true, dispensedAt: true },
    });
    const base = latest ?? {
      feederId,
      plateFoodGrams: null,
      petPresent: null,
      petDistanceMm: null,
      hopperFoodPercent: null,
      hopperDistanceMm: null,
      lastDispensedGrams: null,
      lastDispensedAt: null,
      isOnline: false,
      lastSeenAt: null,
      motorStatus: 'ready',
      sensorStatus: 'not_calibrated',
    };
    const lastSeenAt = base.lastSeenAt ? new Date(base.lastSeenAt).getTime() : Number.NaN;
    const isOnline = Number.isFinite(lastSeenAt) && Date.now() - lastSeenAt <= TELEMETRY_TIMEOUT_MS;
    return {
      ...base,
      isOnline,
      lastDispensedGrams: lastDispensedEvent?.dispensedGrams ?? base.lastDispensedGrams,
      lastDispensedAt: lastDispensedEvent?.dispensedAt ?? base.lastDispensedAt,
    };
  }

  async dashboard(feederId: string) {
    const feeder = await this.findOne(feederId);
    const [alerts, recentConsumption] = await Promise.all([
      this.prisma.alert.findMany({ where: { feederId }, orderBy: { createdAt: 'desc' }, take: 10 }),
      this.prisma.feedingEvent.findMany({ where: { feederId }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    return {
      feeder,
      status: await this.status(feederId),
      schedules: await this.schedulesFor(feederId),
      alerts,
      selectedFood: null,
      recentConsumption,
    };
  }

  async dispense(feederId: string, dto: DispenseDto) {
    await this.findOne(feederId);
    return this.prisma.$transaction(async (transaction) => {
      const event = await transaction.feedingEvent.create({ data: { feederId, status: 'scheduled' } });
      return transaction.deviceCommand.create({
        data: { feederId, feedingEventId: event.id, type: 'dispense', requestedGrams: dto.grams },
      });
    });
  }
}
