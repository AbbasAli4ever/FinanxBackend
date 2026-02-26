import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePurchaseOrderLineItemDto {
  @IsOptional()
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Expense account ID must be a valid UUID' })
  expenseAccountId?: string;

  @IsString({ message: 'Description is required for each line item' })
  @MaxLength(1000, { message: 'Description cannot exceed 1000 characters' })
  description: string;

  @IsNumber({}, { message: 'Quantity must be a valid number' })
  @Min(0.0001, { message: 'Quantity must be greater than 0' })
  @Type(() => Number)
  quantity: number;

  @IsNumber({}, { message: 'Unit price must be a valid number' })
  @Min(0, { message: 'Unit price cannot be negative' })
  @Type(() => Number)
  unitPrice: number;

  @IsOptional()
  @IsNumber({}, { message: 'Discount percent must be a valid number' })
  @Min(0, { message: 'Discount percent cannot be negative' })
  @Type(() => Number)
  discountPercent?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percent must be a valid number' })
  @Min(0, { message: 'Tax percent cannot be negative' })
  @Type(() => Number)
  taxPercent?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Sort order must be a valid number' })
  @Type(() => Number)
  sortOrder?: number;
}

export class CreatePurchaseOrderDto {
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId: string;

  @IsOptional()
  @IsString({ message: 'PO number must be a text value' })
  @MaxLength(50, { message: 'PO number cannot exceed 50 characters' })
  poNumber?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsDateString({}, { message: 'PO date must be a valid date (YYYY-MM-DD)' })
  poDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expected delivery date must be a valid date (YYYY-MM-DD)' })
  expectedDeliveryDate?: string;

  @IsOptional()
  @IsString({ message: 'Payment terms must be a text value' })
  @MaxLength(50, { message: 'Payment terms cannot exceed 50 characters' })
  paymentTerms?: string;

  @IsOptional()
  @IsEnum(['PERCENTAGE', 'FIXED'], { message: 'Discount type must be PERCENTAGE or FIXED' })
  discountType?: 'PERCENTAGE' | 'FIXED';

  @IsOptional()
  @IsNumber({}, { message: 'Discount value must be a valid number' })
  @Min(0, { message: 'Discount value cannot be negative' })
  @Type(() => Number)
  discountValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shippingAddressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  shippingAddressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shippingState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  shippingPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  shippingCountry?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Memo must be a text value' })
  @MaxLength(2000, { message: 'Memo cannot exceed 2000 characters' })
  memo?: string;

  @IsOptional()
  @IsString({ message: 'Vendor message must be a text value' })
  @MaxLength(2000, { message: 'Vendor message cannot exceed 2000 characters' })
  vendorMessage?: string;

  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'Purchase order must have at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineItemDto)
  lineItems: CreatePurchaseOrderLineItemDto[];
}
