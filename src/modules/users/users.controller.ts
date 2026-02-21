import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get all users in the company
   * GET /api/v1/users
   * Required permission: user:view
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:view')
  @Get()
  async getAllUsers(@Request() req): Promise<ApiResponseDto> {
    const users = await this.usersService.findAllByCompany(req.user.companyId);
    return {
      success: true,
      message: 'Users retrieved successfully',
      data: users,
    };
  }

  /**
   * Get a specific user by ID
   * GET /api/v1/users/:id
   * Required permission: user:view
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:view')
  @Get(':id')
  async getUser(@Param('id') userId: string, @Request() req): Promise<ApiResponseDto> {
    const user = await this.usersService.findOne(userId, req.user.companyId);
    return {
      success: true,
      message: 'User retrieved successfully',
      data: user,
    };
  }

  /**
   * Invite a new user to the company
   * POST /api/v1/users/invite
   * Required permission: user:invite
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:invite')
  @Post('invite')
  async inviteUser(@Body() inviteDto: InviteUserDto, @Request() req): Promise<ApiResponseDto> {
    const invitation = await this.usersService.inviteUser(
      inviteDto,
      req.user.id,
      req.user.companyId,
    );
    return {
      success: true,
      message: 'User invited successfully',
      data: invitation,
    };
  }

  /**
   * Get all pending invitations
   * GET /api/v1/users/invitations/pending
   * Required permission: user:view
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:view')
  @Get('invitations/pending')
  async getPendingInvitations(@Request() req): Promise<ApiResponseDto> {
    const invitations = await this.usersService.getPendingInvitations(req.user.companyId);
    return {
      success: true,
      message: 'Pending invitations retrieved successfully',
      data: invitations,
    };
  }

  /**
   * Cancel a pending invitation
   * PATCH /api/v1/users/invitations/:id/cancel
   * Required permission: user:delete
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:delete')
  @Patch('invitations/:id/cancel')
  async cancelInvitation(@Param('id') invitationId: string, @Request() req): Promise<ApiResponseDto> {
    const result = await this.usersService.cancelInvitation(invitationId, req.user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  /**
   * Accept an invitation (public endpoint)
   * POST /api/v1/users/accept-invitation
   */
  @Post('accept-invitation')
  async acceptInvitation(@Body() acceptDto: AcceptInvitationDto): Promise<ApiResponseDto> {
    const user = await this.usersService.acceptInvitation(acceptDto);
    return {
      success: true,
      message: 'Invitation accepted successfully. You can now login.',
      data: user,
    };
  }

  /**
   * Update user profile
   * PATCH /api/v1/users/:id
   * Required permission: user:edit
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:edit')
  @Patch(':id')
  async updateUser(
    @Param('id') userId: string,
    @Body() updateDto: UpdateUserDto,
    @Request() req,
  ): Promise<ApiResponseDto> {
    const updatedUser = await this.usersService.updateUser(
      userId,
      req.user.companyId,
      updateDto,
      req.user.id,
    );
    return {
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    };
  }

  /**
   * Change password (current user)
   * POST /api/v1/users/me/change-password
   * No special permission required - users can change their own password
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/change-password')
  async changePassword(@Body() changePasswordDto: ChangePasswordDto, @Request() req): Promise<ApiResponseDto> {
    const result = await this.usersService.changePassword(req.user.id, changePasswordDto);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  /**
   * Deactivate user
   * PATCH /api/v1/users/:id/deactivate
   * Required permission: user:delete
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:delete')
  @Patch(':id/deactivate')
  async deactivateUser(@Param('id') userId: string, @Request() req): Promise<ApiResponseDto> {
    const result = await this.usersService.deactivateUser(userId, req.user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }

  /**
   * Reactivate user
   * PATCH /api/v1/users/:id/reactivate
   * Required permission: user:edit
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('user:edit')
  @Patch(':id/reactivate')
  async reactivateUser(@Param('id') userId: string, @Request() req): Promise<ApiResponseDto> {
    const result = await this.usersService.reactivateUser(userId, req.user.companyId);
    return {
      success: true,
      message: result.message,
      data: null,
    };
  }
}
