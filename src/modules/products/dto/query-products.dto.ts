import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryProductsDto {
  @IsOptional()
  @IsString({ message: 'Search must be a text value' })
  search?: string;

  @IsOptional()
  @IsEnum(['INVENTORY', 'NON_INVENTORY', 'SERVICE', 'BUNDLE'], {
    message: 'Type filter must be INVENTORY, NON_INVENTORY, SERVICE, or BUNDLE',
  })
  type?: string;

  @IsOptional()
  @IsString({ message: 'Category ID must be a text value' })
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'Active filter must be true or false' })
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'Track inventory filter must be true or false' })
  trackInventory?: boolean;

  @IsOptional()
  @IsEnum(['name', 'sku', 'salesPrice', 'purchaseCost', 'quantityOnHand', 'createdAt', 'type'], {
    message: 'Sort by must be name, sku, salesPrice, purchaseCost, quantityOnHand, createdAt, or type',
  })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;
}
