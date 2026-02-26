import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  ArrayMinSize,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReceiveLineItemDto {
  @IsUUID('4', { message: 'Line item ID must be a valid UUID' })
  lineItemId: string;

  @IsNumber({}, { message: 'Quantity received must be a valid number' })
  @Min(0.0001, { message: 'Quantity received must be greater than 0' })
  @Type(() => Number)
  quantityReceived: number;
}

export class ReceiveItemsDto {
  @IsOptional()
  @IsDateString({}, { message: 'Received date must be a valid date (YYYY-MM-DD)' })
  receivedDate?: string;

  @IsArray({ message: 'Items must be an array' })
  @ArrayMinSize(1, { message: 'Must specify at least one line item to receive' })
  @ValidateNested({ each: true })
  @Type(() => ReceiveLineItemDto)
  items: ReceiveLineItemDto[];
}
