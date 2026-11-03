import { Module } from '@nestjs/common';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';
import { AlertsModule } from '../alerts/alerts.module.js';

@Module({ imports: [AlertsModule], controllers: [DevicesController], providers: [DevicesService] })
export class DevicesModule {}
