import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  accountNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Account name is required' })
  @MaxLength(255)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Account type is required' })
  accountType: string;

  @IsString()
  @IsNotEmpty({ message: 'Detail type is required' })
  detailType: string;

  @IsUUID('4', { message: 'Parent account ID must be a valid UUID' })
  @IsOptional()
  parentAccountId?: string;

  @IsBoolean()
  @IsOptional()
  isSubAccount?: boolean;
}