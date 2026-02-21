import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { PAYMENT_TERMS, PaymentTermCode } from './constants/payment-terms.constant';
import { INVOICE_STATUS_INFO } from './constants/invoice-statuses.constant';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // GET NEXT INVOICE NUMBER
  // =========================================================================
  async getNextInvoiceNumber(companyId: string): Promise<string> {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    if (!lastInvoice) {
      return 'INV-0001';
    }

    const match = lastInvoice.invoiceNumber.match(/INV-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `INV-${String(nextNum).padStart(4, '0')}`;
    }

    // Fallback: count existing + 1
    const count = await this.prisma.invoice.count({ where: { companyId } });
    return `INV-${String(count + 1).padStart(4, '0')}`;
  }

  // =========================================================================
  // CREATE INVOICE (DRAFT)
  // =========================================================================
  async create(dto: CreateInvoiceDto, companyId: string) {
    // Validate customer exists and belongs to company
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

    // Generate invoice number if not provided
    const invoiceNumber =
      dto.invoiceNumber || (await this.getNextInvoiceNumber(companyId));

    // Check for duplicate invoice number
    const existing = await this.prisma.invoice.findUnique({
      where: {
        unique_company_invoice_number: {
          companyId,
          invoiceNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Invoice number "${invoiceNumber}" already exists`,
      );
    }

    // Calculate line item amounts
    const calculatedLineItems = dto.lineItems.map((li, index) => {
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
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        discountPercent: discountPercent,
        taxPercent: taxPercent,
        amount: Math.round(amount * 10000) / 10000,
        sortOrder: li.sortOrder ?? index,
      };
    });

    // Calculate invoice totals
    const subtotal = calculatedLineItems.reduce(
      (sum, li) => sum + li.quantity * li.unitPrice,
      0,
    );

    // Calculate line-level tax total
    const lineTaxTotal = calculatedLineItems.reduce((sum, li) => {
      const lineSubtotal = li.quantity * li.unitPrice;
      const lineDiscount = lineSubtotal * (li.discountPercent / 100);
      const afterDiscount = lineSubtotal - lineDiscount;
      return sum + afterDiscount * (li.taxPercent / 100);
    }, 0);

    // Calculate line-level discount total
    const lineDiscountTotal = calculatedLineItems.reduce((sum, li) => {
      const lineSubtotal = li.quantity * li.unitPrice;
      return sum + lineSubtotal * (li.discountPercent / 100);
    }, 0);

    // Invoice-level discount
    let invoiceDiscountAmount = 0;
    if (dto.discountType && dto.discountValue) {
      if (dto.discountType === 'PERCENTAGE') {
        invoiceDiscountAmount = subtotal * (dto.discountValue / 100);
      } else {
        invoiceDiscountAmount = dto.discountValue;
      }
    }

    const totalDiscountAmount = lineDiscountTotal + invoiceDiscountAmount;
    const taxAmount = lineTaxTotal;
    const totalAmount =
      Math.round((subtotal - totalDiscountAmount + taxAmount) * 10000) / 10000;

    const invoice = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId,
          customerId: dto.customerId,
          invoiceNumber,
          referenceNumber: dto.referenceNumber,
          status: 'DRAFT',
          invoiceDate: new Date(dto.invoiceDate),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          paymentTerms: dto.paymentTerms,
          subtotal,
          discountType: dto.discountType || null,
          discountValue: dto.discountValue || null,
          discountAmount: totalDiscountAmount,
          taxAmount,
          totalAmount,
          amountPaid: 0,
          amountDue: totalAmount,
          depositAccountId: dto.depositAccountId,
          notes: dto.notes,
          termsAndConditions: dto.termsAndConditions,
          lineItems: {
            create: calculatedLineItems,
          },
        },
        include: this.getFullInclude(),
      });

      return created;
    });

    return this.formatInvoice(invoice);
  }

  // =========================================================================
  // FIND ALL (WITH FILTERS)
  // =========================================================================
  async findAll(companyId: string, query: QueryInvoicesDto) {
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
      if (status === 'OVERDUE') {
        // Overdue = SENT or PARTIALLY_PAID with dueDate < today
        where.status = { in: ['SENT', 'PARTIALLY_PAID'] };
        where.dueDate = { lt: new Date() };
        where.amountDue = { gt: 0 };
      } else {
        where.status = status;
      }
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (dateFrom || dateTo) {
      where.invoiceDate = {};
      if (dateFrom) where.invoiceDate.gte = new Date(dateFrom);
      if (dateTo) where.invoiceDate.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
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
      this.prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, displayName: true, email: true },
          },
          _count: { select: { lineItems: true, payments: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: items.map((inv) => this.formatInvoiceListItem(inv)),
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
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, isActive: true },
      include: this.getFullInclude(),
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.formatInvoice(invoice);
  }

  // =========================================================================
  // UPDATE (DRAFT ONLY)
  // =========================================================================
  async update(id: string, dto: UpdateInvoiceDto, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft invoices can be edited. This invoice has been sent or processed.',
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

    // If line items are being updated, validate and recalculate
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

      const calculatedLineItems = dto.lineItems.map((li, index) => {
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

      const subtotal = calculatedLineItems.reduce(
        (sum, li) => sum + li.quantity * li.unitPrice,
        0,
      );

      const lineTaxTotal = calculatedLineItems.reduce((sum, li) => {
        const lineSubtotal = li.quantity * li.unitPrice;
        const lineDiscount = lineSubtotal * (li.discountPercent / 100);
        const afterDiscount = lineSubtotal - lineDiscount;
        return sum + afterDiscount * (li.taxPercent / 100);
      }, 0);

      const lineDiscountTotal = calculatedLineItems.reduce((sum, li) => {
        const lineSubtotal = li.quantity * li.unitPrice;
        return sum + lineSubtotal * (li.discountPercent / 100);
      }, 0);

      const discountType = dto.discountType ?? (invoice.discountType as any);
      const discountValue = dto.discountValue ?? Number(invoice.discountValue || 0);
      let invoiceDiscountAmount = 0;
      if (discountType && discountValue) {
        if (discountType === 'PERCENTAGE') {
          invoiceDiscountAmount = subtotal * (discountValue / 100);
        } else {
          invoiceDiscountAmount = discountValue;
        }
      }

      const totalDiscountAmount = lineDiscountTotal + invoiceDiscountAmount;
      const totalAmount =
        Math.round((subtotal - totalDiscountAmount + lineTaxTotal) * 10000) /
        10000;

      totals = {
        subtotal,
        discountAmount: totalDiscountAmount,
        taxAmount: lineTaxTotal,
        totalAmount,
        amountDue: totalAmount,
      };

      lineItemsData = calculatedLineItems;
    } else if (dto.discountType !== undefined || dto.discountValue !== undefined) {
      // Recalculate totals with new discount but existing line items
      const existingLineItems = await this.prisma.invoiceLineItem.findMany({
        where: { invoiceId: id },
      });

      const subtotal = existingLineItems.reduce(
        (sum, li) => sum + Number(li.quantity) * Number(li.unitPrice),
        0,
      );

      const lineTaxTotal = existingLineItems.reduce((sum, li) => {
        const lineSubtotal = Number(li.quantity) * Number(li.unitPrice);
        const lineDiscount = lineSubtotal * (Number(li.discountPercent) / 100);
        const afterDiscount = lineSubtotal - lineDiscount;
        return sum + afterDiscount * (Number(li.taxPercent) / 100);
      }, 0);

      const lineDiscountTotal = existingLineItems.reduce((sum, li) => {
        const lineSubtotal = Number(li.quantity) * Number(li.unitPrice);
        return sum + lineSubtotal * (Number(li.discountPercent) / 100);
      }, 0);

      const discountType = dto.discountType ?? (invoice.discountType as any);
      const discountValue = dto.discountValue ?? Number(invoice.discountValue || 0);
      let invoiceDiscountAmount = 0;
      if (discountType && discountValue) {
        if (discountType === 'PERCENTAGE') {
          invoiceDiscountAmount = subtotal * (discountValue / 100);
        } else {
          invoiceDiscountAmount = discountValue;
        }
      }

      const totalDiscountAmount = lineDiscountTotal + invoiceDiscountAmount;
      const totalAmount =
        Math.round((subtotal - totalDiscountAmount + lineTaxTotal) * 10000) /
        10000;

      totals = {
        subtotal,
        discountAmount: totalDiscountAmount,
        taxAmount: lineTaxTotal,
        totalAmount,
        amountDue: totalAmount,
      };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete old line items if replacing
      if (lineItemsData) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });
      }

      const updateData: any = {
        ...(dto.customerId && { customerId: dto.customerId }),
        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),
        ...(dto.invoiceDate && { invoiceDate: new Date(dto.invoiceDate) }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
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
        ...totals,
      };

      if (lineItemsData) {
        updateData.lineItems = { create: lineItemsData };
      }

      return tx.invoice.update({
        where: { id },
        data: updateData,
        include: this.getFullInclude(),
      });
    });

    return this.formatInvoice(updated);
  }

  // =========================================================================
  // DELETE (DRAFT ONLY — HARD DELETE)
  // =========================================================================
  async delete(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft invoices can be deleted. To remove a sent invoice, void it instead.',
      );
    }

    await this.prisma.invoice.delete({ where: { id } });

    return { message: `Invoice ${invoice.invoiceNumber} has been deleted` };
  }

  // =========================================================================
  // SEND INVOICE (DRAFT → SENT)
  // =========================================================================
  async send(id: string, companyId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, isActive: true },
      include: {
        lineItems: {
          include: {
            product: {
              select: {
                id: true,
                type: true,
                trackInventory: true,
                quantityOnHand: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft invoices can be sent. This invoice has already been sent or processed.',
      );
    }

    if (invoice.lineItems.length === 0) {
      throw new BadRequestException(
        'Cannot send an invoice with no line items',
      );
    }

    // Calculate due date from payment terms if not set
    let dueDate = invoice.dueDate;
    if (!dueDate && invoice.paymentTerms) {
      const terms = PAYMENT_TERMS[invoice.paymentTerms as PaymentTermCode];
      if (terms && terms.days !== null) {
        dueDate = new Date(invoice.invoiceDate);
        dueDate.setDate(dueDate.getDate() + terms.days);
      }
    }
    if (!dueDate) {
      // Default to Net 30 if no terms set
      dueDate = new Date(invoice.invoiceDate);
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Deduct inventory for INVENTORY type products
      for (const lineItem of invoice.lineItems) {
        if (
          lineItem.product &&
          lineItem.product.type === 'INVENTORY' &&
          lineItem.product.trackInventory
        ) {
          const currentQty = Number(lineItem.product.quantityOnHand);
          const deductQty = Number(lineItem.quantity);

          if (currentQty < deductQty) {
            throw new BadRequestException(
              `Insufficient stock for "${lineItem.product.name}". Available: ${currentQty}, Required: ${deductQty}`,
            );
          }

          await tx.product.update({
            where: { id: lineItem.product.id },
            data: {
              quantityOnHand: { decrement: deductQty },
            },
          });
        }
      }

      // Update invoice status
      return tx.invoice.update({
        where: { id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          dueDate,
        },
        include: this.getFullInclude(),
      });
    });

    return this.formatInvoice(updated);
  }

  // =========================================================================
  // VOID INVOICE
  // =========================================================================
  async voidInvoice(id: string, companyId: string, reason?: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, isActive: true },
      include: {
        lineItems: {
          include: {
            product: {
              select: {
                id: true,
                type: true,
                trackInventory: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const allowedStatuses = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'];
    if (!allowedStatuses.includes(invoice.status)) {
      if (invoice.status === 'PAID') {
        throw new BadRequestException(
          'Fully paid invoices cannot be voided. Use a credit note instead.',
        );
      }
      if (invoice.status === 'DRAFT') {
        throw new BadRequestException(
          'Draft invoices should be deleted, not voided.',
        );
      }
      throw new BadRequestException(
        `Cannot void an invoice with status "${invoice.status}"`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Restore inventory for INVENTORY type products
      for (const lineItem of invoice.lineItems) {
        if (
          lineItem.product &&
          lineItem.product.type === 'INVENTORY' &&
          lineItem.product.trackInventory
        ) {
          await tx.product.update({
            where: { id: lineItem.product.id },
            data: {
              quantityOnHand: { increment: Number(lineItem.quantity) },
            },
          });
        }
      }

      // Update invoice status
      return tx.invoice.update({
        where: { id },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: reason || 'Voided by user',
        },
        include: this.getFullInclude(),
      });
    });

    return this.formatInvoice(updated);
  }

  // =========================================================================
  // RECORD PAYMENT
  // =========================================================================
  async recordPayment(
    id: string,
    dto: RecordPaymentDto,
    companyId: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const allowedStatuses = ['SENT', 'PARTIALLY_PAID'];
    if (!allowedStatuses.includes(invoice.status)) {
      throw new BadRequestException(
        `Cannot record payment for an invoice with status "${invoice.status}". Only sent or partially paid invoices accept payments.`,
      );
    }

    const amountDue = Number(invoice.amountDue);
    if (dto.amount > amountDue) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds the amount due (${amountDue}). Maximum payment allowed: ${amountDue}`,
      );
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

    const newAmountPaid = Number(invoice.amountPaid) + dto.amount;
    const newAmountDue =
      Math.round((Number(invoice.totalAmount) - newAmountPaid) * 10000) / 10000;
    const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const updated = await this.prisma.$transaction(async (tx) => {
      // Create payment record
      await tx.invoicePayment.create({
        data: {
          invoiceId: id,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: (dto.paymentMethod as any) || 'OTHER',
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          depositAccountId: dto.depositAccountId || invoice.depositAccountId,
        },
      });

      // Update invoice amounts and status
      return tx.invoice.update({
        where: { id },
        data: {
          amountPaid: newAmountPaid,
          amountDue: newAmountDue,
          status: newStatus,
          ...(newStatus === 'PAID' && { paidAt: new Date() }),
        },
        include: this.getFullInclude(),
      });
    });

    return this.formatInvoice(updated);
  }

  // =========================================================================
  // GET SUMMARY (DASHBOARD STATS)
  // =========================================================================
  async getSummary(companyId: string) {
    const now = new Date();

    const [
      draftCount,
      sentInvoices,
      partiallyPaidInvoices,
      paidInvoices,
      voidCount,
    ] = await Promise.all([
      this.prisma.invoice.count({
        where: { companyId, isActive: true, status: 'DRAFT' },
      }),
      this.prisma.invoice.findMany({
        where: { companyId, isActive: true, status: 'SENT' },
        select: { totalAmount: true, amountDue: true, dueDate: true },
      }),
      this.prisma.invoice.findMany({
        where: { companyId, isActive: true, status: 'PARTIALLY_PAID' },
        select: { totalAmount: true, amountDue: true, dueDate: true },
      }),
      this.prisma.invoice.aggregate({
        where: { companyId, isActive: true, status: 'PAID' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.count({
        where: { companyId, isActive: true, status: 'VOID' },
      }),
    ]);

    // Calculate overdue from SENT and PARTIALLY_PAID
    const allUnpaid = [...sentInvoices, ...partiallyPaidInvoices];
    const overdueInvoices = allUnpaid.filter(
      (inv) => inv.dueDate && new Date(inv.dueDate) < now,
    );
    const overdueAmount = overdueInvoices.reduce(
      (sum, inv) => sum + Number(inv.amountDue),
      0,
    );

    const unpaidAmount = allUnpaid.reduce(
      (sum, inv) => sum + Number(inv.amountDue),
      0,
    );

    const totalInvoiced =
      allUnpaid.reduce((sum, inv) => sum + Number(inv.totalAmount), 0) +
      Number(paidInvoices._sum.totalAmount || 0);

    return {
      draft: {
        count: draftCount,
      },
      sent: {
        count: sentInvoices.length,
      },
      partiallyPaid: {
        count: partiallyPaidInvoices.length,
      },
      paid: {
        count: paidInvoices._count,
        amount: Number(paidInvoices._sum.totalAmount || 0),
      },
      overdue: {
        count: overdueInvoices.length,
        amount: Math.round(overdueAmount * 100) / 100,
      },
      void: {
        count: voidCount,
      },
      totals: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalUnpaid: Math.round(unpaidAmount * 100) / 100,
        totalPaid: Number(paidInvoices._sum.totalAmount || 0),
      },
    };
  }

  // =========================================================================
  // GET INVOICE STATUSES (for frontend dropdowns)
  // =========================================================================
  async getInvoiceStatuses() {
    return Object.entries(INVOICE_STATUS_INFO).map(([key, value]) => ({
      value: key,
      ...value,
    }));
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================
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
      payments: {
        orderBy: { paymentDate: 'desc' as const },
      },
      depositAccount: {
        select: { id: true, name: true, accountNumber: true },
      },
    };
  }

  private formatInvoice(invoice: any) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      referenceNumber: invoice.referenceNumber,
      status: invoice.status,
      statusInfo: INVOICE_STATUS_INFO[invoice.status as keyof typeof INVOICE_STATUS_INFO],
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      paymentTerms: invoice.paymentTerms,
      customer: invoice.customer,
      lineItems: invoice.lineItems.map((li: any) => ({
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
      subtotal: Number(invoice.subtotal),
      discountType: invoice.discountType,
      discountValue: invoice.discountValue ? Number(invoice.discountValue) : null,
      discountAmount: Number(invoice.discountAmount),
      taxAmount: Number(invoice.taxAmount),
      totalAmount: Number(invoice.totalAmount),
      amountPaid: Number(invoice.amountPaid),
      amountDue: Number(invoice.amountDue),
      depositAccount: invoice.depositAccount,
      notes: invoice.notes,
      termsAndConditions: invoice.termsAndConditions,
      payments: invoice.payments?.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      sentAt: invoice.sentAt,
      paidAt: invoice.paidAt,
      voidedAt: invoice.voidedAt,
      voidReason: invoice.voidReason,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  private formatInvoiceListItem(invoice: any) {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      referenceNumber: invoice.referenceNumber,
      status: invoice.status,
      statusInfo: INVOICE_STATUS_INFO[invoice.status as keyof typeof INVOICE_STATUS_INFO],
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      customer: invoice.customer,
      totalAmount: Number(invoice.totalAmount),
      amountPaid: Number(invoice.amountPaid),
      amountDue: Number(invoice.amountDue),
      lineItemCount: invoice._count?.lineItems || 0,
      paymentCount: invoice._count?.payments || 0,
      createdAt: invoice.createdAt,
    };
  }
}
