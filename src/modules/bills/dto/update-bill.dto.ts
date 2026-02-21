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
import { CreateBillLineItemDto } from './create-bill.dto';

export class UpdateBillDto {
  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @IsOptional()
  @IsString({ message: 'Vendor invoice number must be a text value' })
  @MaxLength(100, { message: 'Vendor invoice number cannot exceed 100 characters' })
  vendorInvoiceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Bill date must be a valid date (YYYY-MM-DD)' })
  billDate?: string;

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

  @IsOptional()
  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'Bill must have at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateBillLineItemDto)
  lineItems?: CreateBillLineItemDto[];
}
