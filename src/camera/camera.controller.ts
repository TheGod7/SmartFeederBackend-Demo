import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { apiData } from '../common/api-response.js';
import { UpdateCameraDto } from './dto/update-camera.dto.js';
import { CameraService } from './camera.service.js';

@Controller('feeders/:feederId/camera')
export class CameraController {
  constructor(private readonly service: CameraService) {}
  @Get() get(@Param('feederId') id: string) { return this.service.get(id).then(apiData); }
  @Patch() update(@Param('feederId') id: string, @Body() dto: UpdateCameraDto) { return this.service.update(id, dto).then(apiData); }
}
