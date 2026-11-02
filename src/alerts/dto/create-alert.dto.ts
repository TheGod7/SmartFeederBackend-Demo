import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAlertDto {
  @IsString() type!: string;
  @IsString() title!: string;
  @IsString() detail!: string;
  @IsString() category!: string;
  @IsOptional() @IsString() severity?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
