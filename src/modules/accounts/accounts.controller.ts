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
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { QueryAccountsDto } from './dto/query-accounts.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Get all account types and detail types (for dropdowns)
   * GET /api/v1/accounts/types
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:view')
  @Get('types')
  async getAccountTypes(): Promise<ApiResponseDto> {
    const types = this.accountsService.getAccountTypes();
    return {
      success: true,
      message: 'Account types retrieved successfully',
      data: types,
    };
  }

  /**
   * Get account tree (hierarchical view)
   * GET /api/v1/accounts/tree?accountType=Bank
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:view')
  @Get('tree')
  async getAccountTree(
    @CurrentUser() user: any,
    @Query('accountType') accountType?: string,
  ): Promise<ApiResponseDto> {
    const tree = await this.accountsService.getAccountTree(user.companyId, accountType);
    return {
      success: true,
      message: 'Account tree retrieved successfully',
      data: tree,
    };
  }

  /**
   * Get all accounts (flat list with filtering)
   * GET /api/v1/accounts?accountType=Bank&search=cash&isActive=true
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:view')
  @Get()
  async findAll(
    @CurrentUser() user: any,
    @Query() query: QueryAccountsDto,
  ): Promise<ApiResponseDto> {
    const accounts = await this.accountsService.findAll(user.companyId, query);
    return {
      success: true,
      message: 'Accounts retrieved successfully',
      data: accounts,
    };
  }

  /**
   * Get a single account by ID
   * GET /api/v1/accounts/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:view')
  @Get(':id')
  async findOne(
    @CurrentUser() user: any,
    @Param('id') accountId: string,
  ): Promise<ApiResponseDto> {
    const account = await this.accountsService.findOne(accountId, user.companyId);
    return {
      success: true,
      message: 'Account retrieved successfully',
      data: account,
    };
  }

  /**
   * Create a new account
   * POST /api/v1/accounts
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:create')
  @Post()
  async create(
    @CurrentUser() user: any,
    @Body() createAccountDto: CreateAccountDto,
  ): Promise<ApiResponseDto> {
    const account = await this.accountsService.create(createAccountDto, user.companyId);
    return {
      success: true,
      message: 'Account created successfully',
      data: account,
    };
  }

  /**
   * Update an account
   * PATCH /api/v1/accounts/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:update')
  @Patch(':id')
  async update(
    @CurrentUser() user: any,
    @Param('id') accountId: string,
    @Body() updateAccountDto: UpdateAccountDto,
  ): Promise<ApiResponseDto> {
    const account = await this.accountsService.update(accountId, updateAccountDto, user.companyId);
    return {
      success: true,
      message: 'Account updated successfully',
      data: account,
    };
  }

  /**
   * Delete an account
   * DELETE /api/v1/accounts/:id
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('account:delete')
  @Delete(':id')
  async delete(
    @CurrentUser() user: any,
    @Param('id') accountId: string,
  ): Promise<ApiResponseDto> {
    const result = await this.accountsService.delete(accountId, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}