import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  MaxLength,
  Min,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateJournalEntryLineDto {
  @IsNotEmpty({ message: 'Account ID is required for each line' })
  @IsUUID('4', { message: 'Account ID must be a valid UUID' })
  accountId: string;

  @IsOptional()
  @IsNumber({}, { message: 'Debit amount must be a number' })
  @Min(0, { message: 'Debit amount cannot be negative' })
  @Type(() => Number)
  debit?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Credit amount must be a number' })
  @Min(0, { message: 'Credit amount cannot be negative' })
  @Type(() => Number)
  credit?: number;

  @IsOptional()
  @IsString({ message: 'Line description must be a text value' })
  @MaxLength(1000, { message: 'Line description cannot exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Contact type must be a text value' })
  @IsEnum(['CUSTOMER', 'VENDOR'], { message: 'Contact type must be CUSTOMER or VENDOR' })
  contactType?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Contact ID must be a valid UUID' })
  contactId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Sort order must be a number' })
  @Type(() => Number)
  sortOrder?: number;
}

export class CreateJournalEntryDto {
  @IsOptional()
  @IsString({ message: 'Entry number must be a text value' })
  @MaxLength(50, { message: 'Entry number cannot exceed 50 characters' })
  entryNumber?: string;

  @IsNotEmpty({ message: 'Entry date is required' })
  @IsDateString({}, { message: 'Entry date must be a valid date (YYYY-MM-DD)' })
  entryDate: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Description must be a text value' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  notes?: string;

  @IsOptional()
  @IsEnum(['STANDARD', 'ADJUSTING', 'CLOSING', 'REVERSING', 'RECURRING'], {
    message: 'Entry type must be one of: STANDARD, ADJUSTING, CLOSING, REVERSING, RECURRING',
  })
  entryType?: string;

  // Recurring
  @IsOptional()
  @IsBoolean({ message: 'isRecurring must be a boolean value' })
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], {
    message: 'Recurring frequency must be one of: DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY',
  })
  recurringFrequency?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Recurring end date must be a valid date (YYYY-MM-DD)' })
  recurringEndDate?: string;

  // Auto-Reversing
  @IsOptional()
  @IsBoolean({ message: 'isAutoReversing must be a boolean value' })
  isAutoReversing?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'Reversal date must be a valid date (YYYY-MM-DD)' })
  reversalDate?: string;

  // Source Linking
  @IsOptional()
  @IsString({ message: 'Source type must be a text value' })
  @MaxLength(50, { message: 'Source type cannot exceed 50 characters' })
  sourceType?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Source ID must be a valid UUID' })
  sourceId?: string;

  // Lines (required, min 2)
  @IsArray({ message: 'Lines must be an array' })
  @ArrayMinSize(2, { message: 'Journal entry must have at least 2 lines' })
  @ValidateNested({ each: true })
  @Type(() => CreateJournalEntryLineDto)
  lines: CreateJournalEntryLineDto[];
}
