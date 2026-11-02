import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time!: string;
  @IsInt()
  @Min(1)
  @Max(1000)
  grams!: number;
  @IsBoolean()
  enabled = true;
  @IsArray()
  @IsInt({ each: true })
  daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6];
  @IsOptional()
  @IsString()
  timezone = 'UTC';
}
