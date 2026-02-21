import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { QueryVendorsDto } from './dto/query-vendors.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class VendorsService {
  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // CREATE VENDOR
  // ===========================================================================
  async create(dto: CreateVendorDto, companyId: string) {
    // Check duplicate display name
    const existingName = await this.prisma.vendor.findFirst({
      where: { companyId, displayName: dto.displayName },
    });
    if (existingName) {
      throw new ConflictException(`Vendor "${dto.displayName}" already exists`);
    }

    // Check duplicate email (if provided)
    if (dto.email) {
      const existingEmail = await this.prisma.vendor.findFirst({
        where: { companyId, email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException(`A vendor with email "${dto.email}" already exists`);
      }
    }

    const vendor = await this.prisma.vendor.create({
      data: {
        companyId,
        vendorType: dto.vendorType || 'Business',
        displayName: dto.displayName,
        companyName: dto.companyName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        middleName: dto.middleName,
        title: dto.title,
        suffix: dto.suffix,
        email: dto.email,
        phone: dto.phone,
        mobile: dto.mobile,
        fax: dto.fax,
        website: dto.website,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country,
        taxNumber: dto.taxNumber,
        businessIdNo: dto.businessIdNo,
        track1099: dto.track1099 ?? false,
        paymentTerms: dto.paymentTerms,
        accountNumber: dto.accountNumber,
        openingBalance: dto.openingBalance ?? 0,
        openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : null,
        currentBalance: dto.openingBalance ?? 0,
        notes: dto.notes,
      },
    });

    return this.formatVendor(vendor);
  }

  // ===========================================================================
  // GET ALL VENDORS
  // ===========================================================================
  async findAll(companyId: string, query: QueryVendorsDto) {
    const where: Prisma.VendorWhereInput = { companyId };

    if (query.vendorType) {
      where.vendorType = query.vendorType;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.track1099 !== undefined) {
      where.track1099 = query.track1099;
    }
    if (query.search) {
      where.OR = [
        { displayName: { contains: query.search, mode: 'insensitive' } },
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.VendorOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.displayName = 'asc';
    }

    const vendors = await this.prisma.vendor.findMany({
      where,
      orderBy,
    });

    return vendors.map((v) => this.formatVendor(v));
  }

  // ===========================================================================
  // GET SINGLE VENDOR
  // ===========================================================================
  async findOne(vendorId: string, companyId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.formatVendor(vendor);
  }

  // ===========================================================================
  // UPDATE VENDOR
  // ===========================================================================
  async update(vendorId: string, dto: UpdateVendorDto, companyId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Check duplicate display name (if changing)
    if (dto.displayName && dto.displayName !== vendor.displayName) {
      const existing = await this.prisma.vendor.findFirst({
        where: {
          companyId,
          displayName: dto.displayName,
          NOT: { id: vendorId },
        },
      });
      if (existing) {
        throw new ConflictException(`Vendor "${dto.displayName}" already exists`);
      }
    }

    // Check duplicate email (if changing)
    if (dto.email && dto.email !== vendor.email) {
      const existing = await this.prisma.vendor.findFirst({
        where: {
          companyId,
          email: dto.email,
          NOT: { id: vendorId },
        },
      });
      if (existing) {
        throw new ConflictException(`A vendor with email "${dto.email}" already exists`);
      }
    }

    const updateData: Prisma.VendorUpdateInput = {};

    if (dto.vendorType !== undefined) updateData.vendorType = dto.vendorType;
    if (dto.displayName !== undefined) updateData.displayName = dto.displayName;
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.middleName !== undefined) updateData.middleName = dto.middleName;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.suffix !== undefined) updateData.suffix = dto.suffix;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.mobile !== undefined) updateData.mobile = dto.mobile;
    if (dto.fax !== undefined) updateData.fax = dto.fax;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.addressLine1 !== undefined) updateData.addressLine1 = dto.addressLine1;
    if (dto.addressLine2 !== undefined) updateData.addressLine2 = dto.addressLine2;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.postalCode !== undefined) updateData.postalCode = dto.postalCode;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.taxNumber !== undefined) updateData.taxNumber = dto.taxNumber;
    if (dto.businessIdNo !== undefined) updateData.businessIdNo = dto.businessIdNo;
    if (dto.track1099 !== undefined) updateData.track1099 = dto.track1099;
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.accountNumber !== undefined) updateData.accountNumber = dto.accountNumber;
    if (dto.openingBalance !== undefined) updateData.openingBalance = dto.openingBalance;
    if (dto.openingBalanceDate !== undefined) updateData.openingBalanceDate = new Date(dto.openingBalanceDate);
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: updateData,
    });

    return this.formatVendor(updated);
  }

  // ===========================================================================
  // DELETE (DEACTIVATE) VENDOR
  // ===========================================================================
  async delete(vendorId: string, companyId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: { isActive: false },
    });

    return { message: 'Vendor deactivated successfully' };
  }

  // ===========================================================================
  // HELPER
  // ===========================================================================
  private formatVendor(vendor: any) {
    return {
      id: vendor.id,
      vendorType: vendor.vendorType,
      displayName: vendor.displayName,
      companyName: vendor.companyName,
      firstName: vendor.firstName,
      lastName: vendor.lastName,
      middleName: vendor.middleName,
      title: vendor.title,
      suffix: vendor.suffix,
      email: vendor.email,
      phone: vendor.phone,
      mobile: vendor.mobile,
      fax: vendor.fax,
      website: vendor.website,
      address: {
        line1: vendor.addressLine1,
        line2: vendor.addressLine2,
        city: vendor.city,
        state: vendor.state,
        postalCode: vendor.postalCode,
        country: vendor.country,
      },
      taxNumber: vendor.taxNumber,
      businessIdNo: vendor.businessIdNo,
      track1099: vendor.track1099,
      paymentTerms: vendor.paymentTerms,
      accountNumber: vendor.accountNumber,
      openingBalance: Number(vendor.openingBalance),
      openingBalanceDate: vendor.openingBalanceDate,
      currentBalance: Number(vendor.currentBalance),
      notes: vendor.notes,
      isActive: vendor.isActive,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
