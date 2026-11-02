import { Module } from '@nestjs/common';
import { CameraController } from './camera.controller.js';
import { CameraService } from './camera.service.js';

@Module({ controllers: [CameraController], providers: [CameraService] })
export class CameraModule {}
