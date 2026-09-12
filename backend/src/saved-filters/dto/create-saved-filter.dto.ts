import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class CreateSavedFilterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsObject()
  filterJson: Record<string, unknown>;
}
