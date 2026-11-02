import { IsString, MinLength } from 'class-validator';

export class ConnectDeviceDto {
  @IsString()
  @MinLength(1)
  deviceCode!: string;

  @IsString()
  @MinLength(1)
  testCode!: string;
}
