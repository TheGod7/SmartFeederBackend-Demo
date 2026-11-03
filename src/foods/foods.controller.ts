import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { apiData, apiList } from '../common/api-response.js';
import { CreateFoodDto } from './dto/create-food.dto.js';
import { FoodsService } from './foods.service.js';

@Controller('foods')
export class FoodsController {
  constructor(private readonly service: FoodsService) {}
  @Get() list(@Query('species') species?: string) { return this.service.list(species).then(apiList); }
  @Get(':foodId') findOne(@Param('foodId') id: string) { return this.service.findOne(id).then(apiData); }
  @Post() create(@Body() dto: CreateFoodDto) { return this.service.create(dto).then(apiData); }
}

@Controller('feeders/:feederId/food')
export class FeederFoodController {
  constructor(private readonly service: FoodsService) {}
  @Get() selected(@Param('feederId') id: string) { return this.service.selected(id).then(apiData); }
  @Patch() select(@Param('feederId') id: string, @Body('foodId') foodId: string) { return this.service.select(id, foodId).then(apiData); }
}
