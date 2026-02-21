import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, companyId: string) {
    // Check duplicate name under same parent
    const existing = await this.prisma.category.findFirst({
      where: {
        companyId,
        name: { equals: dto.name, mode: 'insensitive' },
        parentId: dto.parentId || null,
      },
    });

    if (existing) {
      throw new ConflictException(
        `A category named "${dto.name}" already exists${dto.parentId ? ' under this parent' : ''}`,
      );
    }

    let depth = 0;
    let fullPath = dto.name;

    if (dto.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: dto.parentId, companyId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      if (parent.depth >= 2) {
        throw new BadRequestException(
          'Categories can only be nested up to 3 levels deep',
        );
      }

      depth = parent.depth + 1;
      fullPath = `${parent.fullPath || parent.name} > ${dto.name}`;
    }

    const category = await this.prisma.category.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId || null,
        depth,
        fullPath,
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return this.formatCategory(category);
  }

  async findAll(companyId: string) {
    // Get root categories with children 2 levels deep
    const categories = await this.prisma.category.findMany({
      where: { companyId, parentId: null },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { products: true, children: true } },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true, children: true } },
            children: {
              orderBy: { name: 'asc' },
              include: {
                _count: { select: { products: true, children: true } },
              },
            },
          },
        },
      },
    });

    return categories.map((cat) => this.formatCategoryTree(cat));
  }

  async findOne(id: string, companyId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: { select: { products: true, children: true } },
          },
        },
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.formatCategory(category);
  }

  async update(id: string, dto: UpdateCategoryDto, companyId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check duplicate name if changing
    if (dto.name && dto.name !== category.name) {
      const duplicate = await this.prisma.category.findFirst({
        where: {
          companyId,
          name: { equals: dto.name, mode: 'insensitive' },
          parentId: category.parentId,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `A category named "${dto.name}" already exists at this level`,
        );
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Update fullPath if name changed
    if (dto.name && dto.name !== category.name) {
      if (category.parentId) {
        const parent = await this.prisma.category.findUnique({
          where: { id: category.parentId },
        });
        updateData.fullPath = `${parent?.fullPath || parent?.name} > ${dto.name}`;
      } else {
        updateData.fullPath = dto.name;
      }

      // Update child paths recursively
      await this.updateChildPaths(id, updateData.fullPath, companyId);
    }

    const updated = await this.prisma.category.update({
      where: { id },
      data: updateData,
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { products: true, children: true } },
      },
    });

    return this.formatCategory(updated);
  }

  async delete(id: string, companyId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, companyId },
      include: {
        _count: { select: { products: true, children: true } },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        'Cannot delete a category that has sub-categories. Remove sub-categories first.',
      );
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete this category because ${category._count.products} product(s) are assigned to it. Reassign products first.`,
      );
    }

    await this.prisma.category.delete({ where: { id } });

    return { message: 'Category deleted successfully' };
  }

  private async updateChildPaths(
    parentId: string,
    parentFullPath: string,
    companyId: string,
  ) {
    const children = await this.prisma.category.findMany({
      where: { parentId, companyId },
    });

    for (const child of children) {
      const newFullPath = `${parentFullPath} > ${child.name}`;
      await this.prisma.category.update({
        where: { id: child.id },
        data: { fullPath: newFullPath },
      });
      await this.updateChildPaths(child.id, newFullPath, companyId);
    }
  }

  private formatCategory(category: any) {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      depth: category.depth,
      fullPath: category.fullPath,
      isActive: category.isActive,
      parent: category.parent || null,
      children: category.children?.map((c: any) => this.formatCategory(c)) || [],
      productsCount: category._count?.products || 0,
      childrenCount: category._count?.children || 0,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private formatCategoryTree(category: any): any {
    return {
      id: category.id,
      name: category.name,
      description: category.description,
      depth: category.depth,
      fullPath: category.fullPath,
      isActive: category.isActive,
      productsCount: category._count?.products || 0,
      childrenCount: category._count?.children || 0,
      children:
        category.children?.map((c: any) => this.formatCategoryTree(c)) || [],
    };
  }
}
