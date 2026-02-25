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

export class CreateEstimateLineItemDto {
  @IsOptional()
  @IsUUID('4', { message: 'Product ID must be a valid UUID' })
  productId?: string;

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

export class CreateEstimateDto {
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  customerId: string;

  @IsOptional()
  @IsString({ message: 'Estimate number must be a text value' })
  @MaxLength(50, { message: 'Estimate number cannot exceed 50 characters' })
  estimateNumber?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsDateString({}, { message: 'Estimate date must be a valid date (YYYY-MM-DD)' })
  estimateDate: string;

  @IsOptional()
  @IsDateString({}, { message: 'Expiration date must be a valid date (YYYY-MM-DD)' })
  expirationDate?: string;

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
  @IsUUID('4', { message: 'Deposit account ID must be a valid UUID' })
  depositAccountId?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'Terms and conditions must be a text value' })
  @MaxLength(5000, { message: 'Terms and conditions cannot exceed 5000 characters' })
  termsAndConditions?: string;

  @IsOptional()
  @IsString({ message: 'Customer message must be a text value' })
  @MaxLength(2000, { message: 'Customer message cannot exceed 2000 characters' })
  customerMessage?: string;

  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'Estimate must have at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateEstimateLineItemDto)
  lineItems: CreateEstimateLineItemDto[];
}
