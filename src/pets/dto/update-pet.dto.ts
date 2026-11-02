import { CreatePetDto } from './create-pet.dto.js';

export class UpdatePetDto implements Partial<CreatePetDto> {
  name?: string;
  species?: CreatePetDto['species'];
  breed?: string;
  weightGrams?: number;
  birthDate?: string;
  avatarUrl?: string | null;
}
