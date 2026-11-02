import { CreateScheduleDto } from './create-schedule.dto.js';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class UpdateScheduleDto implements Partial<CreateScheduleDto> {
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time?: string;
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  grams?: number;
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek?: number[];
  @IsOptional()
  @IsString()
  timezone?: string;
}
