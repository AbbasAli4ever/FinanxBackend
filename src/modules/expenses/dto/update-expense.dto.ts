import {
  IsString,
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
import { CreateExpenseLineItemDto } from './create-expense.dto';

export class UpdateExpenseDto {
  @IsOptional()
  @IsDateString({}, { message: 'Expense date must be a valid date (YYYY-MM-DD)' })
  expenseDate?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Expense account ID must be a valid UUID' })
  expenseAccountId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount cannot be negative' })
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsString({ message: 'Description must be a text value' })
  @MaxLength(2000, { message: 'Description cannot exceed 2000 characters' })
  description?: string;

  @IsOptional()
  @IsString({ message: 'Reference number must be a text value' })
  @MaxLength(100, { message: 'Reference number cannot exceed 100 characters' })
  referenceNumber?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  @MaxLength(2000, { message: 'Notes cannot exceed 2000 characters' })
  notes?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Payment account ID must be a valid UUID' })
  paymentAccountId?: string;

  @IsOptional()
  @IsEnum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER'], {
    message: 'Payment method must be CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, or OTHER',
  })
  paymentMethod?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percent must be a number' })
  @Min(0, { message: 'Tax percent cannot be negative' })
  @Type(() => Number)
  taxPercent?: number;

  @IsOptional()
  @IsBoolean({ message: 'Tax deductible must be true or false' })
  isTaxDeductible?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Billable must be true or false' })
  isBillable?: boolean;

  @IsOptional()
  @IsUUID('4', { message: 'Billable customer ID must be a valid UUID' })
  billableCustomerId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Markup percent must be a number' })
  @Min(0, { message: 'Markup percent cannot be negative' })
  @Type(() => Number)
  markupPercent?: number;

  @IsOptional()
  @IsBoolean({ message: 'Reimbursable must be true or false' })
  isReimbursable?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Is mileage must be true or false' })
  isMileage?: boolean;

  @IsOptional()
  @IsNumber({}, { message: 'Mileage distance must be a number' })
  @Min(0, { message: 'Mileage distance cannot be negative' })
  @Type(() => Number)
  mileageDistance?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Mileage rate must be a number' })
  @Min(0, { message: 'Mileage rate cannot be negative' })
  @Type(() => Number)
  mileageRate?: number;

  @IsOptional()
  @IsString({ message: 'Receipt URL must be a text value' })
  @MaxLength(500, { message: 'Receipt URL cannot exceed 500 characters' })
  receiptUrl?: string;

  @IsOptional()
  @IsString({ message: 'Receipt file name must be a text value' })
  @MaxLength(255, { message: 'Receipt file name cannot exceed 255 characters' })
  receiptFileName?: string;

  @IsOptional()
  @IsBoolean({ message: 'Is recurring must be true or false' })
  isRecurring?: boolean;

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'], {
    message: 'Recurring frequency must be DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, or YEARLY',
  })
  recurringFrequency?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Recurring end date must be a valid date (YYYY-MM-DD)' })
  recurringEndDate?: string;

  @IsOptional()
  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(2, { message: 'Split expenses must have at least 2 line items' })
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseLineItemDto)
  lineItems?: CreateExpenseLineItemDto[];
}
