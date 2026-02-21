import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Static routes MUST be before :id param route
  @Get('low-stock')
  @RequirePermissions('product:view')
  async findLowStock(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const products = await this.productsService.findLowStock(user.companyId);
    return {
      success: true,
      message: `Found ${products.length} product(s) below reorder point`,
      data: products,
    };
  }

  @Get('types')
  @RequirePermissions('product:view')
  async getProductTypes(): Promise<ApiResponseDto> {
    const types = await this.productsService.getProductTypes();
    return {
      success: true,
      message: 'Product types retrieved successfully',
      data: types,
    };
  }

  @Get()
  @RequirePermissions('product:view')
  async findAll(
    @Query() query: QueryProductsDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.productsService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Products retrieved successfully',
      data: result,
    };
  }

  @Get(':id')
  @RequirePermissions('product:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const product = await this.productsService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    };
  }

  @Post()
  @RequirePermissions('product:create')
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const product = await this.productsService.create(dto, user.companyId);
    return {
      success: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  @Patch(':id')
  @RequirePermissions('product:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const product = await this.productsService.update(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: 'Product updated successfully',
      data: product,
    };
  }

  @Delete(':id')
  @RequirePermissions('product:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.productsService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  @Post(':id/adjust-stock')
  @RequirePermissions('product:edit')
  async adjustStock(
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.productsService.adjustStock(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: 'Stock adjusted successfully',
      data: result,
    };
  }
}
