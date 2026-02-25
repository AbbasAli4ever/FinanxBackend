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
import { CreateCreditNoteLineItemDto } from './create-credit-note.dto';

export class UpdateCreditNoteDto {
  @IsOptional()
  @IsUUID('4', { message: 'Customer ID must be a valid UUID' })
  customerId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Invoice ID must be a valid UUID' })
  invoiceId?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Credit note date must be a valid date (YYYY-MM-DD)' })
  creditNoteDate?: string;

  @IsOptional()
  @IsEnum(['PERCENTAGE', 'FIXED'], { message: 'Discount type must be PERCENTAGE or FIXED' })
  discountType?: 'PERCENTAGE' | 'FIXED';

  @IsOptional()
  @IsNumber({}, { message: 'Discount value must be a valid number' })
  @Min(0, { message: 'Discount value cannot be negative' })
  @Type(() => Number)
  discountValue?: number;

  @IsOptional()
  @IsUUID('4', { message: 'Refund account ID must be a valid UUID' })
  refundAccountId?: string;

  @IsOptional()
  @IsString({ message: 'Reason must be a text value' })
  @MaxLength(2000, { message: 'Reason cannot exceed 2000 characters' })
  reason?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(1, { message: 'Credit note must have at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => CreateCreditNoteLineItemDto)
  lineItems?: CreateCreditNoteLineItemDto[];
}
