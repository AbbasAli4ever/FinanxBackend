import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * PermissionsService - Helper service for checking user permissions
 *
 * Use this service when you need to check permissions programmatically
 * inside your services or controllers (beyond the decorator-based guards)
 */
@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all permissions for a user by their role
   * @param roleId - The role ID
   * @returns Array of permission codes
   */
  async getUserPermissions(roleId: string): Promise<string[]> {
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
   * Check if a user has a specific permission
   * @param user - User object with roleId and isPrimaryAdmin
   * @param permissionCode - The permission code to check
   * @returns boolean
   */
  async hasPermission(
    user: { roleId?: string; isPrimaryAdmin: boolean },
    permissionCode: string,
  ): Promise<boolean> {
    // Primary admin has all permissions
    if (user.isPrimaryAdmin) {
      return true;
    }

    // No role means no permissions
    if (!user.roleId) {
      return false;
    }

    const permissions = await this.getUserPermissions(user.roleId);
    return permissions.includes(permissionCode);
  }

  /**
   * Check if a user has ANY of the specified permissions
   * @param user - User object with roleId and isPrimaryAdmin
   * @param permissionCodes - Array of permission codes to check
   * @returns boolean
   */
  async hasAnyPermission(
    user: { roleId?: string; isPrimaryAdmin: boolean },
    permissionCodes: string[],
  ): Promise<boolean> {
    // Primary admin has all permissions
    if (user.isPrimaryAdmin) {
      return true;
    }

    // No role means no permissions
    if (!user.roleId) {
      return false;
    }

    const permissions = await this.getUserPermissions(user.roleId);
    return permissionCodes.some((code) => permissions.includes(code));
  }

  /**
   * Check if a user has ALL of the specified permissions
   * @param user - User object with roleId and isPrimaryAdmin
   * @param permissionCodes - Array of permission codes to check
   * @returns boolean
   */
  async hasAllPermissions(
    user: { roleId?: string; isPrimaryAdmin: boolean },
    permissionCodes: string[],
  ): Promise<boolean> {
    // Primary admin has all permissions
    if (user.isPrimaryAdmin) {
      return true;
    }

    // No role means no permissions
    if (!user.roleId) {
      return false;
    }

    const permissions = await this.getUserPermissions(user.roleId);
    return permissionCodes.every((code) => permissions.includes(code));
  }

  /**
   * Get all permissions grouped by category
   * Useful for building permission management UIs
   */
  async getAllPermissionsGrouped(): Promise<Record<string, any[]>> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
    });

    return permissions.reduce(
      (acc, permission) => {
        const category = permission.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
      },
      {} as Record<string, any[]>,
    );
  }

  /**
   * Get permissions for a specific role
   * @param roleId - The role ID
   * @returns Array of permission objects
   */
  async getRolePermissions(roleId: string): Promise<any[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: {
        permission: true,
      },
    });

    return rolePermissions.map((rp) => rp.permission);
  }

  /**
   * Check if a permission code exists
   * @param code - Permission code to check
   * @returns boolean
   */
  async permissionExists(code: string): Promise<boolean> {
    const permission = await this.prisma.permission.findUnique({
      where: { code },
    });
    return !!permission;
  }

  /**
   * Get permission details by code
   * @param code - Permission code
   * @returns Permission object or null
   */
  async getPermissionByCode(code: string): Promise<any | null> {
    return this.prisma.permission.findUnique({
      where: { code },
    });
  }
}
