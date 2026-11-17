import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CalibrationResultDto {
  @IsString()
  commandId!: string;

  @IsIn(['completed', 'failed'])
  status!: string;

  @IsOptional()
  @IsNumber()
  calibrationFactor?: number;

  @IsOptional()
  @IsNumber()
  tareOffset?: number;

  @IsOptional()
  @IsString()
  failureReason?: string;
}
