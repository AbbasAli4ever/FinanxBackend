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
import { CreateInvoiceLineItemDto } from './create-invoice.dto';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  customerId?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Invoice date must be a valid date (YYYY-MM-DD)' })
  invoiceDate?: string;

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
  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'Invoice must have at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceLineItemDto)
  lineItems?: CreateInvoiceLineItemDto[];
}
