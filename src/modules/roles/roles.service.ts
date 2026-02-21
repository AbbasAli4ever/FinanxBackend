import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all roles (system roles + company's custom roles)
   * @param companyId - Company ID to filter custom roles (null for system roles only)
   */
  async findAll(companyId?: string) {
    const roles = await this.prisma.role.findMany({
      where: {
        OR: [
          { companyId: null }, // System roles (available to all)
          { companyId }, // Company-specific custom roles
        ],
      },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                category: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      requiredPlan: role.requiredPlan,
      displayOrder: role.displayOrder,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      usersCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  /**
   * Get a single role by ID
   */
  async findOne(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                category: true,
                displayOrder: true,
              },
            },
          },
          orderBy: {
            permission: {
              displayOrder: 'asc',
            },
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      isSystemRole: role.isSystemRole,
      requiredPlan: role.requiredPlan,
      displayOrder: role.displayOrder,
      permissions: role.rolePermissions.map((rp) => rp.permission),
      usersCount: role._count.users,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Create a new custom role
   */
  async create(createRoleDto: CreateRoleDto, companyId: string) {
    // Check if role code already exists for this company
    const existingRole = await this.prisma.role.findFirst({
      where: {
        companyId,
        code: createRoleDto.code,
      },
    });

    if (existingRole) {
      throw new ConflictException('Role with this code already exists in your company');
    }

    // Verify all permission IDs exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        id: {
          in: createRoleDto.permissionIds,
        },
      },
    });

    if (permissions.length !== createRoleDto.permissionIds.length) {
      throw new BadRequestException('One or more permission IDs are invalid');
    }

    // Get the highest display order to place new role at the end
    const lastRole = await this.prisma.role.findFirst({
      orderBy: { displayOrder: 'desc' },
    });

    const displayOrder = lastRole ? lastRole.displayOrder + 1 : 100;

    // Create role and assign permissions in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create the role
      const role = await tx.role.create({
        data: {
          companyId, // Assign to specific company
          code: createRoleDto.code,
          name: createRoleDto.name,
          description: createRoleDto.description,
          isSystemRole: false, // Custom roles are not system roles
          displayOrder,
        },
      });

      // Create role-permission mappings
      if (createRoleDto.permissionIds.length > 0) {
        await tx.rolePermission.createMany({
          data: createRoleDto.permissionIds.map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        });
      }

      // Fetch the complete role with permissions
      return await tx.role.findUnique({
        where: { id: role.id },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    return {
      id: result!.id,
      code: result!.code,
      name: result!.name,
      description: result!.description,
      isSystemRole: result!.isSystemRole,
      displayOrder: result!.displayOrder,
      permissions: result!.rolePermissions.map((rp) => rp.permission),
      createdAt: result!.createdAt,
    };
  }

  /**
   * Update an existing role
   */
  async update(roleId: string, updateRoleDto: UpdateRoleDto, companyId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent editing system roles
    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be modified');
    }

    // Prevent editing roles from other companies
    if (role.companyId !== companyId) {
      throw new BadRequestException('You can only edit roles in your own company');
    }

    // If updating permissions, verify they exist
    if (updateRoleDto.permissionIds) {
      const permissions = await this.prisma.permission.findMany({
        where: {
          id: {
            in: updateRoleDto.permissionIds,
          },
        },
      });

      if (permissions.length !== updateRoleDto.permissionIds.length) {
        throw new BadRequestException('One or more permission IDs are invalid');
      }
    }

    // Update role and permissions in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update role basic info
      const updatedRole = await tx.role.update({
        where: { id: roleId },
        data: {
          name: updateRoleDto.name,
          description: updateRoleDto.description,
        },
      });

      // Update permissions if provided
      if (updateRoleDto.permissionIds) {
        // Delete existing role-permission mappings
        await tx.rolePermission.deleteMany({
          where: { roleId },
        });

        // Create new mappings
        if (updateRoleDto.permissionIds.length > 0) {
          await tx.rolePermission.createMany({
            data: updateRoleDto.permissionIds.map((permissionId) => ({
              roleId,
              permissionId,
            })),
          });
        }
      }

      // Return updated role with permissions
      return await tx.role.findUnique({
        where: { id: roleId },
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      });
    });

    return {
      id: result!.id,
      code: result!.code,
      name: result!.name,
      description: result!.description,
      isSystemRole: result!.isSystemRole,
      permissions: result!.rolePermissions.map((rp) => rp.permission),
      updatedAt: result!.updatedAt,
    };
  }

  /**
   * Delete a custom role
   */
  async delete(roleId: string, companyId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    // Prevent deleting system roles
    if (role.isSystemRole) {
      throw new BadRequestException('System roles cannot be deleted');
    }

    // Prevent deleting roles from other companies
    if (role.companyId !== companyId) {
      throw new BadRequestException('You can only delete roles in your own company');
    }

    // Prevent deleting roles that are in use
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete role. ${role._count.users} user(s) are assigned to this role`,
      );
    }

    // Delete role (permissions will be cascade deleted)
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return {
      message: 'Role deleted successfully',
    };
  }

  /**
   * Get all permissions (helper method for role creation UI)
   */
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
      ],
    });

    // Group permissions by category
    const grouped = permissions.reduce((acc, permission) => {
      const category = permission.category || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        description: permission.description,
      });
      return acc;
    }, {} as Record<string, any[]>);

    return {
      all: permissions.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        category: p.category,
      })),
      grouped,
    };
  }
}
