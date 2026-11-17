import { IsInt, Min } from 'class-validator';

export class CalibrationWeightDto {
  @IsInt()
  @Min(1)
  knownGrams!: number;
}
