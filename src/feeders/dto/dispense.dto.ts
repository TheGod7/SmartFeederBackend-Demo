import { IsInt, Max, Min } from 'class-validator';

export class DispenseDto {
  @IsInt()
  @Min(1)
  @Max(1000)
  grams!: number;
}
