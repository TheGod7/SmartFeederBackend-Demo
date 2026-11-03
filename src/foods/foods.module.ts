import { Module } from '@nestjs/common';
import { FeederFoodController, FoodsController } from './foods.controller.js';
import { FoodsService } from './foods.service.js';
import { FoodsSeed } from './foods.seed.js';

@Module({ controllers: [FoodsController, FeederFoodController], providers: [FoodsService, FoodsSeed] })
export class FoodsModule {}
