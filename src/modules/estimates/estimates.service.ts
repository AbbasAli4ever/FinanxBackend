import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEstimateDto } from './dto/create-estimate.dto';
import { UpdateEstimateDto } from './dto/update-estimate.dto';
import { QueryEstimatesDto } from './dto/query-estimates.dto';
import { ESTIMATE_STATUS_INFO } from './constants/estimate-statuses.constant';

@Injectable()
export class EstimatesService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // GET NEXT ESTIMATE NUMBER
  // =========================================================================
  async getNextEstimateNumber(companyId: string): Promise<string> {
    const lastEstimate = await this.prisma.estimate.findFirst({
      where: { companyId },
      orderBy: { estimateNumber: 'desc' },
      select: { estimateNumber: true },
    });

    if (!lastEstimate) {
      return 'EST-0001';
    }

    const match = lastEstimate.estimateNumber.match(/EST-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `EST-${String(nextNum).padStart(4, '0')}`;
    }

    const count = await this.prisma.estimate.count({ where: { companyId } });
    return `EST-${String(count + 1).padStart(4, '0')}`;
  }

  // =========================================================================
  // CREATE ESTIMATE (DRAFT)
  // =========================================================================
  async create(dto: CreateEstimateDto, companyId: string) {
    // Validate customer
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId, isActive: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found or is inactive');
    }

    // Validate deposit account if provided
    if (dto.depositAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.depositAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Deposit account not found or is inactive');
      }
    }

    // Validate product IDs in line items
    const productIds = dto.lineItems
      .filter((li) => li.productId)
      .map((li) => li.productId!);

    if (productIds.length > 0) {
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds }, companyId, isActive: true },
        select: { id: true },
      });
      const foundIds = new Set(products.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Product(s) not found or inactive: ${missing.join(', ')}`,
        );
      }
    }

    // Generate estimate number
    const estimateNumber =
      dto.estimateNumber || (await this.getNextEstimateNumber(companyId));

    // Check for duplicate
    const existing = await this.prisma.estimate.findUnique({
      where: {
        unique_company_estimate_number: {
          companyId,
          estimateNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Estimate number "${estimateNumber}" already exists`,
      );
    }

    // Calculate line items
    const calculatedLineItems = this.calculateLineItems(dto.lineItems);

    // Calculate totals
    const totals = this.calculateTotals(
      calculatedLineItems,
      dto.discountType,
      dto.discountValue,
    );

    const estimate = await this.prisma.$transaction(async (tx) => {
      const created = await tx.estimate.create({
        data: {
          companyId,
          customerId: dto.customerId,
          estimateNumber,
          referenceNumber: dto.referenceNumber,
          status: 'DRAFT',
          estimateDate: new Date(dto.estimateDate),
          expirationDate: dto.expirationDate
            ? new Date(dto.expirationDate)
            : null,
          paymentTerms: dto.paymentTerms,
          subtotal: totals.subtotal,
          discountType: dto.discountType || null,
          discountValue: dto.discountValue || null,
          discountAmount: totals.discountAmount,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          depositAccountId: dto.depositAccountId,
          notes: dto.notes,
          termsAndConditions: dto.termsAndConditions,
          customerMessage: dto.customerMessage,
          lineItems: {
            create: calculatedLineItems,
          },
        },
        include: this.getFullInclude(),
      });

      return created;
    });

    return this.formatEstimate(estimate);
  }

  // =========================================================================
  // FIND ALL (WITH FILTERS)
  // =========================================================================
  async findAll(companyId: string, query: QueryEstimatesDto) {
    const {
      status,
      customerId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const where: any = { companyId, isActive: true };

    if (status) {
      if (status === 'EXPIRED') {
        // Expired = SENT or VIEWED with expirationDate < today
        where.status = { in: ['SENT', 'VIEWED'] };
        where.expirationDate = { lt: new Date() };
      } else {
        where.status = status;
      }
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (dateFrom || dateTo) {
      where.estimateDate = {};
      if (dateFrom) where.estimateDate.gte = new Date(dateFrom);
      if (dateTo) where.estimateDate.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { estimateNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        {
          customer: {
            displayName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.estimate.findMany({
        where,
        include: {
          customer: {
            select: { id: true, displayName: true, email: true },
          },
          _count: { select: { lineItems: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.estimate.count({ where }),
    ]);

    return {
      items: items.map((est) => this.formatEstimateListItem(est)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // FIND ONE
  // =========================================================================
  async findOne(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
      include: this.getFullInclude(),
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    return this.formatEstimate(estimate);
  }

  // =========================================================================
  // UPDATE (DRAFT ONLY)
  // =========================================================================
  async update(id: string, dto: UpdateEstimateDto, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft estimates can be edited. This estimate has been sent or processed.',
      );
    }

    // Validate customer if changing
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found or is inactive');
      }
    }

    // Validate deposit account if changing
    if (dto.depositAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.depositAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Deposit account not found or is inactive');
      }
    }

    let lineItemsData: any = undefined;
    let totals: any = {};

    if (dto.lineItems) {
      // Validate product IDs
      const productIds = dto.lineItems
        .filter((li) => li.productId)
        .map((li) => li.productId!);

      if (productIds.length > 0) {
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds }, companyId, isActive: true },
          select: { id: true },
        });
        const foundIds = new Set(products.map((p) => p.id));
        const missing = productIds.filter((pid) => !foundIds.has(pid));
        if (missing.length > 0) {
          throw new NotFoundException(
            `Product(s) not found or inactive: ${missing.join(', ')}`,
          );
        }
      }

      lineItemsData = this.calculateLineItems(dto.lineItems);

      const discountType =
        dto.discountType ?? (estimate.discountType as any);
      const discountValue =
        dto.discountValue ?? Number(estimate.discountValue || 0);

      totals = this.calculateTotals(lineItemsData, discountType, discountValue);
    } else if (
      dto.discountType !== undefined ||
      dto.discountValue !== undefined
    ) {
      // Recalculate with existing line items
      const existingLineItems = await this.prisma.estimateLineItem.findMany({
        where: { estimateId: id },
      });

      const mapped = existingLineItems.map((li) => ({
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        discountPercent: Number(li.discountPercent),
        taxPercent: Number(li.taxPercent),
      }));

      const discountType =
        dto.discountType ?? (estimate.discountType as any);
      const discountValue =
        dto.discountValue ?? Number(estimate.discountValue || 0);

      totals = this.calculateTotals(mapped, discountType, discountValue);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (lineItemsData) {
        await tx.estimateLineItem.deleteMany({ where: { estimateId: id } });
      }

      const updateData: any = {
        ...(dto.customerId && { customerId: dto.customerId }),
        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),
        ...(dto.estimateDate && { estimateDate: new Date(dto.estimateDate) }),
        ...(dto.expirationDate !== undefined && {
          expirationDate: dto.expirationDate
            ? new Date(dto.expirationDate)
            : null,
        }),
        ...(dto.paymentTerms !== undefined && {
          paymentTerms: dto.paymentTerms,
        }),
        ...(dto.discountType !== undefined && {
          discountType: dto.discountType || null,
        }),
        ...(dto.discountValue !== undefined && {
          discountValue: dto.discountValue,
        }),
        ...(dto.depositAccountId !== undefined && {
          depositAccountId: dto.depositAccountId,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.termsAndConditions !== undefined && {
          termsAndConditions: dto.termsAndConditions,
        }),
        ...(dto.customerMessage !== undefined && {
          customerMessage: dto.customerMessage,
        }),
        ...totals,
      };

      if (lineItemsData) {
        updateData.lineItems = { create: lineItemsData };
      }

      return tx.estimate.update({
        where: { id },
        data: updateData,
        include: this.getFullInclude(),
      });
    });

    return this.formatEstimate(updated);
  }

  // =========================================================================
  // DELETE (DRAFT ONLY)
  // =========================================================================
  async delete(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft estimates can be deleted. To remove a sent estimate, void it instead.',
      );
    }

    await this.prisma.estimate.delete({ where: { id } });

    return { message: `Estimate ${estimate.estimateNumber} has been deleted` };
  }

  // =========================================================================
  // SEND ESTIMATE (DRAFT → SENT)
  // =========================================================================
  async send(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    if (estimate.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft estimates can be sent.',
      );
    }

    if (estimate.lineItems.length === 0) {
      throw new BadRequestException(
        'Cannot send an estimate with no line items',
      );
    }

    // Calculate default expiration date (30 days from now) if not set
    let expirationDate = estimate.expirationDate;
    if (!expirationDate) {
      expirationDate = new Date(estimate.estimateDate);
      expirationDate.setDate(expirationDate.getDate() + 30);
    }

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        expirationDate,
      },
      include: this.getFullInclude(),
    });

    return this.formatEstimate(updated);
  }

  // =========================================================================
  // MARK AS VIEWED (SENT → VIEWED)
  // =========================================================================
  async markViewed(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    if (estimate.status !== 'SENT') {
      throw new BadRequestException(
        'Only sent estimates can be marked as viewed.',
      );
    }

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: 'VIEWED',
        viewedAt: new Date(),
      },
      include: this.getFullInclude(),
    });

    return this.formatEstimate(updated);
  }

  // =========================================================================
  // ACCEPT ESTIMATE (SENT/VIEWED → ACCEPTED)
  // =========================================================================
  async accept(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    const allowedStatuses = ['SENT', 'VIEWED'];
    if (!allowedStatuses.includes(estimate.status)) {
      throw new BadRequestException(
        `Only sent or viewed estimates can be accepted. Current status: ${estimate.status}`,
      );
    }

    // Check if expired
    if (
      estimate.expirationDate &&
      new Date(estimate.expirationDate) < new Date()
    ) {
      throw new BadRequestException(
        'This estimate has expired and cannot be accepted. Create a new estimate.',
      );
    }

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
      include: this.getFullInclude(),
    });

    return this.formatEstimate(updated);
  }

  // =========================================================================
  // REJECT ESTIMATE (SENT/VIEWED → REJECTED)
  // =========================================================================
  async reject(id: string, companyId: string, reason?: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    const allowedStatuses = ['SENT', 'VIEWED'];
    if (!allowedStatuses.includes(estimate.status)) {
      throw new BadRequestException(
        `Only sent or viewed estimates can be rejected. Current status: ${estimate.status}`,
      );
    }

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason || null,
      },
      include: this.getFullInclude(),
    });

    return this.formatEstimate(updated);
  }

  // =========================================================================
  // CONVERT TO INVOICE (ACCEPTED → CONVERTED)
  // =========================================================================
  async convertToInvoice(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    if (estimate.status !== 'ACCEPTED') {
      throw new BadRequestException(
        'Only accepted estimates can be converted to invoices. Accept the estimate first.',
      );
    }

    if (estimate.convertedInvoiceId) {
      throw new BadRequestException(
        'This estimate has already been converted to an invoice.',
      );
    }

    // Generate next invoice number
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let invoiceNumber = 'INV-0001';
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
      if (match) {
        const nextNum = parseInt(match[1], 10) + 1;
        invoiceNumber = `INV-${String(nextNum).padStart(4, '0')}`;
      } else {
        const count = await this.prisma.invoice.count({ where: { companyId } });
        invoiceNumber = `INV-${String(count + 1).padStart(4, '0')}`;
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Create the invoice from estimate data
      const invoice = await tx.invoice.create({
        data: {
          companyId,
          customerId: estimate.customerId,
          invoiceNumber,
          referenceNumber: estimate.referenceNumber,
          status: 'DRAFT',
          invoiceDate: new Date(),
          paymentTerms: estimate.paymentTerms,
          subtotal: estimate.subtotal,
          discountType: estimate.discountType,
          discountValue: estimate.discountValue,
          discountAmount: estimate.discountAmount,
          taxAmount: estimate.taxAmount,
          totalAmount: estimate.totalAmount,
          amountPaid: 0,
          amountDue: estimate.totalAmount,
          depositAccountId: estimate.depositAccountId,
          notes: estimate.notes,
          termsAndConditions: estimate.termsAndConditions,
        },
      });

      // Copy line items
      if (estimate.lineItems.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: estimate.lineItems.map((li) => ({
            invoiceId: invoice.id,
            productId: li.productId,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountPercent: li.discountPercent,
            taxPercent: li.taxPercent,
            amount: li.amount,
            sortOrder: li.sortOrder,
          })),
        });
      }

      // Update estimate status and link to invoice
      const updatedEstimate = await tx.estimate.update({
        where: { id },
        data: {
          status: 'CONVERTED',
          convertedAt: new Date(),
          convertedInvoiceId: invoice.id,
        },
        include: this.getFullInclude(),
      });

      return {
        estimate: updatedEstimate,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      };
    });

    return {
      ...this.formatEstimate(result.estimate),
      convertedInvoice: {
        id: result.invoiceId,
        invoiceNumber: result.invoiceNumber,
      },
    };
  }

  // =========================================================================
  // DUPLICATE ESTIMATE (CLONE)
  // =========================================================================
  async duplicate(id: string, companyId: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: { orderBy: { sortOrder: 'asc' } } },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    const newEstimateNumber = await this.getNextEstimateNumber(companyId);

    const duplicated = await this.prisma.$transaction(async (tx) => {
      const created = await tx.estimate.create({
        data: {
          companyId,
          customerId: estimate.customerId,
          estimateNumber: newEstimateNumber,
          referenceNumber: null,
          status: 'DRAFT',
          estimateDate: new Date(),
          expirationDate: null,
          paymentTerms: estimate.paymentTerms,
          subtotal: estimate.subtotal,
          discountType: estimate.discountType,
          discountValue: estimate.discountValue,
          discountAmount: estimate.discountAmount,
          taxAmount: estimate.taxAmount,
          totalAmount: estimate.totalAmount,
          depositAccountId: estimate.depositAccountId,
          notes: estimate.notes,
          termsAndConditions: estimate.termsAndConditions,
          customerMessage: estimate.customerMessage,
        },
      });

      // Copy line items
      if (estimate.lineItems.length > 0) {
        await tx.estimateLineItem.createMany({
          data: estimate.lineItems.map((li) => ({
            estimateId: created.id,
            productId: li.productId,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountPercent: li.discountPercent,
            taxPercent: li.taxPercent,
            amount: li.amount,
            sortOrder: li.sortOrder,
          })),
        });
      }

      return tx.estimate.findFirst({
        where: { id: created.id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEstimate(duplicated!);
  }

  // =========================================================================
  // VOID ESTIMATE
  // =========================================================================
  async voidEstimate(id: string, companyId: string, reason?: string) {
    const estimate = await this.prisma.estimate.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!estimate) {
      throw new NotFoundException('Estimate not found');
    }

    const allowedStatuses = ['SENT', 'VIEWED', 'ACCEPTED'];
    if (!allowedStatuses.includes(estimate.status)) {
      if (estimate.status === 'DRAFT') {
        throw new BadRequestException(
          'Draft estimates should be deleted, not voided.',
        );
      }
      if (estimate.status === 'CONVERTED') {
        throw new BadRequestException(
          'Converted estimates cannot be voided. Void the resulting invoice instead.',
        );
      }
      throw new BadRequestException(
        `Cannot void an estimate with status "${estimate.status}"`,
      );
    }

    const updated = await this.prisma.estimate.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidReason: reason || 'Voided by user',
      },
      include: this.getFullInclude(),
    });

    return this.formatEstimate(updated);
  }

  // =========================================================================
  // EXPIRE ESTIMATES (batch operation for cron/manual trigger)
  // =========================================================================
  async expireOverdue(companyId: string) {
    const now = new Date();

    const expired = await this.prisma.estimate.updateMany({
      where: {
        companyId,
        status: { in: ['SENT', 'VIEWED'] },
        expirationDate: { lt: now },
        isActive: true,
      },
      data: {
        status: 'EXPIRED',
        expiredAt: now,
      },
    });

    return {
      expiredCount: expired.count,
      message: `${expired.count} estimate(s) marked as expired`,
    };
  }

  // =========================================================================
  // GET SUMMARY (DASHBOARD STATS)
  // =========================================================================
  async getSummary(companyId: string) {
    const now = new Date();

    const [
      draftCount,
      sentEstimates,
      viewedEstimates,
      acceptedEstimates,
      rejectedCount,
      convertedEstimates,
      voidCount,
    ] = await Promise.all([
      this.prisma.estimate.count({
        where: { companyId, isActive: true, status: 'DRAFT' },
      }),
      this.prisma.estimate.findMany({
        where: { companyId, isActive: true, status: 'SENT' },
        select: { totalAmount: true, expirationDate: true },
      }),
      this.prisma.estimate.findMany({
        where: { companyId, isActive: true, status: 'VIEWED' },
        select: { totalAmount: true, expirationDate: true },
      }),
      this.prisma.estimate.aggregate({
        where: { companyId, isActive: true, status: 'ACCEPTED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.estimate.count({
        where: { companyId, isActive: true, status: 'REJECTED' },
      }),
      this.prisma.estimate.aggregate({
        where: { companyId, isActive: true, status: 'CONVERTED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.estimate.count({
        where: { companyId, isActive: true, status: 'VOID' },
      }),
    ]);

    // Calculate pending (sent + viewed) and expired from pending
    const allPending = [...sentEstimates, ...viewedEstimates];
    const expiredFromPending = allPending.filter(
      (est) => est.expirationDate && new Date(est.expirationDate) < now,
    );

    const pendingAmount = allPending.reduce(
      (sum, est) => sum + Number(est.totalAmount),
      0,
    );
    const expiringAmount = expiredFromPending.reduce(
      (sum, est) => sum + Number(est.totalAmount),
      0,
    );

    const totalEstimated =
      pendingAmount +
      Number(acceptedEstimates._sum.totalAmount || 0) +
      Number(convertedEstimates._sum.totalAmount || 0);

    // Conversion rate
    const totalActionable =
      acceptedEstimates._count +
      convertedEstimates._count +
      rejectedCount;
    const conversionRate =
      totalActionable > 0
        ? Math.round(
            ((acceptedEstimates._count + convertedEstimates._count) /
              totalActionable) *
              10000,
          ) / 100
        : 0;

    return {
      draft: { count: draftCount },
      sent: { count: sentEstimates.length },
      viewed: { count: viewedEstimates.length },
      accepted: {
        count: acceptedEstimates._count,
        amount: Number(acceptedEstimates._sum.totalAmount || 0),
      },
      rejected: { count: rejectedCount },
      converted: {
        count: convertedEstimates._count,
        amount: Number(convertedEstimates._sum.totalAmount || 0),
      },
      void: { count: voidCount },
      expiring: {
        count: expiredFromPending.length,
        amount: Math.round(expiringAmount * 100) / 100,
      },
      totals: {
        totalEstimated: Math.round(totalEstimated * 100) / 100,
        totalPending: Math.round(pendingAmount * 100) / 100,
        conversionRate,
      },
    };
  }

  // =========================================================================
  // GET ESTIMATE STATUSES
  // =========================================================================
  async getEstimateStatuses() {
    return Object.entries(ESTIMATE_STATUS_INFO).map(([key, value]) => ({
      value: key,
      ...value,
    }));
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================
  private calculateLineItems(lineItems: any[]) {
    return lineItems.map((li, index) => {
      const quantity = li.quantity;
      const unitPrice = li.unitPrice;
      const discountPercent = li.discountPercent || 0;
      const taxPercent = li.taxPercent || 0;

      const lineSubtotal = quantity * unitPrice;
      const discountAmount = lineSubtotal * (discountPercent / 100);
      const afterDiscount = lineSubtotal - discountAmount;
      const taxAmount = afterDiscount * (taxPercent / 100);
      const amount = afterDiscount + taxAmount;

      return {
        productId: li.productId || null,
        description: li.description,
        quantity,
        unitPrice,
        discountPercent,
        taxPercent,
        amount: Math.round(amount * 10000) / 10000,
        sortOrder: li.sortOrder ?? index,
      };
    });
  }

  private calculateTotals(
    lineItems: any[],
    discountType?: string | null,
    discountValue?: number | null,
  ) {
    const subtotal = lineItems.reduce(
      (sum, li) => sum + (li.quantity || Number(li.quantity)) * (li.unitPrice || Number(li.unitPrice)),
      0,
    );

    const lineTaxTotal = lineItems.reduce((sum, li) => {
      const q = li.quantity || Number(li.quantity);
      const up = li.unitPrice || Number(li.unitPrice);
      const dp = li.discountPercent || Number(li.discountPercent) || 0;
      const tp = li.taxPercent || Number(li.taxPercent) || 0;
      const lineSubtotal = q * up;
      const lineDiscount = lineSubtotal * (dp / 100);
      const afterDiscount = lineSubtotal - lineDiscount;
      return sum + afterDiscount * (tp / 100);
    }, 0);

    const lineDiscountTotal = lineItems.reduce((sum, li) => {
      const q = li.quantity || Number(li.quantity);
      const up = li.unitPrice || Number(li.unitPrice);
      const dp = li.discountPercent || Number(li.discountPercent) || 0;
      const lineSubtotal = q * up;
      return sum + lineSubtotal * (dp / 100);
    }, 0);

    let invoiceDiscountAmount = 0;
    if (discountType && discountValue) {
      if (discountType === 'PERCENTAGE') {
        invoiceDiscountAmount = subtotal * (discountValue / 100);
      } else {
        invoiceDiscountAmount = discountValue;
      }
    }

    const totalDiscountAmount = lineDiscountTotal + invoiceDiscountAmount;
    const taxAmount = lineTaxTotal;
    const totalAmount =
      Math.round((subtotal - totalDiscountAmount + taxAmount) * 10000) / 10000;

    return {
      subtotal,
      discountAmount: totalDiscountAmount,
      taxAmount,
      totalAmount,
    };
  }

  private getFullInclude() {
    return {
      customer: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          billingAddressLine1: true,
          billingAddressLine2: true,
          billingCity: true,
          billingState: true,
          billingPostalCode: true,
          billingCountry: true,
        },
      },
      lineItems: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              type: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      depositAccount: {
        select: { id: true, name: true, accountNumber: true },
      },
      convertedInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
        },
      },
    };
  }

  private formatEstimate(estimate: any) {
    return {
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      referenceNumber: estimate.referenceNumber,
      status: estimate.status,
      statusInfo:
        ESTIMATE_STATUS_INFO[
          estimate.status as keyof typeof ESTIMATE_STATUS_INFO
        ],
      estimateDate: estimate.estimateDate,
      expirationDate: estimate.expirationDate,
      paymentTerms: estimate.paymentTerms,
      customer: estimate.customer,
      lineItems: estimate.lineItems.map((li: any) => ({
        id: li.id,
        product: li.product,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        discountPercent: Number(li.discountPercent),
        taxPercent: Number(li.taxPercent),
        amount: Number(li.amount),
        sortOrder: li.sortOrder,
      })),
      subtotal: Number(estimate.subtotal),
      discountType: estimate.discountType,
      discountValue: estimate.discountValue
        ? Number(estimate.discountValue)
        : null,
      discountAmount: Number(estimate.discountAmount),
      taxAmount: Number(estimate.taxAmount),
      totalAmount: Number(estimate.totalAmount),
      depositAccount: estimate.depositAccount,
      convertedInvoice: estimate.convertedInvoice || null,
      notes: estimate.notes,
      termsAndConditions: estimate.termsAndConditions,
      customerMessage: estimate.customerMessage,
      sentAt: estimate.sentAt,
      viewedAt: estimate.viewedAt,
      acceptedAt: estimate.acceptedAt,
      rejectedAt: estimate.rejectedAt,
      rejectionReason: estimate.rejectionReason,
      expiredAt: estimate.expiredAt,
      convertedAt: estimate.convertedAt,
      voidedAt: estimate.voidedAt,
      voidReason: estimate.voidReason,
      createdAt: estimate.createdAt,
      updatedAt: estimate.updatedAt,
    };
  }

  private formatEstimateListItem(estimate: any) {
    return {
      id: estimate.id,
      estimateNumber: estimate.estimateNumber,
      referenceNumber: estimate.referenceNumber,
      status: estimate.status,
      statusInfo:
        ESTIMATE_STATUS_INFO[
          estimate.status as keyof typeof ESTIMATE_STATUS_INFO
        ],
      estimateDate: estimate.estimateDate,
      expirationDate: estimate.expirationDate,
      customer: estimate.customer,
      totalAmount: Number(estimate.totalAmount),
      lineItemCount: estimate._count?.lineItems || 0,
      createdAt: estimate.createdAt,
    };
  }
}
