import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { UnitsOfMeasureController } from './units-of-measure.controller';
import { UnitsOfMeasureService } from './units-of-measure.service';

@Module({
  controllers: [ProductsController, UnitsOfMeasureController],
  providers: [ProductsService, UnitsOfMeasureService],
  exports: [ProductsService, UnitsOfMeasureService],
})
export class ProductsModule {}
