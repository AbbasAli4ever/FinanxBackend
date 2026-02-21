import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @RequirePermissions('category:view')
  async findAll(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const categories = await this.categoriesService.findAll(user.companyId);
    return {
      success: true,
      message: 'Categories retrieved successfully',
      data: categories,
    };
  }

  @Get(':id')
  @RequirePermissions('category:view')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const category = await this.categoriesService.findOne(id, user.companyId);
    return {
      success: true,
      message: 'Category retrieved successfully',
      data: category,
    };
  }

  @Post()
  @RequirePermissions('category:create')
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const category = await this.categoriesService.create(dto, user.companyId);
    return {
      success: true,
      message: 'Category created successfully',
      data: category,
    };
  }

  @Patch(':id')
  @RequirePermissions('category:edit')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const category = await this.categoriesService.update(
      id,
      dto,
      user.companyId,
    );
    return {
      success: true,
      message: 'Category updated successfully',
      data: category,
    };
  }

  @Delete(':id')
  @RequirePermissions('category:delete')
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponseDto> {
    const result = await this.categoriesService.delete(id, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}
