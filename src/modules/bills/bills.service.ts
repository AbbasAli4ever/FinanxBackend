import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';
import { QueryBillsDto } from './dto/query-bills.dto';
import { RecordBillPaymentDto } from './dto/record-bill-payment.dto';
import { PAYMENT_TERMS, PaymentTermCode } from '../invoices/constants/payment-terms.constant';
import { BILL_STATUS_INFO } from './constants/bill-statuses.constant';

@Injectable()
export class BillsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // GET NEXT BILL NUMBER
  // =========================================================================
  async getNextBillNumber(companyId: string): Promise<string> {
    const lastBill = await this.prisma.bill.findFirst({
      where: { companyId },
      orderBy: { billNumber: 'desc' },
      select: { billNumber: true },
    });

    if (!lastBill) {
      return 'BILL-0001';
    }

    const match = lastBill.billNumber.match(/BILL-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `BILL-${String(nextNum).padStart(4, '0')}`;
    }

    const count = await this.prisma.bill.count({ where: { companyId } });
    return `BILL-${String(count + 1).padStart(4, '0')}`;
  }

  // =========================================================================
  // CREATE BILL (DRAFT)
  // =========================================================================
  async create(dto: CreateBillDto, companyId: string) {
    // Validate vendor exists and belongs to company
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, companyId, isActive: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found or is inactive');
    }

    // Validate payment account if provided
    if (dto.paymentAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.paymentAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Payment account not found or is inactive');
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

    // Validate expense account IDs in line items
    const expenseAccountIds = dto.lineItems
      .filter((li) => li.expenseAccountId)
      .map((li) => li.expenseAccountId!);

    if (expenseAccountIds.length > 0) {
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: expenseAccountIds }, companyId, isActive: true },
        select: { id: true },
      });
      const foundIds = new Set(accounts.map((a) => a.id));
      const missing = expenseAccountIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Expense account(s) not found or inactive: ${missing.join(', ')}`,
        );
      }
    }

    // Generate bill number if not provided
    const billNumber =
      dto.billNumber || (await this.getNextBillNumber(companyId));

    // Check for duplicate bill number
    const existing = await this.prisma.bill.findUnique({
      where: {
        unique_company_bill_number: {
          companyId,
          billNumber,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Bill number "${billNumber}" already exists`,
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
        expenseAccountId: li.expenseAccountId || null,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        discountPercent: discountPercent,
        taxPercent: taxPercent,
        amount: Math.round(amount * 10000) / 10000,
        sortOrder: li.sortOrder ?? index,
      };
    });

    // Calculate bill totals
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

    // Bill-level discount
    let billDiscountAmount = 0;
    if (dto.discountType && dto.discountValue) {
      if (dto.discountType === 'PERCENTAGE') {
        billDiscountAmount = subtotal * (dto.discountValue / 100);
      } else {
        billDiscountAmount = dto.discountValue;
      }
    }

    const totalDiscountAmount = lineDiscountTotal + billDiscountAmount;
    const taxAmount = lineTaxTotal;
    const totalAmount =
      Math.round((subtotal - totalDiscountAmount + taxAmount) * 10000) / 10000;

    const bill = await this.prisma.$transaction(async (tx) => {
      const created = await tx.bill.create({
        data: {
          companyId,
          vendorId: dto.vendorId,
          billNumber,
          vendorInvoiceNumber: dto.vendorInvoiceNumber,
          referenceNumber: dto.referenceNumber,
          status: 'DRAFT',
          billDate: new Date(dto.billDate),
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
          paymentAccountId: dto.paymentAccountId,
          notes: dto.notes,
          memo: dto.memo,
          lineItems: {
            create: calculatedLineItems,
          },
        },
        include: this.getFullInclude(),
      });

      return created;
    });

    return this.formatBill(bill);
  }

  // =========================================================================
  // FIND ALL (WITH FILTERS)
  // =========================================================================
  async findAll(companyId: string, query: QueryBillsDto) {
    const {
      status,
      vendorId,
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
        where.status = { in: ['RECEIVED', 'PARTIALLY_PAID'] };
        where.dueDate = { lt: new Date() };
        where.amountDue = { gt: 0 };
      } else {
        where.status = status;
      }
    }

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (dateFrom || dateTo) {
      where.billDate = {};
      if (dateFrom) where.billDate.gte = new Date(dateFrom);
      if (dateTo) where.billDate.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { billNumber: { contains: search, mode: 'insensitive' } },
        { vendorInvoiceNumber: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        {
          vendor: {
            displayName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, displayName: true, email: true },
          },
          _count: { select: { lineItems: true, payments: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return {
      items: items.map((bill) => this.formatBillListItem(bill)),
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
    const bill = await this.prisma.bill.findFirst({
      where: { id, companyId, isActive: true },
      include: this.getFullInclude(),
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    return this.formatBill(bill);
  }

  // =========================================================================
  // UPDATE (DRAFT ONLY)
  // =========================================================================
  async update(id: string, dto: UpdateBillDto, companyId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft bills can be edited. This bill has been received or processed.',
      );
    }

    // Validate vendor if changing
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, companyId, isActive: true },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found or is inactive');
      }
    }

    // Validate payment account if changing
    if (dto.paymentAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.paymentAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Payment account not found or is inactive');
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

      // Validate expense account IDs
      const expenseAccountIds = dto.lineItems
        .filter((li) => li.expenseAccountId)
        .map((li) => li.expenseAccountId!);

      if (expenseAccountIds.length > 0) {
        const accounts = await this.prisma.account.findMany({
          where: { id: { in: expenseAccountIds }, companyId, isActive: true },
          select: { id: true },
        });
        const foundIds = new Set(accounts.map((a) => a.id));
        const missing = expenseAccountIds.filter((aid) => !foundIds.has(aid));
        if (missing.length > 0) {
          throw new NotFoundException(
            `Expense account(s) not found or inactive: ${missing.join(', ')}`,
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
          expenseAccountId: li.expenseAccountId || null,
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

      const discountType = dto.discountType ?? (bill.discountType as any);
      const discountValue = dto.discountValue ?? Number(bill.discountValue || 0);
      let billDiscountAmount = 0;
      if (discountType && discountValue) {
        if (discountType === 'PERCENTAGE') {
          billDiscountAmount = subtotal * (discountValue / 100);
        } else {
          billDiscountAmount = discountValue;
        }
      }

      const totalDiscountAmount = lineDiscountTotal + billDiscountAmount;
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
      const existingLineItems = await this.prisma.billLineItem.findMany({
        where: { billId: id },
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

      const discountType = dto.discountType ?? (bill.discountType as any);
      const discountValue = dto.discountValue ?? Number(bill.discountValue || 0);
      let billDiscountAmount = 0;
      if (discountType && discountValue) {
        if (discountType === 'PERCENTAGE') {
          billDiscountAmount = subtotal * (discountValue / 100);
        } else {
          billDiscountAmount = discountValue;
        }
      }

      const totalDiscountAmount = lineDiscountTotal + billDiscountAmount;
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
      if (lineItemsData) {
        await tx.billLineItem.deleteMany({ where: { billId: id } });
      }

      const updateData: any = {
        ...(dto.vendorId && { vendorId: dto.vendorId }),
        ...(dto.vendorInvoiceNumber !== undefined && {
          vendorInvoiceNumber: dto.vendorInvoiceNumber,
        }),
        ...(dto.referenceNumber !== undefined && {
          referenceNumber: dto.referenceNumber,
        }),
        ...(dto.billDate && { billDate: new Date(dto.billDate) }),
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
        ...(dto.paymentAccountId !== undefined && {
          paymentAccountId: dto.paymentAccountId,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.memo !== undefined && { memo: dto.memo }),
        ...totals,
      };

      if (lineItemsData) {
        updateData.lineItems = { create: lineItemsData };
      }

      return tx.bill.update({
        where: { id },
        data: updateData,
        include: this.getFullInclude(),
      });
    });

    return this.formatBill(updated);
  }

  // =========================================================================
  // DELETE (DRAFT ONLY — HARD DELETE)
  // =========================================================================
  async delete(id: string, companyId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft bills can be deleted. To remove a received bill, void it instead.',
      );
    }

    await this.prisma.bill.delete({ where: { id } });

    return { message: `Bill ${bill.billNumber} has been deleted` };
  }

  // =========================================================================
  // RECEIVE BILL (DRAFT → RECEIVED)
  // =========================================================================
  async receive(id: string, companyId: string) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, companyId, isActive: true },
      include: {
        lineItems: {
          include: {
            product: {
              select: {
                id: true,
                type: true,
                trackInventory: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft bills can be received. This bill has already been received or processed.',
      );
    }

    if (bill.lineItems.length === 0) {
      throw new BadRequestException(
        'Cannot receive a bill with no line items',
      );
    }

    // Calculate due date from payment terms if not set
    let dueDate = bill.dueDate;
    if (!dueDate && bill.paymentTerms) {
      const terms = PAYMENT_TERMS[bill.paymentTerms as PaymentTermCode];
      if (terms && terms.days !== null) {
        dueDate = new Date(bill.billDate);
        dueDate.setDate(dueDate.getDate() + terms.days);
      }
    }
    if (!dueDate) {
      dueDate = new Date(bill.billDate);
      dueDate.setDate(dueDate.getDate() + 30);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // INCREASE inventory for INVENTORY type products (opposite of invoice send)
      for (const lineItem of bill.lineItems) {
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

      // INCREASE vendor balance (we now owe them this amount)
      await tx.vendor.update({
        where: { id: bill.vendorId },
        data: {
          currentBalance: { increment: Number(bill.totalAmount) },
        },
      });

      // Update bill status
      return tx.bill.update({
        where: { id },
        data: {
          status: 'RECEIVED',
          receivedAt: new Date(),
          dueDate,
        },
        include: this.getFullInclude(),
      });
    });

    return this.formatBill(updated);
  }

  // =========================================================================
  // VOID BILL
  // =========================================================================
  async voidBill(id: string, companyId: string, reason?: string) {
    const bill = await this.prisma.bill.findFirst({
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

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const allowedStatuses = ['RECEIVED', 'PARTIALLY_PAID'];
    if (!allowedStatuses.includes(bill.status)) {
      if (bill.status === 'PAID') {
        throw new BadRequestException(
          'Fully paid bills cannot be voided. Use a debit note instead.',
        );
      }
      if (bill.status === 'DRAFT') {
        throw new BadRequestException(
          'Draft bills should be deleted, not voided.',
        );
      }
      throw new BadRequestException(
        `Cannot void a bill with status "${bill.status}"`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // DECREASE inventory for INVENTORY type products (reverse the receive)
      for (const lineItem of bill.lineItems) {
        if (
          lineItem.product &&
          lineItem.product.type === 'INVENTORY' &&
          lineItem.product.trackInventory
        ) {
          await tx.product.update({
            where: { id: lineItem.product.id },
            data: {
              quantityOnHand: { decrement: Number(lineItem.quantity) },
            },
          });
        }
      }

      // DECREASE vendor balance by the outstanding amount
      await tx.vendor.update({
        where: { id: bill.vendorId },
        data: {
          currentBalance: { decrement: Number(bill.amountDue) },
        },
      });

      // Update bill status
      return tx.bill.update({
        where: { id },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: reason || 'Voided by user',
        },
        include: this.getFullInclude(),
      });
    });

    return this.formatBill(updated);
  }

  // =========================================================================
  // RECORD PAYMENT
  // =========================================================================
  async recordPayment(
    id: string,
    dto: RecordBillPaymentDto,
    companyId: string,
  ) {
    const bill = await this.prisma.bill.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const allowedStatuses = ['RECEIVED', 'PARTIALLY_PAID'];
    if (!allowedStatuses.includes(bill.status)) {
      throw new BadRequestException(
        `Cannot record payment for a bill with status "${bill.status}". Only received or partially paid bills accept payments.`,
      );
    }

    const amountDue = Number(bill.amountDue);
    if (dto.amount > amountDue) {
      throw new BadRequestException(
        `Payment amount (${dto.amount}) exceeds the amount due (${amountDue}). Maximum payment allowed: ${amountDue}`,
      );
    }

    // Validate payment account if provided
    if (dto.paymentAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.paymentAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Payment account not found or is inactive');
      }
    }

    const newAmountPaid = Number(bill.amountPaid) + dto.amount;
    const newAmountDue =
      Math.round((Number(bill.totalAmount) - newAmountPaid) * 10000) / 10000;
    const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

    const updated = await this.prisma.$transaction(async (tx) => {
      // Create payment record
      await tx.billPayment.create({
        data: {
          billId: id,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: (dto.paymentMethod as any) || 'OTHER',
          referenceNumber: dto.referenceNumber,
          notes: dto.notes,
          paymentAccountId: dto.paymentAccountId || bill.paymentAccountId,
        },
      });

      // DECREASE vendor balance (we paid them)
      await tx.vendor.update({
        where: { id: bill.vendorId },
        data: {
          currentBalance: { decrement: dto.amount },
        },
      });

      // Update bill amounts and status
      return tx.bill.update({
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

    return this.formatBill(updated);
  }

  // =========================================================================
  // GET SUMMARY (DASHBOARD STATS)
  // =========================================================================
  async getSummary(companyId: string) {
    const now = new Date();

    const [
      draftCount,
      receivedBills,
      partiallyPaidBills,
      paidBills,
      voidCount,
    ] = await Promise.all([
      this.prisma.bill.count({
        where: { companyId, isActive: true, status: 'DRAFT' },
      }),
      this.prisma.bill.findMany({
        where: { companyId, isActive: true, status: 'RECEIVED' },
        select: { totalAmount: true, amountDue: true, dueDate: true },
      }),
      this.prisma.bill.findMany({
        where: { companyId, isActive: true, status: 'PARTIALLY_PAID' },
        select: { totalAmount: true, amountDue: true, dueDate: true },
      }),
      this.prisma.bill.aggregate({
        where: { companyId, isActive: true, status: 'PAID' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.bill.count({
        where: { companyId, isActive: true, status: 'VOID' },
      }),
    ]);

    const allUnpaid = [...receivedBills, ...partiallyPaidBills];
    const overdueBills = allUnpaid.filter(
      (b) => b.dueDate && new Date(b.dueDate) < now,
    );
    const overdueAmount = overdueBills.reduce(
      (sum, b) => sum + Number(b.amountDue),
      0,
    );

    const unpaidAmount = allUnpaid.reduce(
      (sum, b) => sum + Number(b.amountDue),
      0,
    );

    const totalBilled =
      allUnpaid.reduce((sum, b) => sum + Number(b.totalAmount), 0) +
      Number(paidBills._sum.totalAmount || 0);

    return {
      draft: {
        count: draftCount,
      },
      received: {
        count: receivedBills.length,
      },
      partiallyPaid: {
        count: partiallyPaidBills.length,
      },
      paid: {
        count: paidBills._count,
        amount: Number(paidBills._sum.totalAmount || 0),
      },
      overdue: {
        count: overdueBills.length,
        amount: Math.round(overdueAmount * 100) / 100,
      },
      void: {
        count: voidCount,
      },
      totals: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalUnpaid: Math.round(unpaidAmount * 100) / 100,
        totalPaid: Number(paidBills._sum.totalAmount || 0),
      },
    };
  }

  // =========================================================================
  // GET BILL STATUSES (for frontend dropdowns)
  // =========================================================================
  async getBillStatuses() {
    return Object.entries(BILL_STATUS_INFO).map(([key, value]) => ({
      value: key,
      ...value,
    }));
  }

  // =========================================================================
  // PRIVATE HELPERS
  // =========================================================================
  private getFullInclude() {
    return {
      vendor: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
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
          expenseAccount: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      payments: {
        orderBy: { paymentDate: 'desc' as const },
      },
      paymentAccount: {
        select: { id: true, name: true, accountNumber: true },
      },
    };
  }

  private formatBill(bill: any) {
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      vendorInvoiceNumber: bill.vendorInvoiceNumber,
      referenceNumber: bill.referenceNumber,
      status: bill.status,
      statusInfo: BILL_STATUS_INFO[bill.status as keyof typeof BILL_STATUS_INFO],
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      paymentTerms: bill.paymentTerms,
      vendor: bill.vendor,
      lineItems: bill.lineItems.map((li: any) => ({
        id: li.id,
        product: li.product,
        expenseAccount: li.expenseAccount,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        discountPercent: Number(li.discountPercent),
        taxPercent: Number(li.taxPercent),
        amount: Number(li.amount),
        sortOrder: li.sortOrder,
      })),
      subtotal: Number(bill.subtotal),
      discountType: bill.discountType,
      discountValue: bill.discountValue ? Number(bill.discountValue) : null,
      discountAmount: Number(bill.discountAmount),
      taxAmount: Number(bill.taxAmount),
      totalAmount: Number(bill.totalAmount),
      amountPaid: Number(bill.amountPaid),
      amountDue: Number(bill.amountDue),
      paymentAccount: bill.paymentAccount,
      notes: bill.notes,
      memo: bill.memo,
      payments: bill.payments?.map((p: any) => ({
        id: p.id,
        amount: Number(p.amount),
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      receivedAt: bill.receivedAt,
      paidAt: bill.paidAt,
      voidedAt: bill.voidedAt,
      voidReason: bill.voidReason,
      createdAt: bill.createdAt,
      updatedAt: bill.updatedAt,
    };
  }

  private formatBillListItem(bill: any) {
    return {
      id: bill.id,
      billNumber: bill.billNumber,
      vendorInvoiceNumber: bill.vendorInvoiceNumber,
      referenceNumber: bill.referenceNumber,
      status: bill.status,
      statusInfo: BILL_STATUS_INFO[bill.status as keyof typeof BILL_STATUS_INFO],
      billDate: bill.billDate,
      dueDate: bill.dueDate,
      vendor: bill.vendor,
      totalAmount: Number(bill.totalAmount),
      amountPaid: Number(bill.amountPaid),
      amountDue: Number(bill.amountDue),
      lineItemCount: bill._count?.lineItems || 0,
      paymentCount: bill._count?.payments || 0,
      createdAt: bill.createdAt,
    };
  }
}
