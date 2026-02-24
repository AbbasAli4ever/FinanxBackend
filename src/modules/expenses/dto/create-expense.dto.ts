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

export class CreateExpenseLineItemDto {
  @IsNotEmpty({ message: 'Expense account ID is required for each split line' })
  @IsUUID('4', { message: 'Expense account ID must be a valid UUID' })
  expenseAccountId: string;

  @IsNotEmpty({ message: 'Line item description is required' })
  @IsString({ message: 'Line item description must be a text value' })
  @MaxLength(1000, { message: 'Line item description cannot exceed 1000 characters' })
  description: string;

  @IsNotEmpty({ message: 'Line item amount is required' })
  @IsNumber({}, { message: 'Line item amount must be a number' })
  @Min(0.01, { message: 'Line item amount must be at least 0.01' })
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsNumber({}, { message: 'Tax percent must be a number' })
  @Min(0, { message: 'Tax percent cannot be negative' })
  @Type(() => Number)
  taxPercent?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Sort order must be a number' })
  @Type(() => Number)
  sortOrder?: number;
}

export class CreateExpenseDto {
  @IsOptional()
  @IsString({ message: 'Expense number must be a text value' })
  @MaxLength(50, { message: 'Expense number cannot exceed 50 characters' })
  expenseNumber?: string;

  @IsNotEmpty({ message: 'Expense date is required' })
  @IsDateString({}, { message: 'Expense date must be a valid date (YYYY-MM-DD)' })
  expenseDate: string;

  @IsNotEmpty({ message: 'Expense account ID is required' })
  @IsUUID('4', { message: 'Expense account ID must be a valid UUID' })
  expenseAccountId: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({}, { message: 'Amount must be a number' })
  @Min(0, { message: 'Amount cannot be negative' })
  @Type(() => Number)
  amount: number;

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

  // Vendor (optional)
  @IsOptional()
  @IsUUID('4', { message: 'Vendor ID must be a valid UUID' })
  vendorId?: string;

  // Category (optional)
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  // Payment
  @IsOptional()
  @IsUUID('4', { message: 'Payment account ID must be a valid UUID' })
  paymentAccountId?: string;

  @IsOptional()
  @IsEnum(['CASH', 'CHECK', 'BANK_TRANSFER', 'CREDIT_CARD', 'OTHER'], {
    message: 'Payment method must be CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, or OTHER',
  })
  paymentMethod?: string;

  // Tax
  @IsOptional()
  @IsNumber({}, { message: 'Tax percent must be a number' })
  @Min(0, { message: 'Tax percent cannot be negative' })
  @Type(() => Number)
  taxPercent?: number;

  @IsOptional()
  @IsBoolean({ message: 'Tax deductible must be true or false' })
  isTaxDeductible?: boolean;

  // Billable
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

  // Reimbursable
  @IsOptional()
  @IsBoolean({ message: 'Reimbursable must be true or false' })
  isReimbursable?: boolean;

  // Mileage
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

  // Receipt
  @IsOptional()
  @IsString({ message: 'Receipt URL must be a text value' })
  @MaxLength(500, { message: 'Receipt URL cannot exceed 500 characters' })
  receiptUrl?: string;

  @IsOptional()
  @IsString({ message: 'Receipt file name must be a text value' })
  @MaxLength(255, { message: 'Receipt file name cannot exceed 255 characters' })
  receiptFileName?: string;

  // Recurring
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

  // Split expense line items (optional — min 2 if provided)
  @IsOptional()
  @IsArray({ message: 'Line items must be an array' })
  @ArrayMinSize(2, { message: 'Split expenses must have at least 2 line items' })
  @ValidateNested({ each: true })
  @Type(() => CreateExpenseLineItemDto)
  lineItems?: CreateExpenseLineItemDto[];
}
