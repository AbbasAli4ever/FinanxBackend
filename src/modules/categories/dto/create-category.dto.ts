import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString({ message: 'Category name must be a text value' })
  @MaxLength(255, { message: 'Category name cannot exceed 255 characters' })
  name: string;

  @IsOptional()
  @IsString({ message: 'Description must be a text value' })
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Parent category ID must be a valid UUID' })
  parentId?: string;
}
