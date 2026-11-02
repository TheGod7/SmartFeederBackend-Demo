import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { apiData, apiList } from '../common/api-response.js';
import { CommandStatusDto } from './dto/command-status.dto.js';
import { ConnectDeviceDto } from './dto/connect-device.dto.js';
import { TelemetryDto } from './dto/telemetry.dto.js';
import { DevicesService } from './devices.service.js';

@Controller('device')
export class DevicesController {
  constructor(private readonly service: DevicesService) {}
  @Post('connect') connect(@Body() dto: ConnectDeviceDto) { return this.service.connect(dto).then(apiData); }
  @Post(':feederId/telemetry') telemetry(@Param('feederId') id: string, @Body() dto: TelemetryDto) { return this.service.telemetry(id, dto).then(apiData); }
  @Get(':feederId/commands/pending') pending(@Param('feederId') id: string) { return this.service.pending(id).then(apiList); }
  @Patch('commands/:commandId') status(@Param('commandId') id: string, @Body() dto: CommandStatusDto) { return this.service.commandStatus(id, dto).then(apiData); }
}
