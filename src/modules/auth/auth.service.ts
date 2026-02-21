import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { BcryptUtil } from '../../common/utils/bcrypt.util';
import { AccountsService } from '../accounts/accounts.service';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
    private accountsService: AccountsService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: registerDto.user.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await BcryptUtil.hash(registerDto.user.password);

    // Get company_admin role (system role with companyId = null)
    const companyAdminRole = await this.prisma.role.findFirst({
      where: {
        companyId: null,
        code: 'company_admin'
      },
    });

    if (!companyAdminRole) {
      throw new BadRequestException('Default roles not seeded');
    }

    // Create company and user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create company
      const company = await tx.company.create({
        data: {
          name: registerDto.company.name,
          email: registerDto.company.email,
        },
      });

      // Create primary admin user
      const user = await tx.user.create({
        data: {
          companyId: company.id,
          email: registerDto.user.email,
          passwordHash,
          firstName: registerDto.user.firstName,
          lastName: registerDto.user.lastName,
          isPrimaryAdmin: true,
          roleId: companyAdminRole.id,
          emailVerifiedAt: new Date(),
        },
        include: {
          role: true,
          company: true,
        },
      });

      // Seed default Chart of Accounts for the new company
      await this.accountsService.seedDefaultAccounts(company.id, tx);

      return { company, user };
    });

    // Generate tokens
    const tokens = await this.generateTokens(result.user);

    // Get permissions
    const permissions = await this.getUserPermissions(result.user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isPrimaryAdmin: result.user.isPrimaryAdmin,
        role: result.user.role
          ? {
              code: result.user.role.code,
              name: result.user.role.name,
            }
          : null,
      },
      company: {
        id: result.company.id,
        name: result.company.name,
      },
      permissions,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // Find user
    const user = await this.prisma.user.findFirst({
      where: { email: loginDto.email },
      include: {
        role: true,
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if company is active
    if (!user.company.isActive) {
      throw new UnauthorizedException('Company account is deactivated');
    }

    // Verify password
    const isPasswordValid = await BcryptUtil.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Get permissions
    const permissions = await this.getUserPermissions(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isPrimaryAdmin: user.isPrimaryAdmin,
        role: user.role
          ? {
              code: user.role.code,
              name: user.role.name,
            }
          : null,
      },
      company: {
        id: user.company.id,
        name: user.company.name,
      },
      permissions,
    };
  }

  async getMe(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        company: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const permissions = await this.getUserPermissions(userId);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isPrimaryAdmin: user.isPrimaryAdmin,
      role: user.role
        ? {
            code: user.role.code,
            name: user.role.name,
          }
        : null,
      company: {
        id: user.company.id,
        name: user.company.name,
      },
      permissions,
    };
  }

  private async generateTokens(user: any): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    // Generate access token (15 min)
    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      isPrimaryAdmin: user.isPrimaryAdmin,
    });

    // Generate refresh token
    const refreshToken = uuidv4();
    const tokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.role) {
      return [];
    }

    // Primary admin gets all permissions
    if (user.isPrimaryAdmin) {
      const allPermissions = await this.prisma.permission.findMany();
      return allPermissions.map((p) => p.code);
    }

    return user.role.rolePermissions.map((rp) => rp.permission.code);
  }

  /**
   * Initiate password reset - sends reset email
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string; emailSent: boolean }> {
    const { email } = forgotPasswordDto;

    // Find user by email
    const user = await this.prisma.user.findFirst({
      where: { email },
      include: {
        company: true,
      },
    });

    // Always return success message to prevent email enumeration
    if (!user) {
      this.logger.log(`Password reset requested for non-existent email: ${email}`);
      return {
        message: 'If an account exists with this email, you will receive a password reset link',
        emailSent: false,
      };
    }

    // Check if user is active
    if (!user.isActive) {
      this.logger.log(`Password reset requested for deactivated user: ${email}`);
      return {
        message: 'If an account exists with this email, you will receive a password reset link',
        emailSent: false,
      };
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expiration (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Store hashed token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: expiresAt,
      },
    });

    // Send reset email
    const emailSent = await this.emailService.sendPasswordResetEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      resetToken, // Send the unhashed token in email
    );

    if (emailSent) {
      this.logger.log(`Password reset email sent to ${user.email}`);
    } else {
      this.logger.warn(`Failed to send password reset email to ${user.email}`);
    }

    return {
      message: 'If an account exists with this email, you will receive a password reset link',
      emailSent,
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const passwordHash = await BcryptUtil.hash(newPassword);

    // Update user password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Revoke all existing refresh tokens for security
    await this.prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Password reset successful for user: ${user.email}`);

    return {
      message: 'Password has been reset successfully. Please login with your new password.',
    };
  }

  /**
   * Validate reset token (for frontend to check if token is valid before showing form)
   */
  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        email: true,
      },
    });

    if (!user) {
      return { valid: false };
    }

    // Return masked email for confirmation
    const maskedEmail = this.maskEmail(user.email);
    return { valid: true, email: maskedEmail };
  }

  /**
   * Mask email for security (show first 2 chars and domain)
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
      return `${localPart[0]}***@${domain}`;
    }
    return `${localPart.slice(0, 2)}***@${domain}`;
  }
}
