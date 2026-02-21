import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ===========================================================================
  // CREATE CUSTOMER
  // ===========================================================================
  async create(dto: CreateCustomerDto, companyId: string) {
    // Check duplicate display name
    const existingName = await this.prisma.customer.findFirst({
      where: { companyId, displayName: dto.displayName },
    });
    if (existingName) {
      throw new ConflictException(`Customer "${dto.displayName}" already exists`);
    }

    // Check duplicate email (if provided)
    if (dto.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: { companyId, email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException(`A customer with email "${dto.email}" already exists`);
      }
    }

    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        customerType: dto.customerType || 'Business',
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
        billingAddressLine1: dto.billingAddressLine1,
        billingAddressLine2: dto.billingAddressLine2,
        billingCity: dto.billingCity,
        billingState: dto.billingState,
        billingPostalCode: dto.billingPostalCode,
        billingCountry: dto.billingCountry,
        shippingAddressLine1: dto.shippingAddressLine1,
        shippingAddressLine2: dto.shippingAddressLine2,
        shippingCity: dto.shippingCity,
        shippingState: dto.shippingState,
        shippingPostalCode: dto.shippingPostalCode,
        shippingCountry: dto.shippingCountry,
        taxNumber: dto.taxNumber,
        taxExempt: dto.taxExempt ?? false,
        paymentTerms: dto.paymentTerms,
        openingBalance: dto.openingBalance ?? 0,
        openingBalanceDate: dto.openingBalanceDate ? new Date(dto.openingBalanceDate) : null,
        currentBalance: dto.openingBalance ?? 0,
        creditLimit: dto.creditLimit,
        notes: dto.notes,
      },
    });

    return this.formatCustomer(customer);
  }

  // ===========================================================================
  // GET ALL CUSTOMERS
  // ===========================================================================
  async findAll(companyId: string, query: QueryCustomersDto) {
    const where: Prisma.CustomerWhereInput = { companyId };

    if (query.customerType) {
      where.customerType = query.customerType;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
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

    const orderBy: Prisma.CustomerOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'asc';
    } else {
      orderBy.displayName = 'asc';
    }

    const customers = await this.prisma.customer.findMany({
      where,
      orderBy,
    });

    return customers.map((c) => this.formatCustomer(c));
  }

  // ===========================================================================
  // GET SINGLE CUSTOMER
  // ===========================================================================
  async findOne(customerId: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return this.formatCustomer(customer);
  }

  // ===========================================================================
  // UPDATE CUSTOMER
  // ===========================================================================
  async update(customerId: string, dto: UpdateCustomerDto, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check duplicate display name (if changing)
    if (dto.displayName && dto.displayName !== customer.displayName) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          companyId,
          displayName: dto.displayName,
          NOT: { id: customerId },
        },
      });
      if (existing) {
        throw new ConflictException(`Customer "${dto.displayName}" already exists`);
      }
    }

    // Check duplicate email (if changing)
    if (dto.email && dto.email !== customer.email) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          companyId,
          email: dto.email,
          NOT: { id: customerId },
        },
      });
      if (existing) {
        throw new ConflictException(`A customer with email "${dto.email}" already exists`);
      }
    }

    const updateData: Prisma.CustomerUpdateInput = {};

    // Only set fields that are explicitly provided
    if (dto.customerType !== undefined) updateData.customerType = dto.customerType;
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
    if (dto.billingAddressLine1 !== undefined) updateData.billingAddressLine1 = dto.billingAddressLine1;
    if (dto.billingAddressLine2 !== undefined) updateData.billingAddressLine2 = dto.billingAddressLine2;
    if (dto.billingCity !== undefined) updateData.billingCity = dto.billingCity;
    if (dto.billingState !== undefined) updateData.billingState = dto.billingState;
    if (dto.billingPostalCode !== undefined) updateData.billingPostalCode = dto.billingPostalCode;
    if (dto.billingCountry !== undefined) updateData.billingCountry = dto.billingCountry;
    if (dto.shippingAddressLine1 !== undefined) updateData.shippingAddressLine1 = dto.shippingAddressLine1;
    if (dto.shippingAddressLine2 !== undefined) updateData.shippingAddressLine2 = dto.shippingAddressLine2;
    if (dto.shippingCity !== undefined) updateData.shippingCity = dto.shippingCity;
    if (dto.shippingState !== undefined) updateData.shippingState = dto.shippingState;
    if (dto.shippingPostalCode !== undefined) updateData.shippingPostalCode = dto.shippingPostalCode;
    if (dto.shippingCountry !== undefined) updateData.shippingCountry = dto.shippingCountry;
    if (dto.taxNumber !== undefined) updateData.taxNumber = dto.taxNumber;
    if (dto.taxExempt !== undefined) updateData.taxExempt = dto.taxExempt;
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.openingBalance !== undefined) updateData.openingBalance = dto.openingBalance;
    if (dto.openingBalanceDate !== undefined) updateData.openingBalanceDate = new Date(dto.openingBalanceDate);
    if (dto.creditLimit !== undefined) updateData.creditLimit = dto.creditLimit;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return this.formatCustomer(updated);
  }

  // ===========================================================================
  // DELETE (DEACTIVATE) CUSTOMER
  // ===========================================================================
  async delete(customerId: string, companyId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Soft delete - deactivate
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { isActive: false },
    });

    return { message: 'Customer deactivated successfully' };
  }

  // ===========================================================================
  // HELPER
  // ===========================================================================
  private formatCustomer(customer: any) {
    return {
      id: customer.id,
      customerType: customer.customerType,
      displayName: customer.displayName,
      companyName: customer.companyName,
      firstName: customer.firstName,
      lastName: customer.lastName,
      middleName: customer.middleName,
      title: customer.title,
      suffix: customer.suffix,
      email: customer.email,
      phone: customer.phone,
      mobile: customer.mobile,
      fax: customer.fax,
      website: customer.website,
      billingAddress: {
        line1: customer.billingAddressLine1,
        line2: customer.billingAddressLine2,
        city: customer.billingCity,
        state: customer.billingState,
        postalCode: customer.billingPostalCode,
        country: customer.billingCountry,
      },
      shippingAddress: {
        line1: customer.shippingAddressLine1,
        line2: customer.shippingAddressLine2,
        city: customer.shippingCity,
        state: customer.shippingState,
        postalCode: customer.shippingPostalCode,
        country: customer.shippingCountry,
      },
      taxNumber: customer.taxNumber,
      taxExempt: customer.taxExempt,
      paymentTerms: customer.paymentTerms,
      openingBalance: Number(customer.openingBalance),
      openingBalanceDate: customer.openingBalanceDate,
      currentBalance: Number(customer.currentBalance),
      creditLimit: customer.creditLimit ? Number(customer.creditLimit) : null,
      notes: customer.notes,
      isActive: customer.isActive,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    };
  }
}
