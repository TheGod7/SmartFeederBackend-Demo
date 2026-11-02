import { Module } from '@nestjs/common';
import { FeedersController, SchedulesController } from './feeders.controller.js';
import { FeedersService } from './feeders.service.js';

@Module({ controllers: [FeedersController, SchedulesController], providers: [FeedersService] })
export class FeedersModule {}
