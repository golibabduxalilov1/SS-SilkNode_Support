import { IsBoolean, IsEnum, IsHexColor, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryCluster } from '../entities/category.entity';

export class UpdateCategoryDto {
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

  /** T16 — minimal klasterlash. */
  @IsOptional()
  @IsEnum(CategoryCluster)
  cluster?: CategoryCluster;
}
