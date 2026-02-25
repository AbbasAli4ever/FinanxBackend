import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyDebitNoteLineDto {
  @IsUUID('4', { message: 'Bill ID must be a valid UUID' })
  billId: string;

  @IsNumber({}, { message: 'Amount must be a valid number' })
  @Min(0.01, { message: 'Amount must be at least 0.01' })
  @Type(() => Number)
  amount: number;
}

export class ApplyDebitNoteDto {
  @IsArray({ message: 'Applications must be an array' })
  @ArrayMinSize(1, { message: 'Must apply to at least one bill' })
  @ValidateNested({ each: true })
  @Type(() => ApplyDebitNoteLineDto)
  applications: ApplyDebitNoteLineDto[];
}
