import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TelemetryDto {
  @IsDateString() reportedAt!: string;
  @IsOptional() @IsInt() @Min(0) plateFoodGrams?: number;
  @IsOptional() @IsInt() @Min(0) hopperFoodGrams?: number;
  @IsOptional() @IsString() motorStatus?: string;
  @IsOptional() @IsString() sensorStatus?: string;
  @IsOptional() @IsInt() @Min(-120) @Max(0) wifiSignal?: number;
  @IsOptional() @IsString() firmwareVersion?: string;
}
