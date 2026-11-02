import { IsOptional, IsString } from 'class-validator';

export class CommandStatusDto {
  @IsString() status!: string;
  @IsOptional() @IsString() failureReason?: string;
}
