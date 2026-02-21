import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsEnum,
  MaxLength,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
  @IsEnum(['Business', 'Individual'], {
    message: 'Customer type must be either "Business" or "Individual"',
  })
  customerType?: string;

  @IsNotEmpty({ message: 'Display name is required' })
  @IsString({ message: 'Display name must be a text value' })
  @MaxLength(255, { message: 'Display name cannot exceed 255 characters' })
  displayName: string;

  @IsOptional()
  @IsString({ message: 'Company name must be a text value' })
  @MaxLength(255, { message: 'Company name cannot exceed 255 characters' })
  companyName?: string;

  @IsOptional()
  @IsString({ message: 'First name must be a text value' })
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Last name must be a text value' })
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Middle name must be a text value' })
  @MaxLength(100, { message: 'Middle name cannot exceed 100 characters' })
  middleName?: string;

  @IsOptional()
  @IsString({ message: 'Title must be a text value (e.g. Mr., Mrs., Dr.)' })
  @MaxLength(20, { message: 'Title cannot exceed 20 characters' })
  title?: string;

  @IsOptional()
  @IsString({ message: 'Suffix must be a text value (e.g. Jr., Sr., III)' })
  @MaxLength(20, { message: 'Suffix cannot exceed 20 characters' })
  suffix?: string;

  // Contact
  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address (e.g. john@example.com)' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Phone must be a text value' })
  @MaxLength(50, { message: 'Phone number cannot exceed 50 characters' })
  phone?: string;

  @IsOptional()
  @IsString({ message: 'Mobile must be a text value' })
  @MaxLength(50, { message: 'Mobile number cannot exceed 50 characters' })
  mobile?: string;

  @IsOptional()
  @IsString({ message: 'Fax must be a text value' })
  @MaxLength(50, { message: 'Fax number cannot exceed 50 characters' })
  fax?: string;

  @IsOptional()
  @IsString({ message: 'Website must be a text value' })
  @MaxLength(255, { message: 'Website URL cannot exceed 255 characters' })
  website?: string;

  // Billing Address
  @IsOptional()
  @IsString({ message: 'Billing address line 1 must be a text value' })
  @MaxLength(255, { message: 'Billing address line 1 cannot exceed 255 characters' })
  billingAddressLine1?: string;

  @IsOptional()
  @IsString({ message: 'Billing address line 2 must be a text value' })
  @MaxLength(255, { message: 'Billing address line 2 cannot exceed 255 characters' })
  billingAddressLine2?: string;

  @IsOptional()
  @IsString({ message: 'Billing city must be a text value' })
  @MaxLength(100, { message: 'Billing city cannot exceed 100 characters' })
  billingCity?: string;

  @IsOptional()
  @IsString({ message: 'Billing state must be a text value' })
  @MaxLength(100, { message: 'Billing state cannot exceed 100 characters' })
  billingState?: string;

  @IsOptional()
  @IsString({ message: 'Billing postal code must be a text value' })
  @MaxLength(20, { message: 'Billing postal code cannot exceed 20 characters' })
  billingPostalCode?: string;

  @IsOptional()
  @IsString({ message: 'Billing country must be a 2-letter country code (e.g. US, GB, CA)' })
  @MaxLength(2, { message: 'Billing country must be a 2-letter country code (e.g. US, GB, CA)' })
  billingCountry?: string;

  // Shipping Address
  @IsOptional()
  @IsString({ message: 'Shipping address line 1 must be a text value' })
  @MaxLength(255, { message: 'Shipping address line 1 cannot exceed 255 characters' })
  shippingAddressLine1?: string;

  @IsOptional()
  @IsString({ message: 'Shipping address line 2 must be a text value' })
  @MaxLength(255, { message: 'Shipping address line 2 cannot exceed 255 characters' })
  shippingAddressLine2?: string;

  @IsOptional()
  @IsString({ message: 'Shipping city must be a text value' })
  @MaxLength(100, { message: 'Shipping city cannot exceed 100 characters' })
  shippingCity?: string;

  @IsOptional()
  @IsString({ message: 'Shipping state must be a text value' })
  @MaxLength(100, { message: 'Shipping state cannot exceed 100 characters' })
  shippingState?: string;

  @IsOptional()
  @IsString({ message: 'Shipping postal code must be a text value' })
  @MaxLength(20, { message: 'Shipping postal code cannot exceed 20 characters' })
  shippingPostalCode?: string;

  @IsOptional()
  @IsString({ message: 'Shipping country must be a 2-letter country code (e.g. US, GB, CA)' })
  @MaxLength(2, { message: 'Shipping country must be a 2-letter country code (e.g. US, GB, CA)' })
  shippingCountry?: string;

  // Tax
  @IsOptional()
  @IsString({ message: 'Tax number must be a text value' })
  @MaxLength(50, { message: 'Tax number cannot exceed 50 characters' })
  taxNumber?: string;

  @IsOptional()
  @IsBoolean({ message: 'Tax exempt must be true or false' })
  taxExempt?: boolean;

  // Payment Terms
  @IsOptional()
  @IsString({ message: 'Payment terms must be a text value (e.g. Net 30, Due on Receipt)' })
  @MaxLength(50, { message: 'Payment terms cannot exceed 50 characters' })
  paymentTerms?: string;

  // Financial
  @IsOptional()
  @IsNumber({}, { message: 'Opening balance must be a number' })
  @Min(0, { message: 'Opening balance cannot be negative' })
  openingBalance?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Opening balance date must be a valid date (e.g. 2026-01-31)' })
  openingBalanceDate?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Credit limit must be a number' })
  @Min(0, { message: 'Credit limit cannot be negative' })
  creditLimit?: number;

  // Notes
  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  notes?: string;
}
