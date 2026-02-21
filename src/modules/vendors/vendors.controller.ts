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
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  /**
   * Get all vendors
   * GET /api/v1/vendors?search=office&vendorType=Business&isActive=true
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vendor:view')
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryVendorsDto,
  ): Promise<ApiResponseDto> {
    const vendors = await this.vendorsService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Vendors retrieved successfully',
      data: vendors,
    };
  }

  /**
   * Get a single vendor
   * GET /api/v1/vendors/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vendor:view')
  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') vendorId: string,
  ): Promise<ApiResponseDto> {
    const vendor = await this.vendorsService.findOne(vendorId, user.companyId);
    return {
      success: true,
      message: 'Vendor retrieved successfully',
      data: vendor,
    };
  }

  /**
   * Create a new vendor
   * POST /api/v1/vendors
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vendor:create')
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createVendorDto: CreateVendorDto,
  ): Promise<ApiResponseDto> {
    const vendor = await this.vendorsService.create(createVendorDto, user.companyId);
    return {
      success: true,
      message: 'Vendor created successfully',
      data: vendor,
    };
  }

  /**
   * Update a vendor
   * PATCH /api/v1/vendors/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vendor:edit')
  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') vendorId: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ): Promise<ApiResponseDto> {
    const vendor = await this.vendorsService.update(vendorId, updateVendorDto, user.companyId);
    return {
      success: true,
      message: 'Vendor updated successfully',
      data: vendor,
    };
  }

  /**
   * Delete (deactivate) a vendor
   * DELETE /api/v1/vendors/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('vendor:delete')
  @Delete(':id')
  async delete(
    @CurrentUser() user: any,
    @Param('id') vendorId: string,
  ): Promise<ApiResponseDto> {
    const result = await this.vendorsService.delete(vendorId, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}
