import {
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNumber,
  Min,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RefundDebitNoteDto {
  @IsNumber({}, { message: 'Refund amount must be a valid number' })
  @Min(0.01, { message: 'Refund amount must be at least 0.01' })
  @Type(() => Number)
  amount: number;

  @IsDateString({}, { message: 'Refund date must be a valid date (YYYY-MM-DD)' })
  refundDate: string;

  @IsOptional()
  @IsEnum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER'], {
    message: 'Payment method must be one of: CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, OTHER',
  })
  paymentMethod?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Refund account ID must be a valid UUID' })
  refundAccountId?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;
}
