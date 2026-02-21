import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UnitsOfMeasureService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string) {
    // Return all system UOMs + company custom UOMs
    const units = await this.prisma.unitOfMeasure.findMany({
      where: {
        OR: [{ companyId: null }, { companyId }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { products: true } },
      },
    });

    return units.map((u) => ({
      id: u.id,
      name: u.name,
      abbreviation: u.abbreviation,
      isSystem: u.isSystem,
      productsCount: u._count.products,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async create(
    dto: { name: string; abbreviation: string },
    companyId: string,
  ) {
    // Check for duplicate name in system + company
    const existing = await this.prisma.unitOfMeasure.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        OR: [{ companyId: null }, { companyId }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `A unit of measure named "${dto.name}" already exists`,
      );
    }

    const unit = await this.prisma.unitOfMeasure.create({
      data: {
        name: dto.name,
        abbreviation: dto.abbreviation,
        companyId,
        isSystem: false,
      },
    });

    return {
      id: unit.id,
      name: unit.name,
      abbreviation: unit.abbreviation,
      isSystem: unit.isSystem,
      createdAt: unit.createdAt,
      updatedAt: unit.updatedAt,
    };
  }

  async update(
    id: string,
    dto: { name?: string; abbreviation?: string },
    companyId: string,
  ) {
    const unit = await this.prisma.unitOfMeasure.findUnique({
      where: { id },
    });

    if (!unit) {
      throw new NotFoundException('Unit of measure not found');
    }

    if (unit.isSystem) {
      throw new BadRequestException(
        'System units of measure cannot be modified. Create a custom unit instead.',
      );
    }

    if (unit.companyId !== companyId) {
      throw new NotFoundException('Unit of measure not found');
    }

    if (dto.name && dto.name !== unit.name) {
      const duplicate = await this.prisma.unitOfMeasure.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          OR: [{ companyId: null }, { companyId }],
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `A unit of measure named "${dto.name}" already exists`,
        );
      }
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.abbreviation !== undefined) updateData.abbreviation = dto.abbreviation;

    const updated = await this.prisma.unitOfMeasure.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      abbreviation: updated.abbreviation,
      isSystem: updated.isSystem,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async delete(id: string, companyId: string) {
    const unit = await this.prisma.unitOfMeasure.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });

    if (!unit) {
      throw new NotFoundException('Unit of measure not found');
    }

    if (unit.isSystem) {
      throw new BadRequestException(
        'System units of measure cannot be deleted',
      );
    }

    if (unit.companyId !== companyId) {
      throw new NotFoundException('Unit of measure not found');
    }

    if (unit._count.products > 0) {
      throw new BadRequestException(
        `Cannot delete this unit of measure because ${unit._count.products} product(s) are using it. Reassign products first.`,
      );
    }

    await this.prisma.unitOfMeasure.delete({ where: { id } });

    return { message: 'Unit of measure deleted successfully' };
  }
}
