import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { apiData, apiList } from '../common/api-response.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { PetsService } from './pets.service.js';

@Controller('pets')
export class PetsController {
  constructor(private readonly service: PetsService) {}

  @Get()
  findAll() { return this.service.findAll().then(apiList); }

  @Get(':petId')
  findOne(@Param('petId') id: string) { return this.service.findOne(id).then(apiData); }

  @Post()
  create(@Body() dto: CreatePetDto) { return this.service.create(dto).then(apiData); }

  @Patch(':petId')
  update(@Param('petId') id: string, @Body() dto: UpdatePetDto) {
    return this.service.update(id, dto).then(apiData);
  }

  @Delete(':petId')
  remove(@Param('petId') id: string) { return this.service.remove(id); }
}
