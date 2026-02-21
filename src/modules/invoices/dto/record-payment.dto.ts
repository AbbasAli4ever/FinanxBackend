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

export class RecordPaymentDto {
  @IsNumber({}, { message: 'Payment amount must be a valid number' })
  @Min(0.01, { message: 'Payment amount must be at least 0.01' })
  @Type(() => Number)
  amount: number;

  @IsDateString({}, { message: 'Payment date must be a valid date (YYYY-MM-DD)' })
  paymentDate: string;

  @IsOptional()
  @IsEnum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER'], {
    message: 'Payment method must be one of: CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, OTHER',
  })
  paymentMethod?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Deposit account ID must be a valid UUID' })
  depositAccountId?: string;
}
