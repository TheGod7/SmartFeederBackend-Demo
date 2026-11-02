import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFoodDto } from './dto/create-food.dto.js';

@Injectable()
export class FoodsService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.food.findMany({ where: { isActive: true }, orderBy: [{ brand: 'asc' }, { name: 'asc' }] }); }
  findOne(id: string) {
    return this.prisma.food.findUnique({ where: { id } }).then((food) => {
      if (!food) throw new NotFoundException('Alimento no encontrado');
      return food;
    });
  }
  create(dto: CreateFoodDto) { return this.prisma.food.create({ data: dto }); }
  async selected(feederId: string) {
    const relation = await this.prisma.feederFood.findFirst({ where: { feederId }, orderBy: { selectedAt: 'desc' }, include: { food: true } });
    return relation?.food ?? null;
  }
  async select(feederId: string, foodId: string) {
    await this.findOne(foodId);
    await this.prisma.feederFood.deleteMany({ where: { feederId } });
    const relation = await this.prisma.feederFood.create({ data: { feederId, foodId }, include: { food: true } });
    return relation.food;
  }
}
