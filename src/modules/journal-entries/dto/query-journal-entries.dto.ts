import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryJournalEntriesDto {
  @IsOptional()
  @IsEnum(['DRAFT', 'POSTED', 'VOID'], {
    message: 'Status must be one of: DRAFT, POSTED, VOID',
  })
  status?: string;

  @IsOptional()
  @IsEnum(['STANDARD', 'ADJUSTING', 'CLOSING', 'REVERSING', 'RECURRING'], {
    message: 'Entry type must be one of: STANDARD, ADJUSTING, CLOSING, REVERSING, RECURRING',
  })
  entryType?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Account ID must be a valid UUID' })
  accountId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid date (YYYY-MM-DD)' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid date (YYYY-MM-DD)' })
  dateTo?: string;

  @IsOptional()
  @IsNumber({}, { message: 'amountMin must be a number' })
  @Min(0, { message: 'amountMin cannot be negative' })
  @Type(() => Number)
  amountMin?: number;

  @IsOptional()
  @IsNumber({}, { message: 'amountMax must be a number' })
  @Min(0, { message: 'amountMax cannot be negative' })
  @Type(() => Number)
  amountMax?: number;

  @IsOptional()
  @IsString({ message: 'Search must be a text value' })
  search?: string;

  @IsOptional()
  @IsEnum(['entryDate', 'totalDebit', 'entryNumber', 'createdAt'], {
    message: 'sortBy must be one of: entryDate, totalDebit, entryNumber, createdAt',
  })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'sortOrder must be asc or desc' })
  sortOrder?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Type(() => Number)
  limit?: number;
}
