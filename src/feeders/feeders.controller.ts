import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { apiData, apiList } from '../common/api-response.js';
import { CreateFeederDto } from './dto/create-feeder.dto.js';
import { CreateScheduleDto } from './dto/create-schedule.dto.js';
import { DispenseDto } from './dto/dispense.dto.js';
import { UpdateScheduleDto } from './dto/update-schedule.dto.js';
import { FeedersService } from './feeders.service.js';

@Controller('feeders')
export class FeedersController {
  constructor(private readonly service: FeedersService) {}
  @Get() findAll() { return this.service.findAll().then(apiList); }
  @Post() create(@Body() dto: CreateFeederDto) { return this.service.create(dto).then(apiData); }
  @Get(':feederId') findOne(@Param('feederId') id: string) { return this.service.findOne(id).then(apiData); }
  @Get(':feederId/dashboard') dashboard(@Param('feederId') id: string) { return this.service.dashboard(id).then(apiData); }
  @Get(':feederId/status') status(@Param('feederId') id: string) { return this.service.status(id).then(apiData); }
  @Get(':feederId/schedules') schedules(@Param('feederId') id: string) { return this.service.schedulesFor(id).then(apiList); }
  @Post(':feederId/schedules') schedule(@Param('feederId') id: string, @Body() dto: CreateScheduleDto) { return this.service.createSchedule(id, dto).then(apiData); }
  @Post(':feederId/actions/dispense') dispense(@Param('feederId') id: string, @Body() dto: DispenseDto) { return this.service.dispense(id, dto).then(apiData); }
}

@Controller('schedules')
export class SchedulesController {
  constructor(private readonly service: FeedersService) {}
  @Get(':scheduleId') findOne(@Param('scheduleId') id: string) { return this.service.findSchedule(id).then(apiData); }
  @Patch(':scheduleId') update(@Param('scheduleId') id: string, @Body() dto: UpdateScheduleDto) { return this.service.updateSchedule(id, dto).then(apiData); }
  @Delete(':scheduleId') remove(@Param('scheduleId') id: string) { return this.service.removeSchedule(id); }
}
