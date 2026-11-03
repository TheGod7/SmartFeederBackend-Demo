import { IsDateString, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class DispenseResultDto {
  @IsString()
  commandId!: string;

  @IsOptional()
  @IsString()
  feedingEventId?: string;

  @IsOptional()
  @IsString()
  scheduleId?: string;

  @IsIn(['completed', 'failed', 'partial', 'skipped'])
  status!: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  dispensedAt?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  dispensedGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  consumedGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  remainingGrams?: number;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  hardwareErrorCode?: string;
}
