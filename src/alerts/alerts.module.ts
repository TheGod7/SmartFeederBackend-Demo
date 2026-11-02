import { Module } from '@nestjs/common';
import { AlertController, AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';

@Module({ controllers: [AlertsController, AlertController], providers: [AlertsService] })
export class AlertsModule {}
