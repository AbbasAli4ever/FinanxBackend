import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryAccountsDto {
  @IsString()
  @IsOptional()
  accountType?: string;

  @IsString()
  @IsOptional()
  detailType?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isSubAccount?: boolean;

  @IsString()
  @IsOptional()
  parentAccountId?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['accountNumber', 'name', 'accountType', 'currentBalance', 'createdAt'])
  sortBy?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}