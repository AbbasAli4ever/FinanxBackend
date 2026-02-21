import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export class AdjustStockDto {
  @IsNotEmpty({ message: 'Adjustment quantity is required' })
  @IsNumber({}, { message: 'Adjustment quantity must be a number (positive to add, negative to subtract)' })
  adjustmentQuantity: number;

  @IsNotEmpty({ message: 'A reason for the adjustment is required' })
  @IsEnum(['RECEIVED', 'DAMAGED', 'LOST', 'RETURNED', 'CORRECTION', 'OTHER'], {
    message: 'Reason must be RECEIVED, DAMAGED, LOST, RETURNED, CORRECTION, or OTHER',
  })
  reason: string;

  @IsOptional()
  @IsString({ message: 'Notes must be a text value' })
  notes?: string;
}
