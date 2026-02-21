import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PermissionsService } from './services/permissions.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return ApiResponseDto.success(result, 'Registration successful');
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return ApiResponseDto.success(result, 'Login successful');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: any) {
    const result = await this.authService.getMe(user.id);
    return ApiResponseDto.success(result, 'User retrieved successfully');
  }

  /**
   * Get current user's permissions
   * GET /api/v1/auth/my-permissions
   * Returns the list of permission codes for the authenticated user
   */
  @Get('my-permissions')
  @UseGuards(JwtAuthGuard)
  async getMyPermissions(@CurrentUser() user: any) {
    // If primary admin, return all permissions
    if (user.isPrimaryAdmin) {
      const allPermissions =
        await this.permissionsService.getAllPermissionsGrouped();
      const allCodes = Object.values(allPermissions)
        .flat()
        .map((p: any) => p.code);
      return ApiResponseDto.success(
        {
          permissions: allCodes,
          isPrimaryAdmin: true,
          role: null,
        },
        'Permissions retrieved successfully',
      );
    }

    // Get user's role permissions
    const permissions = user.roleId
      ? await this.permissionsService.getUserPermissions(user.roleId)
      : [];

    return ApiResponseDto.success(
      {
        permissions,
        isPrimaryAdmin: false,
        role: user.role
          ? {
              id: user.role.id,
              code: user.role.code,
              name: user.role.name,
            }
          : null,
      },
      'Permissions retrieved successfully',
    );
  }

  /**
   * Request password reset
   * POST /api/v1/auth/forgot-password
   * Sends a password reset email if the email exists
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return ApiResponseDto.success(result, result.message);
  }

  /**
   * Reset password using token
   * POST /api/v1/auth/reset-password
   * Resets the password and invalidates all existing sessions
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return ApiResponseDto.success(result, result.message);
  }

  /**
   * Validate reset token
   * GET /api/v1/auth/validate-reset-token?token=xxx
   * Checks if reset token is valid (for frontend to show/hide reset form)
   */
  @Get('validate-reset-token')
  async validateResetToken(@Query('token') token: string) {
    if (!token) {
      return ApiResponseDto.success({ valid: false }, 'Token is required');
    }
    const result = await this.authService.validateResetToken(token);
    return ApiResponseDto.success(
      result,
      result.valid ? 'Token is valid' : 'Token is invalid or expired',
    );
  }
}
