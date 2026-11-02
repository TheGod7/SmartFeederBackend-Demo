import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export type PetSpecies = 'cat' | 'dog' | 'other';

export class CreatePetDto {
  @IsString()
  name!: string;
  @IsIn(['cat', 'dog', 'other'])
  species!: PetSpecies;
  @IsOptional()
  @IsString()
  breed?: string;
  @IsInt()
  @Min(1)
  weightGrams!: number;
  @IsOptional()
  @IsString()
  birthDate?: string;
  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
