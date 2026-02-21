import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmailService } from '../email/email.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';
import { BcryptUtil } from '../../common/utils/bcrypt.util';
import { randomBytes } from 'crypto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Get all users in a company
   */
  async findAllByCompany(companyId: string) {
    const users = await this.prisma.user.findMany({
      where: { companyId },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { isPrimaryAdmin: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      isPrimaryAdmin: user.isPrimaryAdmin,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      invitationAcceptedAt: user.invitationAcceptedAt,
      createdAt: user.createdAt,
    }));
  }

  /**
   * Get a single user by ID
   */
  async findOne(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
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
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissions = user.role?.rolePermissions.map((rp) => rp.permission.code) || [];

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role
        ? {
            id: user.role.id,
            code: user.role.code,
            name: user.role.name,
          }
        : null,
      isPrimaryAdmin: user.isPrimaryAdmin,
      isActive: user.isActive,
      company: user.company,
      permissions,
      lastLoginAt: user.lastLoginAt,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * Invite a new user to the company
   */
  async inviteUser(inviteDto: InviteUserDto, invitedByUserId: string, companyId: string) {
    // Check if email already exists in company
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: inviteDto.email,
        companyId,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists in your company');
    }

    // Check if there's a pending invitation
    const existingInvitation = await this.prisma.userInvitation.findFirst({
      where: {
        email: inviteDto.email,
        companyId,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    // Verify role exists
    const role = await this.prisma.role.findUnique({
      where: { id: inviteDto.roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Generate invitation token
    const invitationToken = randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.prisma.userInvitation.create({
      data: {
        companyId,
        email: inviteDto.email,
        firstName: inviteDto.firstName,
        lastName: inviteDto.lastName,
        roleId: inviteDto.roleId,
        invitationToken,
        message: inviteDto.message,
        invitedBy: invitedByUserId,
        expiresAt,
        status: 'pending',
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get company name for email
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    // Send invitation email
    const emailSent = await this.emailService.sendInvitationEmail({
      recipientEmail: invitation.email,
      recipientName: `${invitation.firstName} ${invitation.lastName}`,
      inviterName: `${invitation.invitedByUser.firstName} ${invitation.invitedByUser.lastName}`,
      companyName: company?.name || 'Your Company',
      invitationToken: invitation.invitationToken,
      roleName: invitation.role.name,
      message: invitation.message || undefined,
      expiresAt: invitation.expiresAt,
    });

    if (emailSent) {
      this.logger.log(`Invitation email sent to ${invitation.email}`);
    } else {
      this.logger.warn(`Failed to send invitation email to ${invitation.email} - email service may not be configured`);
    }

    return {
      id: invitation.id,
      email: invitation.email,
      firstName: invitation.firstName,
      lastName: invitation.lastName,
      role: invitation.role,
      invitationToken: invitation.invitationToken,
      invitedBy: invitation.invitedByUser,
      expiresAt: invitation.expiresAt,
      status: invitation.status,
      createdAt: invitation.createdAt,
      emailSent,
    };
  }

  /**
   * Accept an invitation and create user account
   */
  async acceptInvitation(acceptDto: AcceptInvitationDto) {
    // Find invitation
    const invitation = await this.prisma.userInvitation.findUnique({
      where: {
        invitationToken: acceptDto.invitationToken,
      },
      include: {
        company: true,
        role: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('This invitation has already been used or cancelled');
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new BadRequestException('This invitation has expired');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        email: invitation.email,
        companyId: invitation.companyId,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await BcryptUtil.hash(acceptDto.password);

    // Create user and update invitation in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId: invitation.companyId,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          passwordHash,
          roleId: invitation.roleId,
          isPrimaryAdmin: false,
          isActive: true,
          invitedBy: invitation.invitedBy,
          invitationAcceptedAt: new Date(),
          emailVerifiedAt: new Date(), // Auto-verify email on invitation acceptance
        },
        include: {
          role: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      return user;
    });

    // Send welcome email
    const emailSent = await this.emailService.sendWelcomeEmail(
      result.email,
      `${result.firstName} ${result.lastName}`,
      result.company.name,
    );

    if (emailSent) {
      this.logger.log(`Welcome email sent to ${result.email}`);
    }

    return {
      id: result.id,
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      role: result.role,
      company: result.company,
      invitationAcceptedAt: result.invitationAcceptedAt,
    };
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, companyId: string, updateDto: UpdateUserDto, requestingUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Primary admin cannot be deactivated
    if (user.isPrimaryAdmin && updateDto.isActive === false) {
      throw new BadRequestException('Primary admin cannot be deactivated');
    }

    // If changing role, verify new role exists
    if (updateDto.roleId) {
      const role = await this.prisma.role.findUnique({
        where: { id: updateDto.roleId },
      });

      if (!role) {
        throw new NotFoundException('Role not found');
      }

      // Primary admin role cannot be changed
      if (user.isPrimaryAdmin) {
        throw new BadRequestException('Primary admin role cannot be changed');
      }
    }

    // If changing email, check for conflicts
    if (updateDto.email && updateDto.email !== user.email) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          email: updateDto.email,
          companyId,
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use by another user');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateDto,
      },
      include: {
        role: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      phone: updatedUser.phone,
      avatarUrl: updatedUser.avatarUrl,
      role: updatedUser.role,
      isPrimaryAdmin: updatedUser.isPrimaryAdmin,
      isActive: updatedUser.isActive,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValidPassword = await BcryptUtil.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await BcryptUtil.hash(changePasswordDto.newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: false,
      },
    });

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivateUser(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isPrimaryAdmin) {
      throw new BadRequestException('Primary admin cannot be deactivated');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return {
      message: 'User deactivated successfully',
    };
  }

  /**
   * Reactivate user
   */
  async reactivateUser(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    return {
      message: 'User reactivated successfully',
    };
  }

  /**
   * Get all pending invitations for a company
   */
  async getPendingInvitations(companyId: string) {
    const invitations = await this.prisma.userInvitation.findMany({
      where: {
        companyId,
        status: 'pending',
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        role: {
          select: {
            code: true,
            name: true,
          },
        },
        invitedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      firstName: inv.firstName,
      lastName: inv.lastName,
      role: inv.role,
      invitedBy: inv.invitedByUser,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));
  }

  /**
   * Cancel a pending invitation
   */
  async cancelInvitation(invitationId: string, companyId: string) {
    const invitation = await this.prisma.userInvitation.findFirst({
      where: {
        id: invitationId,
        companyId,
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Only pending invitations can be cancelled');
    }

    await this.prisma.userInvitation.update({
      where: { id: invitationId },
      data: { status: 'cancelled' },
    });

    return {
      message: 'Invitation cancelled successfully',
    };
  }
}
