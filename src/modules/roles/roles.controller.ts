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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * Get all roles (system + company custom roles)
   * GET /api/v1/roles
   * Required permission: settings:manage_roles
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('company:edit_settings')
  @Get()
  async getAllRoles(@CurrentUser() user: any): Promise<ApiResponseDto> {
    const roles = await this.rolesService.findAll(user.companyId);
    return {
      success: true,
      message: 'Roles retrieved successfully',
      data: roles,
    };
  }

  /**
   * Get all permissions (for role creation/editing UI)
   * GET /api/v1/roles/permissions/all
   * Required permission: settings:manage_roles
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('company:edit_settings')
  @Get('permissions/all')
  async getAllPermissions(): Promise<ApiResponseDto> {
    const permissions = await this.rolesService.getAllPermissions();
    return {
      success: true,
      message: 'Permissions retrieved successfully',
      data: permissions,
    };
  }

  /**
   * Get a single role by ID
   * GET /api/v1/roles/:id
   * Required permission: settings:manage_roles
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('company:edit_settings')
  @Get(':id')
  async getRole(@Param('id') roleId: string): Promise<ApiResponseDto> {
    const role = await this.rolesService.findOne(roleId);
    return {
      success: true,
      message: 'Role retrieved successfully',
      data: role,
    };
  }

  /**
   * Create a new custom role
   * POST /api/v1/roles
   * Required permission: settings:manage_roles
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('company:edit_settings')
  @Post()
  async createRole(
    @CurrentUser() user: any,
    @Body() createRoleDto: CreateRoleDto,
  ): Promise<ApiResponseDto> {
    const role = await this.rolesService.create(createRoleDto, user.companyId);
    return {
      success: true,
      message: 'Role created successfully',
      data: role,
    };
  }

  /**
   * Update an existing role
   * PATCH /api/v1/roles/:id
   * Required permission: settings:manage_roles
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('company:edit_settings')
  @Patch(':id')
  async updateRole(
    @CurrentUser() user: any,
    @Param('id') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<ApiResponseDto> {
    const role = await this.rolesService.update(roleId, updateRoleDto, user.companyId);
    return {
      success: true,
      message: 'Role updated successfully',
      data: role,
    };
  }

  /**
   * Delete a custom role
   * DELETE /api/v1/roles/:id
   * Required permission: settings:manage_roles
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('company:edit_settings')
  @Delete(':id')
  async deleteRole(
    @CurrentUser() user: any,
    @Param('id') roleId: string,
  ): Promise<ApiResponseDto> {
    const result = await this.rolesService.delete(roleId, user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}
