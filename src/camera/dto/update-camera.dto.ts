import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateCameraDto {
  @IsBoolean() available!: boolean;
  @IsOptional() @IsString() streamType?: string;
  @IsOptional() @IsUrl() streamUrl?: string;
}
