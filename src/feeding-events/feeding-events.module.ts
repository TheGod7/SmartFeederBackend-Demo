import { Module } from '@nestjs/common';
import { FeedingEventsController } from './feeding-events.controller.js';
import { FeedingEventsService } from './feeding-events.service.js';

@Module({ controllers: [FeedingEventsController], providers: [FeedingEventsService] })
export class FeedingEventsModule {}
