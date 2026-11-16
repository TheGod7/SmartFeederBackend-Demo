import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TelemetryDto {
  @IsDateString() reportedAt!: string;
  @IsOptional() @IsInt() @Min(0) plateFoodGrams?: number;
  @IsOptional() @IsBoolean() petPresent?: boolean;
  @IsOptional() @IsInt() @Min(0) petDistanceMm?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100) hopperFoodPercent?: number;
  @IsOptional() @IsInt() @Min(0) @Max(200) hopperDistanceMm?: number;
  @IsOptional() @IsIn(['detected', 'left']) petEvent?: 'detected' | 'left';
  @IsOptional() @IsString() motorStatus?: string;
  @IsOptional() @IsString() sensorStatus?: string;
  @IsOptional() @IsInt() @Min(-120) @Max(0) wifiSignal?: number;
  @IsOptional() @IsString() firmwareVersion?: string;
}
