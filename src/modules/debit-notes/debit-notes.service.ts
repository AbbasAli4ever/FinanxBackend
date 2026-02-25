import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDebitNoteDto } from './dto/create-debit-note.dto';
import { UpdateDebitNoteDto } from './dto/update-debit-note.dto';
import { QueryDebitNotesDto } from './dto/query-debit-notes.dto';
import { ApplyDebitNoteDto } from './dto/apply-debit-note.dto';
import { RefundDebitNoteDto } from './dto/refund-debit-note.dto';
import { DEBIT_NOTE_STATUS_INFO } from './constants/debit-note-statuses.constant';
import { createAutoJournalEntry } from '../shared/auto-journal-entry.helper';

@Injectable()
export class DebitNotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // NUMBER GENERATION
  // ============================================================================
  async getNextDebitNoteNumber(companyId: string): Promise<string> {
    const count = await this.prisma.debitNote.count({ where: { companyId } });
    return `DN-${String(count + 1).padStart(4, '0')}`;
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================
  async create(dto: CreateDebitNoteDto, companyId: string) {
    // Validate vendor exists and belongs to company
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, companyId, isActive: true },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    // Validate bill if provided
    if (dto.billId) {
      const bill = await this.prisma.bill.findFirst({
        where: { id: dto.billId, companyId, vendorId: dto.vendorId },
      });
      if (!bill) {
        throw new NotFoundException('Bill not found or does not belong to this vendor');
      }
    }

    // Validate refund account if provided
    if (dto.refundAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.refundAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Refund account not found');
      }
    }

    // Validate product IDs
    if (dto.lineItems.some((li) => li.productId)) {
      const productIds = dto.lineItems.filter((li) => li.productId).map((li) => li.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds as string[] }, companyId, isActive: true },
      });
      if (products.length !== new Set(productIds).size) {
        throw new NotFoundException('One or more products not found');
      }
    }

    // Validate expense account IDs on line items
    if (dto.lineItems.some((li) => li.expenseAccountId)) {
      const accountIds = dto.lineItems.filter((li) => li.expenseAccountId).map((li) => li.expenseAccountId);
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds as string[] }, companyId, isActive: true },
      });
      if (accounts.length !== new Set(accountIds).size) {
        throw new NotFoundException('One or more line item expense accounts not found');
      }
    }

    // Generate debit note number
    const debitNoteNumber = dto.debitNoteNumber || (await this.getNextDebitNoteNumber(companyId));

    // Check for duplicate number
    const existing = await this.prisma.debitNote.findFirst({
      where: { companyId, debitNoteNumber },
    });
    if (existing) {
      throw new ConflictException(`Debit note number ${debitNoteNumber} already exists`);
    }

    // Calculate line item amounts
    const lineItemsData = dto.lineItems.map((li, index) => {
      const baseAmount = li.quantity * li.unitPrice;
      const discountAmount = baseAmount * ((li.discountPercent || 0) / 100);
      const afterDiscount = baseAmount - discountAmount;
      const taxAmount = afterDiscount * ((li.taxPercent || 0) / 100);
      const amount = afterDiscount + taxAmount;

      return {
        productId: li.productId || null,
        expenseAccountId: li.expenseAccountId || null,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unitPrice,
        discountPercent: li.discountPercent || 0,
        taxPercent: li.taxPercent || 0,
        amount,
        sortOrder: li.sortOrder ?? index,
      };
    });

    // Calculate totals
    const subtotal = lineItemsData.reduce((sum, li) => {
      const base = li.quantity * li.unitPrice;
      const disc = base * (li.discountPercent / 100);
      return sum + (base - disc);
    }, 0);

    const lineTaxTotal = lineItemsData.reduce((sum, li) => {
      const base = li.quantity * li.unitPrice;
      const disc = base * (li.discountPercent / 100);
      const afterDisc = base - disc;
      return sum + afterDisc * (li.taxPercent / 100);
    }, 0);

    // Document-level discount
    let discountAmount = 0;
    if (dto.discountType && dto.discountValue) {
      if (dto.discountType === 'PERCENTAGE') {
        discountAmount = subtotal * (dto.discountValue / 100);
      } else {
        discountAmount = dto.discountValue;
      }
    }

    const totalAmount = subtotal - discountAmount + lineTaxTotal;

    // Create debit note with line items
    const debitNote = await this.prisma.debitNote.create({
      data: {
        companyId,
        vendorId: dto.vendorId,
        billId: dto.billId || null,
        debitNoteNumber,
        referenceNumber: dto.referenceNumber || null,
        debitNoteDate: new Date(dto.debitNoteDate),
        subtotal,
        discountType: dto.discountType as any || null,
        discountValue: dto.discountValue || null,
        discountAmount,
        taxAmount: lineTaxTotal,
        totalAmount,
        amountApplied: 0,
        amountRefunded: 0,
        remainingCredit: totalAmount,
        refundAccountId: dto.refundAccountId || null,
        reason: dto.reason || null,
        notes: dto.notes || null,
      },
    });

    // Create line items
    await this.prisma.debitNoteLineItem.createMany({
      data: lineItemsData.map((li) => ({
        debitNoteId: debitNote.id,
        ...li,
      })),
    });

    return this.findOne(debitNote.id, companyId);
  }

  async findAll(companyId: string, query: QueryDebitNotesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = { companyId, isActive: true };

    if (query.status) {
      where.status = query.status;
    }
    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }
    if (query.billId) {
      where.billId = query.billId;
    }
    if (query.dateFrom || query.dateTo) {
      where.debitNoteDate = {};
      if (query.dateFrom) where.debitNoteDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.debitNoteDate.lte = new Date(query.dateTo);
    }
    if (query.search) {
      where.OR = [
        { debitNoteNumber: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { vendor: { displayName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [debitNotes, total] = await Promise.all([
      this.prisma.debitNote.findMany({
        where,
        include: this.getListInclude(),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.debitNote.count({ where }),
    ]);

    return {
      data: debitNotes.map((dn) => this.formatDebitNoteListItem(dn)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, companyId: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
      include: this.getFullInclude(),
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    return this.formatDebitNote(debitNote);
  }

  async update(id: string, dto: UpdateDebitNoteDto, companyId: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    if (debitNote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft debit notes can be updated');
    }

    // Validate vendor if changing
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, companyId, isActive: true },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found');
      }
    }

    // Validate bill if changing
    if (dto.billId) {
      const venId = dto.vendorId || debitNote.vendorId;
      const bill = await this.prisma.bill.findFirst({
        where: { id: dto.billId, companyId, vendorId: venId },
      });
      if (!bill) {
        throw new NotFoundException('Bill not found or does not belong to this vendor');
      }
    }

    const updateData: any = {};

    if (dto.vendorId !== undefined) updateData.vendorId = dto.vendorId;
    if (dto.billId !== undefined) updateData.billId = dto.billId;
    if (dto.referenceNumber !== undefined) updateData.referenceNumber = dto.referenceNumber;
    if (dto.debitNoteDate !== undefined) updateData.debitNoteDate = new Date(dto.debitNoteDate);
    if (dto.refundAccountId !== undefined) updateData.refundAccountId = dto.refundAccountId;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // If line items or discount changed, recalculate
    if (dto.lineItems || dto.discountType !== undefined || dto.discountValue !== undefined) {
      const lineItems = dto.lineItems || [];
      const discType = dto.discountType ?? (debitNote.discountType as any);
      const discValue = dto.discountValue ?? Number(debitNote.discountValue || 0);

      if (dto.lineItems) {
        const lineItemsData = lineItems.map((li, index) => {
          const baseAmount = li.quantity * li.unitPrice;
          const discountAmt = baseAmount * ((li.discountPercent || 0) / 100);
          const afterDiscount = baseAmount - discountAmt;
          const taxAmt = afterDiscount * ((li.taxPercent || 0) / 100);
          const amount = afterDiscount + taxAmt;

          return {
            debitNoteId: id,
            productId: li.productId || null,
            expenseAccountId: li.expenseAccountId || null,
            description: li.description,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            discountPercent: li.discountPercent || 0,
            taxPercent: li.taxPercent || 0,
            amount,
            sortOrder: li.sortOrder ?? index,
          };
        });

        const subtotal = lineItemsData.reduce((sum, li) => {
          const base = li.quantity * li.unitPrice;
          const disc = base * (li.discountPercent / 100);
          return sum + (base - disc);
        }, 0);

        const lineTaxTotal = lineItemsData.reduce((sum, li) => {
          const base = li.quantity * li.unitPrice;
          const disc = base * (li.discountPercent / 100);
          const afterDisc = base - disc;
          return sum + afterDisc * (li.taxPercent / 100);
        }, 0);

        let discountAmount = 0;
        if (discType && discValue) {
          if (discType === 'PERCENTAGE') {
            discountAmount = subtotal * (discValue / 100);
          } else {
            discountAmount = discValue;
          }
        }

        const totalAmount = subtotal - discountAmount + lineTaxTotal;

        await this.prisma.$transaction(async (tx) => {
          await tx.debitNoteLineItem.deleteMany({ where: { debitNoteId: id } });
          await tx.debitNoteLineItem.createMany({ data: lineItemsData });
          await tx.debitNote.update({
            where: { id },
            data: {
              ...updateData,
              discountType: discType,
              discountValue: discValue,
              subtotal,
              discountAmount,
              taxAmount: lineTaxTotal,
              totalAmount,
              remainingCredit: totalAmount,
            },
          });
        });

        return this.findOne(id, companyId);
      }
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.debitNote.update({
        where: { id },
        data: updateData,
      });
    }

    return this.findOne(id, companyId);
  }

  async delete(id: string, companyId: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    if (debitNote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft debit notes can be deleted');
    }

    await this.prisma.debitNote.delete({ where: { id } });

    return { message: `Debit note ${debitNote.debitNoteNumber} deleted successfully` };
  }

  // ============================================================================
  // LIFECYCLE OPERATIONS
  // ============================================================================

  async open(id: string, companyId: string, userId: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
      include: { lineItems: true },
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    if (debitNote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft debit notes can be opened');
    }

    if (debitNote.lineItems.length === 0) {
      throw new BadRequestException('Debit note must have at least one line item');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.debitNote.update({
        where: { id },
        data: {
          status: 'OPEN',
          openedAt: new Date(),
        },
      });

      // Auto-JE: Debit AP, Credit Expense/COGS (per-line)
      const creditLines: any[] = [];
      for (const lineItem of debitNote.lineItems) {
        const lineAmount = Number(lineItem.amount);
        if (lineAmount <= 0) continue;

        if (lineItem.expenseAccountId) {
          creditLines.push({
            accountId: lineItem.expenseAccountId,
            debit: 0,
            credit: lineAmount,
            description: `${lineItem.description} - ${debitNote.debitNoteNumber}`,
          });
        } else {
          creditLines.push({
            accountType: 'Cost of Goods Sold',
            debit: 0,
            credit: lineAmount,
            description: `${lineItem.description} - ${debitNote.debitNoteNumber}`,
          });
        }
      }

      await createAutoJournalEntry(tx, {
        companyId,
        userId,
        entryDate: new Date(),
        description: `Debit note ${debitNote.debitNoteNumber} issued`,
        sourceType: 'DEBIT_NOTE',
        sourceId: debitNote.id,
        lines: [
          {
            accountType: 'Accounts Payable',
            debit: Number(debitNote.totalAmount),
            credit: 0,
            description: `AP reduction - ${debitNote.debitNoteNumber}`,
          },
          ...creditLines,
        ],
      });
    });

    return this.findOne(id, companyId);
  }

  async apply(id: string, dto: ApplyDebitNoteDto, companyId: string, userId: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    if (debitNote.status !== 'OPEN' && debitNote.status !== 'PARTIALLY_APPLIED') {
      throw new BadRequestException('Debit note must be OPEN or PARTIALLY_APPLIED to apply');
    }

    const totalApplyAmount = dto.applications.reduce((sum, app) => sum + app.amount, 0);
    const remaining = Number(debitNote.remainingCredit);

    if (totalApplyAmount > remaining + 0.01) {
      throw new BadRequestException(
        `Total application amount ($${totalApplyAmount.toFixed(2)}) exceeds remaining credit ($${remaining.toFixed(2)})`,
      );
    }

    // Validate each bill
    for (const app of dto.applications) {
      const bill = await this.prisma.bill.findFirst({
        where: {
          id: app.billId,
          companyId,
          vendorId: debitNote.vendorId,
        },
      });

      if (!bill) {
        throw new NotFoundException(`Bill ${app.billId} not found or does not belong to this vendor`);
      }

      if (!['RECEIVED', 'PARTIALLY_PAID', 'OVERDUE'].includes(bill.status)) {
        throw new BadRequestException(`Bill ${bill.billNumber} is not in a payable status (${bill.status})`);
      }

      const billDue = Number(bill.amountDue);
      if (app.amount > billDue + 0.01) {
        throw new BadRequestException(
          `Application amount ($${app.amount.toFixed(2)}) exceeds bill ${bill.billNumber} amount due ($${billDue.toFixed(2)})`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let totalApplied = 0;

      for (const app of dto.applications) {
        await tx.debitNoteApplication.create({
          data: {
            debitNoteId: id,
            billId: app.billId,
            amount: app.amount,
          },
        });

        // Update bill
        const bill = await tx.bill.findUniqueOrThrow({ where: { id: app.billId } });
        const newAmountPaid = Number(bill.amountPaid) + app.amount;
        const newAmountDue = Number(bill.totalAmount) - newAmountPaid;
        const newStatus = newAmountDue <= 0.01 ? 'PAID' : (bill.status === 'RECEIVED' || bill.status === 'OVERDUE' ? 'PARTIALLY_PAID' : bill.status);

        await tx.bill.update({
          where: { id: app.billId },
          data: {
            amountPaid: newAmountPaid,
            amountDue: Math.max(newAmountDue, 0),
            status: newStatus,
            ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
          },
        });

        // Update vendor balance
        await tx.vendor.update({
          where: { id: debitNote.vendorId },
          data: {
            currentBalance: { decrement: app.amount },
          },
        });

        totalApplied += app.amount;
      }

      // Update debit note
      const newAmountApplied = Number(debitNote.amountApplied) + totalApplied;
      const newRemaining = Number(debitNote.totalAmount) - newAmountApplied - Number(debitNote.amountRefunded);
      const newStatus = newRemaining <= 0.01 ? 'APPLIED' : 'PARTIALLY_APPLIED';

      await tx.debitNote.update({
        where: { id },
        data: {
          amountApplied: newAmountApplied,
          remainingCredit: Math.max(newRemaining, 0),
          status: newStatus,
        },
      });

      // No auto-JE on apply — AP was already reduced when the debit note was opened
    });

    return this.findOne(id, companyId);
  }

  async refund(id: string, dto: RefundDebitNoteDto, companyId: string, userId: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    if (debitNote.status !== 'OPEN' && debitNote.status !== 'PARTIALLY_APPLIED') {
      throw new BadRequestException('Debit note must be OPEN or PARTIALLY_APPLIED to receive refund');
    }

    const remaining = Number(debitNote.remainingCredit);
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(
        `Refund amount ($${dto.amount.toFixed(2)}) exceeds remaining credit ($${remaining.toFixed(2)})`,
      );
    }

    if (dto.refundAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.refundAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Refund account not found');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const newAmountRefunded = Number(debitNote.amountRefunded) + dto.amount;
      const newRemaining = Number(debitNote.totalAmount) - Number(debitNote.amountApplied) - newAmountRefunded;
      const newStatus = newRemaining <= 0.01 ? 'APPLIED' : 'PARTIALLY_APPLIED';

      await tx.debitNote.update({
        where: { id },
        data: {
          amountRefunded: newAmountRefunded,
          remainingCredit: Math.max(newRemaining, 0),
          status: newStatus,
        },
      });

      // Auto-JE: Debit Bank (cash coming in), Credit AP
      const refundAcctId = dto.refundAccountId || debitNote.refundAccountId;

      await createAutoJournalEntry(tx, {
        companyId,
        userId,
        entryDate: new Date(dto.refundDate),
        description: `Vendor refund for debit note ${debitNote.debitNoteNumber}`,
        sourceType: 'DEBIT_NOTE',
        sourceId: debitNote.id,
        lines: [
          {
            ...(refundAcctId ? { accountId: refundAcctId } : { accountType: 'Bank' }),
            debit: dto.amount,
            credit: 0,
            description: `Bank - vendor refund ${debitNote.debitNoteNumber}`,
          },
          {
            accountType: 'Accounts Payable',
            debit: 0,
            credit: dto.amount,
            description: `AP - vendor refund ${debitNote.debitNoteNumber}`,
          },
        ],
      });
    });

    return this.findOne(id, companyId);
  }

  async voidDebitNote(id: string, companyId: string, userId: string, reason?: string) {
    const debitNote = await this.prisma.debitNote.findFirst({
      where: { id, companyId },
      include: { lineItems: true },
    });

    if (!debitNote) {
      throw new NotFoundException('Debit note not found');
    }

    if (debitNote.status === 'DRAFT') {
      throw new BadRequestException('Draft debit notes should be deleted, not voided');
    }

    if (debitNote.status === 'APPLIED') {
      throw new BadRequestException('Fully applied debit notes cannot be voided');
    }

    if (debitNote.status === 'VOID') {
      throw new BadRequestException('Debit note is already voided');
    }

    const remainingCredit = Number(debitNote.remainingCredit);

    await this.prisma.$transaction(async (tx) => {
      await tx.debitNote.update({
        where: { id },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: reason || null,
        },
      });

      // Reversal auto-JE for remaining unused credit
      if (remainingCredit > 0) {
        const totalAmount = Number(debitNote.totalAmount);
        const ratio = totalAmount > 0 ? remainingCredit / totalAmount : 0;

        const debitLines: any[] = [];
        for (const lineItem of debitNote.lineItems) {
          const lineAmount = Number(lineItem.amount) * ratio;
          if (lineAmount <= 0) continue;

          if (lineItem.expenseAccountId) {
            debitLines.push({
              accountId: lineItem.expenseAccountId,
              debit: lineAmount,
              credit: 0,
              description: `Void reversal - ${lineItem.description}`,
            });
          } else {
            debitLines.push({
              accountType: 'Cost of Goods Sold',
              debit: lineAmount,
              credit: 0,
              description: `Void reversal - ${lineItem.description}`,
            });
          }
        }

        await createAutoJournalEntry(tx, {
          companyId,
          userId,
          entryDate: new Date(),
          description: `Void debit note ${debitNote.debitNoteNumber}`,
          sourceType: 'DEBIT_NOTE',
          sourceId: debitNote.id,
          lines: [
            ...debitLines,
            {
              accountType: 'Accounts Payable',
              debit: 0,
              credit: remainingCredit,
              description: `AP restored - void ${debitNote.debitNoteNumber}`,
            },
          ],
        });
      }
    });

    return this.findOne(id, companyId);
  }

  // ============================================================================
  // SUMMARY & STATUSES
  // ============================================================================

  async getSummary(companyId: string) {
    const [draft, open, partiallyApplied, applied, voided] = await Promise.all([
      this.prisma.debitNote.aggregate({
        where: { companyId, status: 'DRAFT', isActive: true },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.debitNote.aggregate({
        where: { companyId, status: 'OPEN', isActive: true },
        _count: true,
        _sum: { totalAmount: true, remainingCredit: true },
      }),
      this.prisma.debitNote.aggregate({
        where: { companyId, status: 'PARTIALLY_APPLIED', isActive: true },
        _count: true,
        _sum: { totalAmount: true, remainingCredit: true },
      }),
      this.prisma.debitNote.aggregate({
        where: { companyId, status: 'APPLIED', isActive: true },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.debitNote.aggregate({
        where: { companyId, status: 'VOID', isActive: true },
        _count: true,
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      draft: {
        count: draft._count,
        totalAmount: Number(draft._sum.totalAmount || 0),
      },
      open: {
        count: open._count,
        totalAmount: Number(open._sum.totalAmount || 0),
        remainingCredit: Number(open._sum.remainingCredit || 0),
      },
      partiallyApplied: {
        count: partiallyApplied._count,
        totalAmount: Number(partiallyApplied._sum.totalAmount || 0),
        remainingCredit: Number(partiallyApplied._sum.remainingCredit || 0),
      },
      applied: {
        count: applied._count,
        totalAmount: Number(applied._sum.totalAmount || 0),
      },
      void: {
        count: voided._count,
        totalAmount: Number(voided._sum.totalAmount || 0),
      },
      totalOutstandingCredit: Number(open._sum.remainingCredit || 0) + Number(partiallyApplied._sum.remainingCredit || 0),
    };
  }

  getStatuses() {
    return DEBIT_NOTE_STATUS_INFO;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getFullInclude() {
    return {
      vendor: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          companyName: true,
        },
      },
      bill: {
        select: {
          id: true,
          billNumber: true,
          status: true,
          totalAmount: true,
          amountDue: true,
        },
      },
      lineItems: {
        include: {
          product: {
            select: { id: true, name: true, sku: true },
          },
          expenseAccount: {
            select: { id: true, name: true, accountNumber: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      applications: {
        include: {
          bill: {
            select: {
              id: true,
              billNumber: true,
              status: true,
              totalAmount: true,
            },
          },
        },
        orderBy: { appliedAt: 'desc' as const },
      },
      refundAccount: {
        select: { id: true, name: true, accountNumber: true },
      },
    };
  }

  private getListInclude() {
    return {
      vendor: {
        select: { id: true, displayName: true, email: true },
      },
      bill: {
        select: { id: true, billNumber: true },
      },
      _count: {
        select: { lineItems: true, applications: true },
      },
    };
  }

  private formatDebitNote(dn: any) {
    return {
      id: dn.id,
      debitNoteNumber: dn.debitNoteNumber,
      referenceNumber: dn.referenceNumber,
      status: dn.status,
      statusInfo: DEBIT_NOTE_STATUS_INFO[dn.status] || null,
      debitNoteDate: dn.debitNoteDate,
      vendor: dn.vendor,
      bill: dn.bill,
      lineItems: dn.lineItems?.map((li: any) => ({
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
      })) || [],
      subtotal: Number(dn.subtotal),
      discountType: dn.discountType,
      discountValue: dn.discountValue ? Number(dn.discountValue) : null,
      discountAmount: Number(dn.discountAmount),
      taxAmount: Number(dn.taxAmount),
      totalAmount: Number(dn.totalAmount),
      amountApplied: Number(dn.amountApplied),
      amountRefunded: Number(dn.amountRefunded),
      remainingCredit: Number(dn.remainingCredit),
      refundAccount: dn.refundAccount,
      reason: dn.reason,
      notes: dn.notes,
      applications: dn.applications?.map((app: any) => ({
        id: app.id,
        bill: app.bill,
        amount: Number(app.amount),
        appliedAt: app.appliedAt,
      })) || [],
      openedAt: dn.openedAt,
      voidedAt: dn.voidedAt,
      voidReason: dn.voidReason,
      createdAt: dn.createdAt,
      updatedAt: dn.updatedAt,
    };
  }

  private formatDebitNoteListItem(dn: any) {
    return {
      id: dn.id,
      debitNoteNumber: dn.debitNoteNumber,
      referenceNumber: dn.referenceNumber,
      status: dn.status,
      statusInfo: DEBIT_NOTE_STATUS_INFO[dn.status] || null,
      debitNoteDate: dn.debitNoteDate,
      vendor: dn.vendor,
      bill: dn.bill,
      totalAmount: Number(dn.totalAmount),
      amountApplied: Number(dn.amountApplied),
      amountRefunded: Number(dn.amountRefunded),
      remainingCredit: Number(dn.remainingCredit),
      lineItemCount: dn._count?.lineItems || 0,
      applicationCount: dn._count?.applications || 0,
      createdAt: dn.createdAt,
    };
  }
}
