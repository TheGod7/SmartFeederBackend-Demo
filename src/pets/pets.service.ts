import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { DEMO_USER_ID } from '../common/demo-user.js';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.pet.findMany({ where: { userId: DEMO_USER_ID }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const pet = await this.prisma.pet.findFirst({ where: { id, userId: DEMO_USER_ID } });
    if (!pet) throw new NotFoundException('Mascota no encontrada');
    return pet;
  }

  create(dto: CreatePetDto) {
    return this.prisma.pet.create({ data: { ...dto, userId: DEMO_USER_ID } });
  }

  async update(id: string, dto: UpdatePetDto) {
    await this.findOne(id);
    return this.prisma.pet.update({ where: { id }, data: dto });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.pet.delete({ where: { id } });
  }
}
