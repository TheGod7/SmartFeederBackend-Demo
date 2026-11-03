import { IsIn, IsOptional, IsString } from 'class-validator';

export class CommandStatusDto {
  @IsString() @IsIn(['queued', 'sent', 'processing', 'completed', 'failed', 'expired']) status!: string;
  @IsOptional() @IsString() failureReason?: string;
}
