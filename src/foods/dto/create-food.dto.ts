import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateFoodDto {
  @IsString() brand!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsString() species!: string;
  @IsOptional() @IsNumber() @Min(0) proteinPercent?: number;
  @IsOptional() @IsNumber() @Min(0) fatPercent?: number;
  @IsOptional() @IsNumber() @Min(0) fiberPercent?: number;
  @IsOptional() @IsNumber() @Min(0) moisturePercent?: number;
  @IsOptional() @IsInt() @Min(0) energyKcalPerKg?: number;
  @IsOptional() @IsString() imageUrl?: string;
}
