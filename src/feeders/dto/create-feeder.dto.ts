import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateFeederDto {
  @IsString()
  @MinLength(1)
  name!: string;
  @IsString()
  @MinLength(1)
  deviceCode!: string;
  @IsOptional()
  @IsString()
  petId?: string;
  @IsOptional()
  @IsString()
  timezone = 'UTC';
}
