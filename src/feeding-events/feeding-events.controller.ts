import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { apiData, apiList } from '../common/api-response.js';
import { CreateFeedingEventDto } from './dto/create-feeding-event.dto.js';
import { UpdateFeedingEventDto } from './dto/update-feeding-event.dto.js';
import { FeedingEventsService } from './feeding-events.service.js';

@Controller('feeders/:feederId')
export class FeedingEventsController {
  constructor(private readonly service: FeedingEventsService) {}

  @Get('feeding-events')
  list(@Param('feederId') feederId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.list(feederId, from, to).then(apiList);
  }

  @Post('feeding-events')
  create(@Param('feederId') feederId: string, @Body() dto: CreateFeedingEventDto) {
    return this.service.create(feederId, dto).then(apiData);
  }

  @Get('feeding-events/:eventId')
  findOne(@Param('feederId') feederId: string, @Param('eventId') eventId: string) {
    return this.service.findOne(feederId, eventId).then(apiData);
  }

  @Patch('feeding-events/:eventId')
  update(@Param('feederId') feederId: string, @Param('eventId') eventId: string, @Body() dto: UpdateFeedingEventDto) {
    return this.service.update(feederId, eventId, dto).then(apiData);
  }

  @Get('consumption/summary')
  summary(@Param('feederId') feederId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.service.summary(feederId, from, to).then((data) => apiData(Object.values(data)));
  }
}
