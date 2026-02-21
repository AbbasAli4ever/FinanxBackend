import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
} from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'Category name must be a text value' })
  @MaxLength(255, { message: 'Category name cannot exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a text value' })
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'Active status must be true or false' })
  isActive?: boolean;
}
