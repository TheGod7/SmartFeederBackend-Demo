import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { apiData, apiList } from '../common/api-response.js';
import { CreateAlertDto } from './dto/create-alert.dto.js';
import { AlertsService } from './alerts.service.js';

@Controller('feeders/:feederId/alerts')
export class AlertsController {
  constructor(private readonly service: AlertsService) {}
  @Get() list(@Param('feederId') id: string, @Query('read') read?: string) { return this.service.list(id, read === undefined ? undefined : read === 'false').then(apiList); }
  @Post() create(@Param('feederId') id: string, @Body() dto: CreateAlertDto) { return this.service.create(id, dto).then(apiData); }
  @Patch('read-all') readAll(@Param('feederId') id: string) { return this.service.readAll(id).then(apiData); }
  @Get('unread-count') unreadCount(@Param('feederId') id: string) { return this.service.list(id, true).then((data) => apiData({ count: data.length })); }
}

@Controller('alerts')
export class AlertController {
  constructor(private readonly service: AlertsService) {}
  @Patch(':alertId/read') read(@Param('alertId') id: string) { return this.service.read(id).then(apiData); }
}
