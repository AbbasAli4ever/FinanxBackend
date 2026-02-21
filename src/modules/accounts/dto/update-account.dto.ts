import {
  IsString,
  IsOptional,
  MaxLength,
  IsBoolean,
} from 'class-validator';

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  accountNumber?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  detailType?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}