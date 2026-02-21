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

export class CreateVendorDto {
  @IsOptional()
  @IsEnum(['Business', 'Individual'], {
    message: 'Vendor type must be either "Business" or "Individual"',
  })
  vendorType?: string;

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

  @IsOptional()
  @IsEmail({}, { message: 'Please enter a valid email address (e.g. vendor@example.com)' })
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

  @IsOptional()
  @IsString({ message: 'Address line 1 must be a text value' })
  @MaxLength(255, { message: 'Address line 1 cannot exceed 255 characters' })
  addressLine1?: string;

  @IsOptional()
  @IsString({ message: 'Address line 2 must be a text value' })
  @MaxLength(255, { message: 'Address line 2 cannot exceed 255 characters' })
  addressLine2?: string;

  @IsOptional()
  @IsString({ message: 'City must be a text value' })
  @MaxLength(100, { message: 'City cannot exceed 100 characters' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'State must be a text value' })
  @MaxLength(100, { message: 'State cannot exceed 100 characters' })
  state?: string;

  @IsOptional()
  @IsString({ message: 'Postal code must be a text value' })
  @MaxLength(20, { message: 'Postal code cannot exceed 20 characters' })
  postalCode?: string;

  @IsOptional()
  @IsString({ message: 'Country must be a 2-letter country code (e.g. US, GB, CA)' })
  @MaxLength(2, { message: 'Country must be a 2-letter country code (e.g. US, GB, CA)' })
  country?: string;

  @IsOptional()
  @IsString({ message: 'Tax number must be a text value' })
  @MaxLength(50, { message: 'Tax number cannot exceed 50 characters' })
  taxNumber?: string;

  @IsOptional()
  @IsString({ message: 'Business ID number must be a text value (e.g. EIN: 12-3456789)' })
  @MaxLength(50, { message: 'Business ID number cannot exceed 50 characters' })
  businessIdNo?: string;

  @IsOptional()
  @IsBoolean({ message: 'Track 1099 must be true or false' })
  track1099?: boolean;

  @IsOptional()
  @IsString({ message: 'Payment terms must be a text value (e.g. Net 30, Due on Receipt)' })
  @MaxLength(50, { message: 'Payment terms cannot exceed 50 characters' })
  paymentTerms?: string;

  @IsOptional()
  @IsString({ message: 'Account number must be a text value' })
  @MaxLength(50, { message: 'Account number cannot exceed 50 characters' })
  accountNumber?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Opening balance must be a number' })
  @Min(0, { message: 'Opening balance cannot be negative' })
  openingBalance?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Opening balance date must be a valid date (e.g. 2026-01-31)' })
  openingBalanceDate?: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  notes?: string;
}
