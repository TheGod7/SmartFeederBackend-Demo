import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateFeedingEventDto {
  @IsOptional()
  @IsString()
  scheduleId?: string;
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
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
  status?: string;
  @IsOptional()
  @IsString()
  failureReason?: string;
}
