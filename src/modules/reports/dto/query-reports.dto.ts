import { IsDateString, IsOptional } from 'class-validator';

export class QueryDateRangeDto {
  @IsDateString({}, { message: 'startDate must be a valid date (YYYY-MM-DD)' })
  @IsOptional()
  startDate?: string;

  @IsDateString({}, { message: 'endDate must be a valid date (YYYY-MM-DD)' })
  @IsOptional()
  endDate?: string;

  @IsDateString({}, { message: 'asOfDate must be a valid date (YYYY-MM-DD)' })
  @IsOptional()
  asOfDate?: string;
}
