import { IsBoolean, IsHexColor, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** T14 — ixtiyoriy. */
  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsHexColor()
  colorTag?: string | null;
}
