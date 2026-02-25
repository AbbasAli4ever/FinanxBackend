import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { UpdateCreditNoteDto } from './dto/update-credit-note.dto';
import { QueryCreditNotesDto } from './dto/query-credit-notes.dto';
import { ApplyCreditNoteDto } from './dto/apply-credit-note.dto';
import { RefundCreditNoteDto } from './dto/refund-credit-note.dto';
import { CREDIT_NOTE_STATUS_INFO } from './constants/credit-note-statuses.constant';
import { createAutoJournalEntry } from '../shared/auto-journal-entry.helper';

@Injectable()
export class CreditNotesService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================================================
  // NUMBER GENERATION
  // ============================================================================
  async getNextCreditNoteNumber(companyId: string): Promise<string> {
    const count = await this.prisma.creditNote.count({ where: { companyId } });
    return `CN-${String(count + 1).padStart(4, '0')}`;
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================
  async create(dto: CreateCreditNoteDto, companyId: string) {
    // Validate customer exists and belongs to company
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId, isActive: true },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Validate invoice if provided
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, companyId, customerId: dto.customerId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found or does not belong to this customer');
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

    // Validate account IDs on line items
    if (dto.lineItems.some((li) => li.accountId)) {
      const accountIds = dto.lineItems.filter((li) => li.accountId).map((li) => li.accountId);
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds as string[] }, companyId, isActive: true },
      });
      if (accounts.length !== new Set(accountIds).size) {
        throw new NotFoundException('One or more line item accounts not found');
      }
    }

    // Generate credit note number
    const creditNoteNumber = dto.creditNoteNumber || (await this.getNextCreditNoteNumber(companyId));

    // Check for duplicate number
    const existing = await this.prisma.creditNote.findFirst({
      where: { companyId, creditNoteNumber },
    });
    if (existing) {
      throw new ConflictException(`Credit note number ${creditNoteNumber} already exists`);
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
        accountId: li.accountId || null,
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

    // Invoice-level discount
    let discountAmount = 0;
    if (dto.discountType && dto.discountValue) {
      if (dto.discountType === 'PERCENTAGE') {
        discountAmount = subtotal * (dto.discountValue / 100);
      } else {
        discountAmount = dto.discountValue;
      }
    }

    const totalAmount = subtotal - discountAmount + lineTaxTotal;

    // Create credit note with line items
    const creditNote = await this.prisma.creditNote.create({
      data: {
        companyId,
        customerId: dto.customerId,
        invoiceId: dto.invoiceId || null,
        creditNoteNumber,
        referenceNumber: dto.referenceNumber || null,
        creditNoteDate: new Date(dto.creditNoteDate),
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
    await this.prisma.creditNoteLineItem.createMany({
      data: lineItemsData.map((li) => ({
        creditNoteId: creditNote.id,
        ...li,
      })),
    });

    return this.findOne(creditNote.id, companyId);
  }

  async findAll(companyId: string, query: QueryCreditNotesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const where: any = { companyId, isActive: true };

    if (query.status) {
      where.status = query.status;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.invoiceId) {
      where.invoiceId = query.invoiceId;
    }
    if (query.dateFrom || query.dateTo) {
      where.creditNoteDate = {};
      if (query.dateFrom) where.creditNoteDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.creditNoteDate.lte = new Date(query.dateTo);
    }
    if (query.search) {
      where.OR = [
        { creditNoteNumber: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { reason: { contains: query.search, mode: 'insensitive' } },
        { customer: { displayName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [creditNotes, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        include: this.getListInclude(),
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      data: creditNotes.map((cn) => this.formatCreditNoteListItem(cn)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, companyId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
      include: this.getFullInclude(),
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    return this.formatCreditNote(creditNote);
  }

  async update(id: string, dto: UpdateCreditNoteDto, companyId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft credit notes can be updated');
    }

    // Validate customer if changing
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException('Customer not found');
      }
    }

    // Validate invoice if changing
    if (dto.invoiceId) {
      const custId = dto.customerId || creditNote.customerId;
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, companyId, customerId: custId },
      });
      if (!invoice) {
        throw new NotFoundException('Invoice not found or does not belong to this customer');
      }
    }

    const updateData: any = {};

    if (dto.customerId !== undefined) updateData.customerId = dto.customerId;
    if (dto.invoiceId !== undefined) updateData.invoiceId = dto.invoiceId;
    if (dto.referenceNumber !== undefined) updateData.referenceNumber = dto.referenceNumber;
    if (dto.creditNoteDate !== undefined) updateData.creditNoteDate = new Date(dto.creditNoteDate);
    if (dto.refundAccountId !== undefined) updateData.refundAccountId = dto.refundAccountId;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    // If line items or discount changed, recalculate
    if (dto.lineItems || dto.discountType !== undefined || dto.discountValue !== undefined) {
      const lineItems = dto.lineItems || [];
      const discType = dto.discountType ?? (creditNote.discountType as any);
      const discValue = dto.discountValue ?? Number(creditNote.discountValue || 0);

      if (dto.lineItems) {
        const lineItemsData = lineItems.map((li, index) => {
          const baseAmount = li.quantity * li.unitPrice;
          const discountAmt = baseAmount * ((li.discountPercent || 0) / 100);
          const afterDiscount = baseAmount - discountAmt;
          const taxAmt = afterDiscount * ((li.taxPercent || 0) / 100);
          const amount = afterDiscount + taxAmt;

          return {
            creditNoteId: id,
            productId: li.productId || null,
            accountId: li.accountId || null,
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
          // Delete old line items
          await tx.creditNoteLineItem.deleteMany({ where: { creditNoteId: id } });

          // Create new line items
          await tx.creditNoteLineItem.createMany({ data: lineItemsData });

          // Update credit note
          await tx.creditNote.update({
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

    // Simple field update (no line items)
    if (Object.keys(updateData).length > 0) {
      await this.prisma.creditNote.update({
        where: { id },
        data: updateData,
      });
    }

    return this.findOne(id, companyId);
  }

  async delete(id: string, companyId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft credit notes can be deleted');
    }

    await this.prisma.creditNote.delete({ where: { id } });

    return { message: `Credit note ${creditNote.creditNoteNumber} deleted successfully` };
  }

  // ============================================================================
  // LIFECYCLE OPERATIONS
  // ============================================================================

  async open(id: string, companyId: string, userId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
      include: { lineItems: true },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status !== 'DRAFT') {
      throw new BadRequestException('Only draft credit notes can be opened');
    }

    if (creditNote.lineItems.length === 0) {
      throw new BadRequestException('Credit note must have at least one line item');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update status
      await tx.creditNote.update({
        where: { id },
        data: {
          status: 'OPEN',
          openedAt: new Date(),
        },
      });

      // Auto-JE: Debit Income (per-line), Credit AR
      const debitLines: any[] = [];
      for (const lineItem of creditNote.lineItems) {
        const lineAmount = Number(lineItem.amount);
        if (lineAmount <= 0) continue;

        if (lineItem.accountId) {
          debitLines.push({
            accountId: lineItem.accountId,
            debit: lineAmount,
            credit: 0,
            description: `${lineItem.description} - ${creditNote.creditNoteNumber}`,
          });
        } else {
          debitLines.push({
            accountType: 'Income',
            debit: lineAmount,
            credit: 0,
            description: `${lineItem.description} - ${creditNote.creditNoteNumber}`,
          });
        }
      }

      await createAutoJournalEntry(tx, {
        companyId,
        userId,
        entryDate: new Date(),
        description: `Credit note ${creditNote.creditNoteNumber} issued`,
        sourceType: 'CREDIT_NOTE',
        sourceId: creditNote.id,
        lines: [
          ...debitLines,
          {
            accountType: 'Accounts Receivable',
            debit: 0,
            credit: Number(creditNote.totalAmount),
            description: `AR reduction - ${creditNote.creditNoteNumber}`,
          },
        ],
      });
    });

    return this.findOne(id, companyId);
  }

  async apply(id: string, dto: ApplyCreditNoteDto, companyId: string, userId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status !== 'OPEN' && creditNote.status !== 'PARTIALLY_APPLIED') {
      throw new BadRequestException('Credit note must be OPEN or PARTIALLY_APPLIED to apply');
    }

    // Validate total application amount
    const totalApplyAmount = dto.applications.reduce((sum, app) => sum + app.amount, 0);
    const remaining = Number(creditNote.remainingCredit);

    if (totalApplyAmount > remaining + 0.01) {
      throw new BadRequestException(
        `Total application amount ($${totalApplyAmount.toFixed(2)}) exceeds remaining credit ($${remaining.toFixed(2)})`,
      );
    }

    // Validate each invoice
    for (const app of dto.applications) {
      const invoice = await this.prisma.invoice.findFirst({
        where: {
          id: app.invoiceId,
          companyId,
          customerId: creditNote.customerId,
        },
      });

      if (!invoice) {
        throw new NotFoundException(`Invoice ${app.invoiceId} not found or does not belong to this customer`);
      }

      if (!['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.status)) {
        throw new BadRequestException(`Invoice ${invoice.invoiceNumber} is not in a payable status (${invoice.status})`);
      }

      const invoiceDue = Number(invoice.amountDue);
      if (app.amount > invoiceDue + 0.01) {
        throw new BadRequestException(
          `Application amount ($${app.amount.toFixed(2)}) exceeds invoice ${invoice.invoiceNumber} amount due ($${invoiceDue.toFixed(2)})`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      let totalApplied = 0;

      for (const app of dto.applications) {
        // Create application record
        await tx.creditNoteApplication.create({
          data: {
            creditNoteId: id,
            invoiceId: app.invoiceId,
            amount: app.amount,
          },
        });

        // Update invoice
        const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: app.invoiceId } });
        const newAmountPaid = Number(invoice.amountPaid) + app.amount;
        const newAmountDue = Number(invoice.totalAmount) - newAmountPaid;
        const newStatus = newAmountDue <= 0.01 ? 'PAID' : (invoice.status === 'SENT' || invoice.status === 'OVERDUE' ? 'PARTIALLY_PAID' : invoice.status);

        await tx.invoice.update({
          where: { id: app.invoiceId },
          data: {
            amountPaid: newAmountPaid,
            amountDue: Math.max(newAmountDue, 0),
            status: newStatus,
            ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
          },
        });

        totalApplied += app.amount;
      }

      // Update credit note
      const newAmountApplied = Number(creditNote.amountApplied) + totalApplied;
      const newRemaining = Number(creditNote.totalAmount) - newAmountApplied - Number(creditNote.amountRefunded);
      const newStatus = newRemaining <= 0.01 ? 'APPLIED' : 'PARTIALLY_APPLIED';

      await tx.creditNote.update({
        where: { id },
        data: {
          amountApplied: newAmountApplied,
          remainingCredit: Math.max(newRemaining, 0),
          status: newStatus,
        },
      });

      // No auto-JE on apply — AR was already reduced when the credit note was opened
    });

    return this.findOne(id, companyId);
  }

  async refund(id: string, dto: RefundCreditNoteDto, companyId: string, userId: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status !== 'OPEN' && creditNote.status !== 'PARTIALLY_APPLIED') {
      throw new BadRequestException('Credit note must be OPEN or PARTIALLY_APPLIED to refund');
    }

    const remaining = Number(creditNote.remainingCredit);
    if (dto.amount > remaining + 0.01) {
      throw new BadRequestException(
        `Refund amount ($${dto.amount.toFixed(2)}) exceeds remaining credit ($${remaining.toFixed(2)})`,
      );
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

    await this.prisma.$transaction(async (tx) => {
      // Update credit note
      const newAmountRefunded = Number(creditNote.amountRefunded) + dto.amount;
      const newRemaining = Number(creditNote.totalAmount) - Number(creditNote.amountApplied) - newAmountRefunded;
      const newStatus = newRemaining <= 0.01 ? 'APPLIED' : 'PARTIALLY_APPLIED';

      await tx.creditNote.update({
        where: { id },
        data: {
          amountRefunded: newAmountRefunded,
          remainingCredit: Math.max(newRemaining, 0),
          status: newStatus,
        },
      });

      // Auto-JE: Debit AR, Credit Bank (cash going out to customer)
      const refundAcctId = dto.refundAccountId || creditNote.refundAccountId;

      await createAutoJournalEntry(tx, {
        companyId,
        userId,
        entryDate: new Date(dto.refundDate),
        description: `Refund for credit note ${creditNote.creditNoteNumber}`,
        sourceType: 'CREDIT_NOTE',
        sourceId: creditNote.id,
        lines: [
          {
            accountType: 'Accounts Receivable',
            debit: dto.amount,
            credit: 0,
            description: `AR - refund ${creditNote.creditNoteNumber}`,
          },
          {
            ...(refundAcctId ? { accountId: refundAcctId } : { accountType: 'Bank' }),
            debit: 0,
            credit: dto.amount,
            description: `Bank - refund ${creditNote.creditNoteNumber}`,
          },
        ],
      });
    });

    return this.findOne(id, companyId);
  }

  async voidCreditNote(id: string, companyId: string, userId: string, reason?: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, companyId },
      include: { lineItems: true },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit note not found');
    }

    if (creditNote.status === 'DRAFT') {
      throw new BadRequestException('Draft credit notes should be deleted, not voided');
    }

    if (creditNote.status === 'APPLIED') {
      throw new BadRequestException('Fully applied credit notes cannot be voided');
    }

    if (creditNote.status === 'VOID') {
      throw new BadRequestException('Credit note is already voided');
    }

    const remainingCredit = Number(creditNote.remainingCredit);

    await this.prisma.$transaction(async (tx) => {
      await tx.creditNote.update({
        where: { id },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: reason || null,
        },
      });

      // Reversal auto-JE for remaining unused credit
      if (remainingCredit > 0) {
        // Proportional reversal per line item
        const totalAmount = Number(creditNote.totalAmount);
        const ratio = totalAmount > 0 ? remainingCredit / totalAmount : 0;

        const creditLines: any[] = [];
        for (const lineItem of creditNote.lineItems) {
          const lineAmount = Number(lineItem.amount) * ratio;
          if (lineAmount <= 0) continue;

          if (lineItem.accountId) {
            creditLines.push({
              accountId: lineItem.accountId,
              debit: 0,
              credit: lineAmount,
              description: `Void reversal - ${lineItem.description}`,
            });
          } else {
            creditLines.push({
              accountType: 'Income',
              debit: 0,
              credit: lineAmount,
              description: `Void reversal - ${lineItem.description}`,
            });
          }
        }

        await createAutoJournalEntry(tx, {
          companyId,
          userId,
          entryDate: new Date(),
          description: `Void credit note ${creditNote.creditNoteNumber}`,
          sourceType: 'CREDIT_NOTE',
          sourceId: creditNote.id,
          lines: [
            {
              accountType: 'Accounts Receivable',
              debit: remainingCredit,
              credit: 0,
              description: `AR restored - void ${creditNote.creditNoteNumber}`,
            },
            ...creditLines,
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
      this.prisma.creditNote.aggregate({
        where: { companyId, status: 'DRAFT', isActive: true },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.creditNote.aggregate({
        where: { companyId, status: 'OPEN', isActive: true },
        _count: true,
        _sum: { totalAmount: true, remainingCredit: true },
      }),
      this.prisma.creditNote.aggregate({
        where: { companyId, status: 'PARTIALLY_APPLIED', isActive: true },
        _count: true,
        _sum: { totalAmount: true, remainingCredit: true },
      }),
      this.prisma.creditNote.aggregate({
        where: { companyId, status: 'APPLIED', isActive: true },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.creditNote.aggregate({
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
    return CREDIT_NOTE_STATUS_INFO;
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private getFullInclude() {
    return {
      customer: {
        select: {
          id: true,
          displayName: true,
          email: true,
          phone: true,
          companyName: true,
        },
      },
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
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
          account: {
            select: { id: true, name: true, accountNumber: true },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      applications: {
        include: {
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
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
      customer: {
        select: { id: true, displayName: true, email: true },
      },
      invoice: {
        select: { id: true, invoiceNumber: true },
      },
      _count: {
        select: { lineItems: true, applications: true },
      },
    };
  }

  private formatCreditNote(cn: any) {
    return {
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      referenceNumber: cn.referenceNumber,
      status: cn.status,
      statusInfo: CREDIT_NOTE_STATUS_INFO[cn.status] || null,
      creditNoteDate: cn.creditNoteDate,
      customer: cn.customer,
      invoice: cn.invoice,
      lineItems: cn.lineItems?.map((li: any) => ({
        id: li.id,
        product: li.product,
        account: li.account,
        description: li.description,
        quantity: Number(li.quantity),
        unitPrice: Number(li.unitPrice),
        discountPercent: Number(li.discountPercent),
        taxPercent: Number(li.taxPercent),
        amount: Number(li.amount),
        sortOrder: li.sortOrder,
      })) || [],
      subtotal: Number(cn.subtotal),
      discountType: cn.discountType,
      discountValue: cn.discountValue ? Number(cn.discountValue) : null,
      discountAmount: Number(cn.discountAmount),
      taxAmount: Number(cn.taxAmount),
      totalAmount: Number(cn.totalAmount),
      amountApplied: Number(cn.amountApplied),
      amountRefunded: Number(cn.amountRefunded),
      remainingCredit: Number(cn.remainingCredit),
      refundAccount: cn.refundAccount,
      reason: cn.reason,
      notes: cn.notes,
      applications: cn.applications?.map((app: any) => ({
        id: app.id,
        invoice: app.invoice,
        amount: Number(app.amount),
        appliedAt: app.appliedAt,
      })) || [],
      openedAt: cn.openedAt,
      voidedAt: cn.voidedAt,
      voidReason: cn.voidReason,
      createdAt: cn.createdAt,
      updatedAt: cn.updatedAt,
    };
  }

  private formatCreditNoteListItem(cn: any) {
    return {
      id: cn.id,
      creditNoteNumber: cn.creditNoteNumber,
      referenceNumber: cn.referenceNumber,
      status: cn.status,
      statusInfo: CREDIT_NOTE_STATUS_INFO[cn.status] || null,
      creditNoteDate: cn.creditNoteDate,
      customer: cn.customer,
      invoice: cn.invoice,
      totalAmount: Number(cn.totalAmount),
      amountApplied: Number(cn.amountApplied),
      amountRefunded: Number(cn.amountRefunded),
      remainingCredit: Number(cn.remainingCredit),
      lineItemCount: cn._count?.lineItems || 0,
      applicationCount: cn._count?.applications || 0,
      createdAt: cn.createdAt,
    };
  }
}
