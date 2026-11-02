import { Module } from '@nestjs/common';
import { FeederFoodController, FoodsController } from './foods.controller.js';
import { FoodsService } from './foods.service.js';

@Module({ controllers: [FoodsController, FeederFoodController], providers: [FoodsService] })
export class FoodsModule {}
