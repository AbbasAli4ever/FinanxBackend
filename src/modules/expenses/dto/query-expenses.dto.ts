import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryExpensesDto {
  @IsOptional()
  @IsEnum(
    ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PAID', 'REIMBURSED', 'VOID'],
    { message: 'Status must be a valid expense status' },
  )
  status?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Expense account ID must be a valid UUID' })
  expenseAccountId?: string;

  @IsOptional()
  @IsEnum(['true', 'false'], { message: 'isBillable must be true or false' })
  isBillable?: string;

  @IsOptional()
  @IsEnum(['true', 'false'], { message: 'isReimbursable must be true or false' })
  isReimbursable?: string;

  @IsOptional()
  @IsEnum(['true', 'false'], { message: 'isMileage must be true or false' })
  isMileage?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateFrom must be a valid date' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'dateTo must be a valid date' })
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
  @IsEnum(['expenseNumber', 'expenseDate', 'totalAmount', 'status', 'createdAt'], {
    message: 'sortBy must be expenseNumber, expenseDate, totalAmount, status, or createdAt',
  })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'], { message: 'sortOrder must be asc or desc' })
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  @Type(() => Number)
  limit?: number;
}
