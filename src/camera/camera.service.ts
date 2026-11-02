import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCameraDto } from './dto/update-camera.dto.js';

@Injectable()
export class CameraService {
  constructor(private readonly prisma: PrismaService) {}
  async get(feederId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { feederId } });
    if (!camera) throw new NotFoundException('Cámara no configurada');
    return camera;
  }
  async update(feederId: string, dto: UpdateCameraDto) {
    return this.prisma.camera.upsert({ where: { feederId }, update: { ...dto }, create: { feederId, ...dto } });
  }
}
