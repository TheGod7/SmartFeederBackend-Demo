import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeederDto } from './dto/create-feeder.dto.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { DispenseDto } from './dto/dispense.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';
import { DEMO_USER_ID } from '../common/demo-user.js';

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
    const feeder = await this.findOne(feederId);
    const latest = await this.prisma.feederStatus.findFirst({ where: { feederId }, orderBy: { createdAt: 'desc' } });
    const lastDispensedEvent = await this.prisma.feedingEvent.findFirst({
      where: { feederId, dispensedGrams: { not: null } },
      orderBy: [{ dispensedAt: 'desc' }, { createdAt: 'desc' }],
      select: { dispensedGrams: true, dispensedAt: true },
    });
    const base = latest ?? {
      feederId,
      plateFoodGrams: null,
      hopperFoodGrams: null,
      hopperCapacityGrams: null,
      lastDispensedGrams: null,
      lastDispensedAt: null,
      isOnline: feeder.isOnline,
      lastSeenAt: feeder.lastSeenAt,
      motorStatus: 'ready',
      sensorStatus: 'not_calibrated',
    };
    return {
      ...base,
      lastDispensedGrams: lastDispensedEvent?.dispensedGrams ?? base.lastDispensedGrams,
      lastDispensedAt: lastDispensedEvent?.dispensedAt ?? base.lastDispensedAt,
    };
  }

  async dashboard(feederId: string) {
    const feeder = await this.findOne(feederId);
    return { feeder, status: await this.status(feederId), schedules: await this.schedulesFor(feederId), alerts: [], selectedFood: null, recentConsumption: [] };
  }

  async dispense(feederId: string, dto: DispenseDto) {
    await this.findOne(feederId);
    return this.prisma.deviceCommand.create({ data: { feederId, type: 'dispense', requestedGrams: dto.grams } });
  }
}
