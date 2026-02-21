import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BundleItemDto } from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString({ message: 'Product name must be a text value' })
  @MaxLength(255, { message: 'Product name cannot exceed 255 characters' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'SKU must be a text value' })
  @MaxLength(100, { message: 'SKU cannot exceed 100 characters' })
  sku?: string;

  @IsOptional()
  @IsString({ message: 'Barcode must be a text value' })
  @MaxLength(100, { message: 'Barcode cannot exceed 100 characters' })
  barcode?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @IsOptional()
  @IsString({ message: 'Sales description must be a text value' })
  salesDescription?: string;

  @IsOptional()
  @IsString({ message: 'Purchase description must be a text value' })
  purchaseDescription?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Sales price must be a number (e.g. 29.99)' })
  @Min(0, { message: 'Sales price cannot be negative' })
  salesPrice?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Purchase cost must be a number (e.g. 15.00)' })
  @Min(0, { message: 'Purchase cost cannot be negative' })
  purchaseCost?: number;

  @IsOptional()
  @IsUUID('4', { message: 'Unit of measure ID must be a valid UUID' })
  unitOfMeasureId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Income account ID must be a valid UUID' })
  incomeAccountId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Expense account ID must be a valid UUID' })
  expenseAccountId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Inventory asset account ID must be a valid UUID' })
  inventoryAssetAccountId?: string;

  @IsOptional()
  @IsBoolean({ message: 'Taxable must be true or false' })
  taxable?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Tax rate must be a number (e.g. 8.25 for 8.25%)' })
  @Min(0, { message: 'Tax rate cannot be negative' })
  taxRate?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Reorder point must be a number' })
  @Min(0, { message: 'Reorder point cannot be negative' })
  reorderPoint?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Reorder quantity must be a number' })
  @Min(0, { message: 'Reorder quantity cannot be negative' })
  reorderQuantity?: number;

  @IsOptional()
  @IsUUID('4', { message: 'Preferred vendor ID must be a valid UUID' })
  preferredVendorId?: string;

  @IsOptional()
  @IsString({ message: 'Image URL must be a text value' })
  @MaxLength(500, { message: 'Image URL cannot exceed 500 characters' })
  imageUrl?: string;

  @IsOptional()
  @IsBoolean({ message: 'Active status must be true or false' })
  isActive?: boolean;

  // Bundle items (only for type=BUNDLE)
  @IsOptional()
  @IsArray({ message: 'Bundle items must be an array of products with quantities' })
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  bundleItems?: BundleItemDto[];
}
