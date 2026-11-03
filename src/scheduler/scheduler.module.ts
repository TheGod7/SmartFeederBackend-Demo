import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module.js';
import { SchedulerService } from './scheduler.service.js';

@Module({ imports: [AlertsModule], providers: [SchedulerService] })
export class SchedulerModule {}
