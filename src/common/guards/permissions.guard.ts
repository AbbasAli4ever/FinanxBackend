import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../database/prisma.service';
import {
  PERMISSIONS_KEY,
  PERMISSION_MODE_KEY,
  PermissionMode,
} from '../decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // Get permission mode (ANY or ALL)
    const permissionMode =
      this.reflector.getAllAndOverride<PermissionMode>(PERMISSION_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || 'ANY';

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Primary admin bypasses all permission checks
    if (user.isPrimaryAdmin) {
      return true;
    }

    // If user has no role, deny access
    if (!user.roleId) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    // Get user's permissions from database
    const userPermissions = await this.getUserPermissions(user.roleId);

    // Check permissions based on mode
    const hasPermission =
      permissionMode === 'ALL'
        ? this.hasAllPermissions(userPermissions, requiredPermissions)
        : this.hasAnyPermission(userPermissions, requiredPermissions);

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to access this resource. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    // Attach user permissions to request for later use
    request.userPermissions = userPermissions;

    return true;
  }

  /**
   * Get all permission codes for a role
   */
  private async getUserPermissions(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: {
          select: { code: true },
        },
      },
    });

    return rolePermissions.map((rp) => rp.permission.code);
  }

  /**
   * Check if user has ANY of the required permissions
   */
  private hasAnyPermission(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    return requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );
  }

  /**
   * Check if user has ALL of the required permissions
   */
  private hasAllPermissions(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }
}
