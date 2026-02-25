import { IsOptional, IsString, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryDebitNotesDto {
  @IsOptional()
  @IsEnum(['DRAFT', 'OPEN', 'PARTIALLY_APPLIED', 'APPLIED', 'VOID'], {
    message: 'Status must be one of: DRAFT, OPEN, PARTIALLY_APPLIED, APPLIED, VOID',
  })
  status?: string;

  @IsOptional()
  @IsString({ message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @IsOptional()
  @IsString({ message: 'Bill ID must be a valid UUID' })
  billId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date from must be a valid date (YYYY-MM-DD)' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date to must be a valid date (YYYY-MM-DD)' })
  dateTo?: string;

  @IsOptional()
  @IsString({ message: 'Search must be a text value' })
  search?: string;

  @IsOptional()
  @IsEnum(['debitNoteNumber', 'debitNoteDate', 'totalAmount', 'remainingCredit', 'status', 'createdAt'], {
    message: 'Sort by must be one of: debitNoteNumber, debitNoteDate, totalAmount, remainingCredit, status, createdAt',
  })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'Sort order must be asc or desc' })
  sortOrder?: 'asc' | 'desc';

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
