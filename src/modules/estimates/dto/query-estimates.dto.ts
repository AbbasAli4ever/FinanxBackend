import { IsOptional, IsString, IsEnum, IsNumber, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEstimatesDto {
  @IsOptional()
  @IsEnum(
    ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'VOID'],
    {
      message:
        'Status must be one of: DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CONVERTED, VOID',
    },
  )
  status?: string;

  @IsOptional()
  @IsString({ message: 'Customer ID must be a valid UUID' })
  customerId?: string;

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
  @IsEnum(
    ['estimateNumber', 'estimateDate', 'expirationDate', 'totalAmount', 'status', 'createdAt'],
    {
      message:
        'Sort by must be one of: estimateNumber, estimateDate, expirationDate, totalAmount, status, createdAt',
    },
  )
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
