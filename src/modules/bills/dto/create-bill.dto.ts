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

export class CreateBillLineItemDto {
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

export class CreateBillDto {
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId: string;

  @IsOptional()
  @IsString({ message: 'Bill number must be a text value' })
  @MaxLength(50, { message: 'Bill number cannot exceed 50 characters' })
  billNumber?: string;

  @IsOptional()
  @IsString({ message: 'Vendor invoice number must be a text value' })
  @MaxLength(100, { message: 'Vendor invoice number cannot exceed 100 characters' })
  vendorInvoiceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsDateString({}, { message: 'Bill date must be a valid date (YYYY-MM-DD)' })
  billDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid date (YYYY-MM-DD)' })
  dueDate?: string;

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
  @IsUUID('4', { message: 'Payment account ID must be a valid UUID' })
  paymentAccountId?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Memo must be a text value' })
  @MaxLength(2000, { message: 'Memo cannot exceed 2000 characters' })
  memo?: string;

  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'Bill must have at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineItemDto)
  lineItems: CreateBillLineItemDto[];
}
