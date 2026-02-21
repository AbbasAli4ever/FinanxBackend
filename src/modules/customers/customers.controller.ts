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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Get all customers
   * GET /api/v1/customers?search=john&customerType=Business&isActive=true
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('customer:view')
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryCustomersDto,
  ): Promise<ApiResponseDto> {
    const customers = await this.customersService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Customers retrieved successfully',
      data: customers,
    };
  }

  /**
   * Get a single customer
   * GET /api/v1/customers/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('customer:view')
  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') customerId: string,
  ): Promise<ApiResponseDto> {
    const customer = await this.customersService.findOne(customerId, user.companyId);
    return {
      success: true,
      message: 'Customer retrieved successfully',
      data: customer,
    };
  }

  /**
   * Create a new customer
   * POST /api/v1/customers
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('customer:create')
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createCustomerDto: CreateCustomerDto,
  ): Promise<ApiResponseDto> {
    const customer = await this.customersService.create(createCustomerDto, user.companyId);
    return {
      success: true,
      message: 'Customer created successfully',
      data: customer,
    };
  }

  /**
   * Update a customer
   * PATCH /api/v1/customers/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('customer:edit')
  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') customerId: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<ApiResponseDto> {
    const customer = await this.customersService.update(customerId, updateCustomerDto, user.companyId);
    return {
      success: true,
      message: 'Customer updated successfully',
      data: customer,
    };
  }

  /**
   * Delete (deactivate) a customer
   * DELETE /api/v1/customers/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('customer:delete')
  @Delete(':id')
  async delete(
    @CurrentUser() user: any,
    @Param('id') customerId: string,
  ): Promise<ApiResponseDto> {
    const result = await this.customersService.delete(customerId, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}
