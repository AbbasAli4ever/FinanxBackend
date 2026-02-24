import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expenses.dto';
import { EXPENSE_STATUS_INFO } from './constants/expense-statuses.constant';
import { RECURRING_FREQUENCY_INFO } from './constants/recurring-frequencies.constant';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // GET NEXT EXPENSE NUMBER
  // =========================================================================
  async getNextExpenseNumber(companyId: string): Promise<string> {
    const lastExpense = await this.prisma.expense.findFirst({
      where: { companyId },
      orderBy: { expenseNumber: 'desc' },
      select: { expenseNumber: true },
    });

    if (!lastExpense) {
      return 'EXP-0001';
    }

    const match = lastExpense.expenseNumber.match(/EXP-(\d+)/);
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1;
      return `EXP-${String(nextNum).padStart(4, '0')}`;
    }

    const count = await this.prisma.expense.count({ where: { companyId } });
    return `EXP-${String(count + 1).padStart(4, '0')}`;
  }

  // =========================================================================
  // CREATE EXPENSE (DRAFT)
  // =========================================================================
  async create(dto: CreateExpenseDto, companyId: string, userId: string) {
    // Validate expense account exists and is an expense-type account
    const expenseAccount = await this.prisma.account.findFirst({
      where: { id: dto.expenseAccountId, companyId, isActive: true },
    });
    if (!expenseAccount) {
      throw new NotFoundException('Expense account not found or inactive');
    }
    const validExpenseTypes = [
      'Expenses',
      'Cost of Goods Sold',
      'Other Expense',
    ];
    if (!validExpenseTypes.includes(expenseAccount.accountType)) {
      throw new BadRequestException(
        `Account "${expenseAccount.name}" is not an expense-type account. Must be: ${validExpenseTypes.join(', ')}`,
      );
    }

    // Validate vendor if provided
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, companyId, isActive: true },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found or inactive');
      }
    }

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId, isActive: true },
      });
      if (!category) {
        throw new NotFoundException('Category not found or inactive');
      }
    }

    // Validate payment account if provided
    if (dto.paymentAccountId) {
      const paymentAccount = await this.prisma.account.findFirst({
        where: { id: dto.paymentAccountId, companyId, isActive: true },
      });
      if (!paymentAccount) {
        throw new NotFoundException('Payment account not found or inactive');
      }
    }

    // Validate billable customer if provided
    if (dto.isBillable && dto.billableCustomerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.billableCustomerId, companyId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException('Billable customer not found or inactive');
      }
    }

    // Validate line item expense accounts if split
    if (dto.lineItems && dto.lineItems.length > 0) {
      const accountIds = dto.lineItems.map((li) => li.expenseAccountId);
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, companyId, isActive: true },
        select: { id: true, accountType: true, name: true },
      });
      const foundIds = new Set(accounts.map((a) => a.id));
      const missing = accountIds.filter((id) => !foundIds.has(id));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Expense account(s) not found or inactive: ${missing.join(', ')}`,
        );
      }
      // Validate they are expense-type accounts
      for (const acc of accounts) {
        if (!validExpenseTypes.includes(acc.accountType)) {
          throw new BadRequestException(
            `Account "${acc.name}" is not an expense-type account`,
          );
        }
      }
    }

    // Generate expense number
    const expenseNumber =
      dto.expenseNumber || (await this.getNextExpenseNumber(companyId));

    // Check for duplicate
    const existing = await this.prisma.expense.findUnique({
      where: {
        unique_company_expense_number: { companyId, expenseNumber },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Expense number "${expenseNumber}" already exists`,
      );
    }

    // Calculate amounts
    const { amount, taxAmount, totalAmount, lineItemsData } =
      this.calculateAmounts(dto);

    // Calculate markup if billable
    let markedUpAmount: number | null = null;
    if (dto.isBillable && dto.markupPercent) {
      markedUpAmount =
        Math.round(totalAmount * (1 + dto.markupPercent / 100) * 10000) / 10000;
    }

    // Calculate recurring dates
    let nextRecurringDate: Date | null = null;
    if (dto.isRecurring && dto.recurringFrequency) {
      nextRecurringDate = this.calculateNextRecurringDate(
        new Date(dto.expenseDate),
        dto.recurringFrequency,
      );
    }

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          companyId,
          expenseNumber,
          referenceNumber: dto.referenceNumber,
          description: dto.description,
          notes: dto.notes,
          status: 'DRAFT',
          expenseDate: new Date(dto.expenseDate),
          vendorId: dto.vendorId || null,
          categoryId: dto.categoryId || null,
          expenseAccountId: dto.expenseAccountId,
          paymentAccountId: dto.paymentAccountId || null,
          paymentMethod: (dto.paymentMethod as any) || null,
          amount,
          taxPercent: dto.taxPercent || 0,
          taxAmount,
          totalAmount,
          isTaxDeductible: dto.isTaxDeductible || false,
          isBillable: dto.isBillable || false,
          billableCustomerId: dto.billableCustomerId || null,
          markupPercent: dto.markupPercent || null,
          markedUpAmount,
          isReimbursable: dto.isReimbursable || false,
          isMileage: dto.isMileage || false,
          mileageDistance: dto.mileageDistance || null,
          mileageRate: dto.mileageRate || null,
          receiptUrl: dto.receiptUrl || null,
          receiptFileName: dto.receiptFileName || null,
          isRecurring: dto.isRecurring || false,
          recurringFrequency: (dto.recurringFrequency as any) || null,
          nextRecurringDate,
          recurringEndDate: dto.recurringEndDate
            ? new Date(dto.recurringEndDate)
            : null,
          createdById: userId,
        },
      });

      // Create line items separately (avoids Prisma XOR type conflict)
      if (lineItemsData.length > 0) {
        await tx.expenseLineItem.createMany({
          data: lineItemsData.map((li) => ({
            ...li,
            expenseId: created.id,
          })),
        });
      }

      return tx.expense.findUnique({
        where: { id: created.id },
        include: this.getFullInclude(),
      });
    });

    return this.formatExpense(expense);
  }

  // =========================================================================
  // FIND ALL EXPENSES (LIST)
  // =========================================================================
  async findAll(companyId: string, query: QueryExpensesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId, isActive: true };

    if (query.status) {
      where.status = query.status;
    }
    if (query.vendorId) {
      where.vendorId = query.vendorId;
    }
    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.expenseAccountId) {
      where.expenseAccountId = query.expenseAccountId;
    }
    if (query.isBillable) {
      where.isBillable = query.isBillable === 'true';
    }
    if (query.isReimbursable) {
      where.isReimbursable = query.isReimbursable === 'true';
    }
    if (query.isMileage) {
      where.isMileage = query.isMileage === 'true';
    }

    // Date range
    if (query.dateFrom || query.dateTo) {
      where.expenseDate = {};
      if (query.dateFrom) {
        where.expenseDate.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.expenseDate.lte = new Date(query.dateTo);
      }
    }

    // Amount range
    if (query.amountMin !== undefined || query.amountMax !== undefined) {
      where.totalAmount = {};
      if (query.amountMin !== undefined) {
        where.totalAmount.gte = query.amountMin;
      }
      if (query.amountMax !== undefined) {
        where.totalAmount.lte = query.amountMax;
      }
    }

    // Search
    if (query.search) {
      where.OR = [
        { expenseNumber: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        {
          vendor: {
            displayName: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    // Sort
    const sortBy = query.sortBy || 'expenseDate';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy = { [sortBy]: sortOrder };

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          vendor: {
            select: { id: true, displayName: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          expenseAccount: {
            select: { id: true, name: true, accountType: true },
          },
          billableCustomer: {
            select: { id: true, displayName: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          _count: { select: { lineItems: true } },
        },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      items: expenses.map((e) => this.formatExpenseListItem(e)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =========================================================================
  // FIND ONE EXPENSE
  // =========================================================================
  async findOne(id: string, companyId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
      include: this.getFullInclude(),
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.formatExpense(expense);
  }

  // =========================================================================
  // UPDATE EXPENSE (DRAFT/REJECTED only)
  // =========================================================================
  async update(id: string, dto: UpdateExpenseDto, companyId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'DRAFT' && expense.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only draft or rejected expenses can be edited. Approved or paid expenses cannot be modified.',
      );
    }

    // Validate expense account if changing
    if (dto.expenseAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.expenseAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Expense account not found or inactive');
      }
      const validTypes = ['Expenses', 'Cost of Goods Sold', 'Other Expense'];
      if (!validTypes.includes(account.accountType)) {
        throw new BadRequestException(
          `Account "${account.name}" is not an expense-type account`,
        );
      }
    }

    // Validate vendor if changing
    if (dto.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: { id: dto.vendorId, companyId, isActive: true },
      });
      if (!vendor) {
        throw new NotFoundException('Vendor not found or inactive');
      }
    }

    // Validate category if changing
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.categoryId, companyId, isActive: true },
      });
      if (!category) {
        throw new NotFoundException('Category not found or inactive');
      }
    }

    // Validate payment account if changing
    if (dto.paymentAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: dto.paymentAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Payment account not found or inactive');
      }
    }

    // Validate billable customer if changing
    if (dto.isBillable && dto.billableCustomerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.billableCustomerId, companyId, isActive: true },
      });
      if (!customer) {
        throw new NotFoundException('Billable customer not found or inactive');
      }
    }

    // Validate line item accounts if split
    if (dto.lineItems && dto.lineItems.length > 0) {
      const accountIds = dto.lineItems.map((li) => li.expenseAccountId);
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, companyId, isActive: true },
        select: { id: true, accountType: true, name: true },
      });
      const foundIds = new Set(accounts.map((a) => a.id));
      const missing = accountIds.filter((aid) => !foundIds.has(aid));
      if (missing.length > 0) {
        throw new NotFoundException(
          `Expense account(s) not found: ${missing.join(', ')}`,
        );
      }
    }

    // Build update data, merging with existing expense for recalc
    const mergedDto = {
      amount: dto.amount ?? Number(expense.amount),
      taxPercent: dto.taxPercent ?? Number(expense.taxPercent),
      isMileage:
        dto.isMileage !== undefined ? dto.isMileage : expense.isMileage,
      mileageDistance:
        dto.mileageDistance ?? (expense.mileageDistance ? Number(expense.mileageDistance) : undefined),
      mileageRate:
        dto.mileageRate ?? (expense.mileageRate ? Number(expense.mileageRate) : undefined),
      lineItems: dto.lineItems,
    };

    const { amount, taxAmount, totalAmount, lineItemsData } =
      this.calculateAmounts(mergedDto as any);

    // Recalculate markup
    const isBillable =
      dto.isBillable !== undefined ? dto.isBillable : expense.isBillable;
    const markupPercent =
      dto.markupPercent ?? (expense.markupPercent ? Number(expense.markupPercent) : null);
    let markedUpAmount: number | null = null;
    if (isBillable && markupPercent) {
      markedUpAmount =
        Math.round(totalAmount * (1 + markupPercent / 100) * 10000) / 10000;
    }

    // Recalculate recurring
    const isRecurring =
      dto.isRecurring !== undefined ? dto.isRecurring : expense.isRecurring;
    const recurringFrequency =
      dto.recurringFrequency || (expense.recurringFrequency as string | null);
    let nextRecurringDate = expense.nextRecurringDate;
    if (isRecurring && recurringFrequency) {
      const expenseDate = dto.expenseDate
        ? new Date(dto.expenseDate)
        : expense.expenseDate;
      nextRecurringDate = this.calculateNextRecurringDate(
        expenseDate,
        recurringFrequency,
      );
    } else if (!isRecurring) {
      nextRecurringDate = null;
    }

    // If editing a REJECTED expense, reset status to DRAFT
    const statusReset =
      expense.status === 'REJECTED'
        ? {
            status: 'DRAFT' as const,
            rejectedAt: null,
            rejectionReason: null,
          }
        : {};

    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete existing line items if new ones provided
      if (dto.lineItems) {
        await tx.expenseLineItem.deleteMany({
          where: { expenseId: id },
        });
      }

      const result = await tx.expense.update({
        where: { id },
        data: {
          ...statusReset,
          ...(dto.expenseDate && {
            expenseDate: new Date(dto.expenseDate),
          }),
          ...(dto.expenseAccountId && {
            expenseAccountId: dto.expenseAccountId,
          }),
          ...(dto.description !== undefined && {
            description: dto.description,
          }),
          ...(dto.referenceNumber !== undefined && {
            referenceNumber: dto.referenceNumber,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.vendorId !== undefined && { vendorId: dto.vendorId || null }),
          ...(dto.categoryId !== undefined && {
            categoryId: dto.categoryId || null,
          }),
          ...(dto.paymentAccountId !== undefined && {
            paymentAccountId: dto.paymentAccountId || null,
          }),
          ...(dto.paymentMethod !== undefined && {
            paymentMethod: (dto.paymentMethod as any) || null,
          }),
          amount,
          taxPercent: dto.taxPercent ?? Number(expense.taxPercent),
          taxAmount,
          totalAmount,
          ...(dto.isTaxDeductible !== undefined && {
            isTaxDeductible: dto.isTaxDeductible,
          }),
          ...(dto.isBillable !== undefined && { isBillable: dto.isBillable }),
          ...(dto.billableCustomerId !== undefined && {
            billableCustomerId: dto.billableCustomerId || null,
          }),
          markupPercent: markupPercent,
          markedUpAmount,
          ...(dto.isReimbursable !== undefined && {
            isReimbursable: dto.isReimbursable,
          }),
          ...(dto.isMileage !== undefined && { isMileage: dto.isMileage }),
          ...(dto.mileageDistance !== undefined && {
            mileageDistance: dto.mileageDistance,
          }),
          ...(dto.mileageRate !== undefined && {
            mileageRate: dto.mileageRate,
          }),
          ...(dto.receiptUrl !== undefined && { receiptUrl: dto.receiptUrl }),
          ...(dto.receiptFileName !== undefined && {
            receiptFileName: dto.receiptFileName,
          }),
          isRecurring,
          recurringFrequency: (recurringFrequency as any) || null,
          nextRecurringDate,
          ...(dto.recurringEndDate !== undefined && {
            recurringEndDate: dto.recurringEndDate
              ? new Date(dto.recurringEndDate)
              : null,
          }),
        },
        include: this.getFullInclude(),
      });

      // Create new line items separately (avoids Prisma XOR type conflict)
      if (dto.lineItems && lineItemsData.length > 0) {
        await tx.expenseLineItem.createMany({
          data: lineItemsData.map((li) => ({
            ...li,
            expenseId: id,
          })),
        });
        // Re-fetch to include new line items
        return tx.expense.findUnique({
          where: { id },
          include: this.getFullInclude(),
        });
      }

      return result;
    });

    return this.formatExpense(updated);
  }

  // =========================================================================
  // DELETE EXPENSE (DRAFT/REJECTED only)
  // =========================================================================
  async delete(id: string, companyId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'DRAFT' && expense.status !== 'REJECTED') {
      throw new BadRequestException(
        'Only draft or rejected expenses can be deleted. To remove an approved expense, void it instead.',
      );
    }

    await this.prisma.expense.delete({ where: { id } });

    return {
      message: `Expense ${expense.expenseNumber} has been deleted`,
    };
  }

  // =========================================================================
  // SUBMIT EXPENSE (DRAFT → PENDING_APPROVAL)
  // =========================================================================
  async submit(id: string, companyId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
      include: this.getFullInclude(),
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft expenses can be submitted for approval',
      );
    }

    if (Number(expense.totalAmount) <= 0) {
      throw new BadRequestException(
        'Expense must have an amount greater than 0 to submit',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        submittedAt: new Date(),
      },
      include: this.getFullInclude(),
    });

    return this.formatExpense(updated);
  }

  // =========================================================================
  // APPROVE EXPENSE (PENDING_APPROVAL → APPROVED)
  // =========================================================================
  async approve(id: string, companyId: string, userId: string) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Only pending approval expenses can be approved',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: userId,
      },
      include: this.getFullInclude(),
    });

    return this.formatExpense(updated);
  }

  // =========================================================================
  // REJECT EXPENSE (PENDING_APPROVAL → REJECTED)
  // =========================================================================
  async reject(
    id: string,
    companyId: string,
    reason?: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Only pending approval expenses can be rejected',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
        rejectionReason: reason || null,
      },
      include: this.getFullInclude(),
    });

    return this.formatExpense(updated);
  }

  // =========================================================================
  // MARK AS PAID (APPROVED → PAID/REIMBURSED)
  // =========================================================================
  async markAsPaid(
    id: string,
    companyId: string,
    body?: { paymentMethod?: string; paymentAccountId?: string },
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
      include: { lineItems: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.status !== 'APPROVED') {
      throw new BadRequestException(
        'Only approved expenses can be marked as paid',
      );
    }

    // Validate payment account if provided
    if (body?.paymentAccountId) {
      const account = await this.prisma.account.findFirst({
        where: { id: body.paymentAccountId, companyId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException('Payment account not found or inactive');
      }
    }

    const newStatus = expense.isReimbursable ? 'REIMBURSED' : 'PAID';

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.expense.update({
        where: { id },
        data: {
          status: newStatus,
          paidAt: new Date(),
          ...(expense.isReimbursable && {
            reimbursedAt: new Date(),
            reimbursedAmount: expense.totalAmount,
          }),
          ...(body?.paymentMethod && {
            paymentMethod: body.paymentMethod as any,
          }),
          ...(body?.paymentAccountId && {
            paymentAccountId: body.paymentAccountId,
          }),
        },
        include: this.getFullInclude(),
      });

      // Handle recurring: clone expense for next occurrence
      if (expense.isRecurring && expense.nextRecurringDate) {
        const nextDate = expense.nextRecurringDate;
        const frequency = expense.recurringFrequency as string;
        const newNextDate = this.calculateNextRecurringDate(nextDate, frequency);

        // Check if past end date
        const shouldContinueRecurring =
          !expense.recurringEndDate ||
          newNextDate <= expense.recurringEndDate;

        const cloned = await tx.expense.create({
          data: {
            companyId: expense.companyId,
            expenseNumber: await this.getNextExpenseNumber(companyId),
            description: expense.description,
            notes: expense.notes,
            referenceNumber: expense.referenceNumber,
            status: 'DRAFT',
            expenseDate: nextDate,
            vendorId: expense.vendorId,
            categoryId: expense.categoryId,
            expenseAccountId: expense.expenseAccountId,
            paymentAccountId: expense.paymentAccountId,
            paymentMethod: expense.paymentMethod,
            amount: expense.amount,
            taxPercent: expense.taxPercent,
            taxAmount: expense.taxAmount,
            totalAmount: expense.totalAmount,
            isTaxDeductible: expense.isTaxDeductible,
            isBillable: expense.isBillable,
            billableCustomerId: expense.billableCustomerId,
            markupPercent: expense.markupPercent,
            markedUpAmount: expense.markedUpAmount,
            isReimbursable: expense.isReimbursable,
            isMileage: expense.isMileage,
            mileageDistance: expense.mileageDistance,
            mileageRate: expense.mileageRate,
            receiptUrl: null,
            receiptFileName: null,
            isRecurring: shouldContinueRecurring,
            recurringFrequency: shouldContinueRecurring
              ? expense.recurringFrequency
              : null,
            nextRecurringDate: shouldContinueRecurring ? newNextDate : null,
            recurringEndDate: expense.recurringEndDate,
            createdById: expense.createdById,
          },
        });

        // Clone line items separately
        if (expense.lineItems.length > 0) {
          await tx.expenseLineItem.createMany({
            data: expense.lineItems.map((li) => ({
              expenseId: cloned.id,
              expenseAccountId: li.expenseAccountId,
              description: li.description,
              amount: li.amount,
              taxPercent: li.taxPercent,
              taxAmount: li.taxAmount,
              sortOrder: li.sortOrder,
            })),
          });
        }
      }

      return result;
    });

    return this.formatExpense(updated);
  }

  // =========================================================================
  // VOID EXPENSE
  // =========================================================================
  async voidExpense(
    id: string,
    companyId: string,
    reason?: string,
  ) {
    const expense = await this.prisma.expense.findFirst({
      where: { id, companyId, isActive: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const voidableStatuses = [
      'PENDING_APPROVAL',
      'APPROVED',
      'PAID',
      'REIMBURSED',
    ];

    if (!voidableStatuses.includes(expense.status)) {
      if (expense.status === 'DRAFT' || expense.status === 'REJECTED') {
        throw new BadRequestException(
          'Draft and rejected expenses should be deleted, not voided',
        );
      }
      throw new BadRequestException(
        'This expense cannot be voided',
      );
    }

    const updated = await this.prisma.expense.update({
      where: { id },
      data: {
        status: 'VOID',
        voidedAt: new Date(),
        voidReason: reason || null,
      },
      include: this.getFullInclude(),
    });

    return this.formatExpense(updated);
  }

  // =========================================================================
  // GET SUMMARY (Dashboard Stats)
  // =========================================================================
  async getSummary(companyId: string) {
    const [
      draftCount,
      pendingApproval,
      approved,
      rejectedCount,
      paid,
      reimbursed,
      voidCount,
      totalBillable,
      totalReimbursablePending,
    ] = await Promise.all([
      this.prisma.expense.count({
        where: { companyId, isActive: true, status: 'DRAFT' },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, isActive: true, status: 'PENDING_APPROVAL' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, isActive: true, status: 'APPROVED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.count({
        where: { companyId, isActive: true, status: 'REJECTED' },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, isActive: true, status: 'PAID' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: { companyId, isActive: true, status: 'REIMBURSED' },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.expense.count({
        where: { companyId, isActive: true, status: 'VOID' },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          isActive: true,
          isBillable: true,
          status: { in: ['PAID', 'REIMBURSED'] },
        },
        _sum: { markedUpAmount: true, totalAmount: true },
      }),
      this.prisma.expense.aggregate({
        where: {
          companyId,
          isActive: true,
          isReimbursable: true,
          status: { in: ['PENDING_APPROVAL', 'APPROVED'] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const paidAmount = Number(paid._sum.totalAmount || 0);
    const reimbursedAmount = Number(reimbursed._sum.totalAmount || 0);
    const pendingAmount = Number(pendingApproval._sum.totalAmount || 0);
    const approvedAmount = Number(approved._sum.totalAmount || 0);

    return {
      draft: { count: draftCount },
      pendingApproval: {
        count: pendingApproval._count,
        amount: pendingAmount,
      },
      approved: { count: approved._count, amount: approvedAmount },
      rejected: { count: rejectedCount },
      paid: { count: paid._count, amount: paidAmount },
      reimbursed: { count: reimbursed._count, amount: reimbursedAmount },
      void: { count: voidCount },
      totals: {
        totalExpensed: paidAmount + reimbursedAmount,
        totalPaid: paidAmount + reimbursedAmount,
        totalPending: pendingAmount + approvedAmount,
        totalBillable: Number(
          totalBillable._sum.markedUpAmount ||
            totalBillable._sum.totalAmount ||
            0,
        ),
        totalReimbursablePending: Number(
          totalReimbursablePending._sum.totalAmount || 0,
        ),
      },
    };
  }

  // =========================================================================
  // GET EXPENSE STATUSES
  // =========================================================================
  getExpenseStatuses() {
    return Object.entries(EXPENSE_STATUS_INFO).map(([value, info]) => ({
      value,
      ...info,
    }));
  }

  // =========================================================================
  // GET RECURRING FREQUENCIES
  // =========================================================================
  getRecurringFrequencies() {
    return Object.entries(RECURRING_FREQUENCY_INFO).map(([value, info]) => ({
      value,
      ...info,
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
        },
      },
      category: {
        select: { id: true, name: true, fullPath: true },
      },
      expenseAccount: {
        select: {
          id: true,
          name: true,
          accountNumber: true,
          accountType: true,
        },
      },
      paymentAccount: {
        select: {
          id: true,
          name: true,
          accountNumber: true,
          accountType: true,
        },
      },
      billableCustomer: {
        select: { id: true, displayName: true, email: true },
      },
      lineItems: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          expenseAccount: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              accountType: true,
            },
          },
        },
      },
      approvedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    };
  }

  private formatExpense(expense: any) {
    const statusInfo =
      EXPENSE_STATUS_INFO[expense.status as keyof typeof EXPENSE_STATUS_INFO];

    return {
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      referenceNumber: expense.referenceNumber,
      description: expense.description,
      notes: expense.notes,
      status: expense.status,
      statusInfo: {
        ...statusInfo,
      },
      expenseDate: expense.expenseDate,
      vendor: expense.vendor || null,
      category: expense.category || null,
      expenseAccount: expense.expenseAccount,
      paymentAccount: expense.paymentAccount || null,
      paymentMethod: expense.paymentMethod,
      amount: Number(expense.amount),
      taxPercent: Number(expense.taxPercent),
      taxAmount: Number(expense.taxAmount),
      totalAmount: Number(expense.totalAmount),
      isTaxDeductible: expense.isTaxDeductible,
      isBillable: expense.isBillable,
      billableCustomer: expense.billableCustomer || null,
      markupPercent: expense.markupPercent
        ? Number(expense.markupPercent)
        : null,
      markedUpAmount: expense.markedUpAmount
        ? Number(expense.markedUpAmount)
        : null,
      isReimbursable: expense.isReimbursable,
      reimbursedAt: expense.reimbursedAt,
      reimbursedAmount: expense.reimbursedAmount
        ? Number(expense.reimbursedAmount)
        : null,
      isMileage: expense.isMileage,
      mileageDistance: expense.mileageDistance
        ? Number(expense.mileageDistance)
        : null,
      mileageRate: expense.mileageRate
        ? Number(expense.mileageRate)
        : null,
      receiptUrl: expense.receiptUrl,
      receiptFileName: expense.receiptFileName,
      isRecurring: expense.isRecurring,
      recurringFrequency: expense.recurringFrequency,
      nextRecurringDate: expense.nextRecurringDate,
      recurringEndDate: expense.recurringEndDate,
      lineItems: expense.lineItems
        ? expense.lineItems.map((li: any) => ({
            id: li.id,
            expenseAccount: li.expenseAccount,
            description: li.description,
            amount: Number(li.amount),
            taxPercent: Number(li.taxPercent),
            taxAmount: Number(li.taxAmount),
            sortOrder: li.sortOrder,
          }))
        : [],
      submittedAt: expense.submittedAt,
      approvedAt: expense.approvedAt,
      approvedBy: expense.approvedBy || null,
      rejectedAt: expense.rejectedAt,
      rejectionReason: expense.rejectionReason,
      paidAt: expense.paidAt,
      voidedAt: expense.voidedAt,
      voidReason: expense.voidReason,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  private formatExpenseListItem(expense: any) {
    const statusInfo =
      EXPENSE_STATUS_INFO[expense.status as keyof typeof EXPENSE_STATUS_INFO];

    return {
      id: expense.id,
      expenseNumber: expense.expenseNumber,
      referenceNumber: expense.referenceNumber,
      description: expense.description,
      status: expense.status,
      statusInfo: { ...statusInfo },
      expenseDate: expense.expenseDate,
      vendor: expense.vendor || null,
      category: expense.category || null,
      expenseAccount: expense.expenseAccount,
      paymentMethod: expense.paymentMethod,
      amount: Number(expense.amount),
      taxAmount: Number(expense.taxAmount),
      totalAmount: Number(expense.totalAmount),
      isBillable: expense.isBillable,
      billableCustomer: expense.billableCustomer || null,
      isReimbursable: expense.isReimbursable,
      isMileage: expense.isMileage,
      isRecurring: expense.isRecurring,
      lineItemCount: expense._count?.lineItems || 0,
      createdBy: expense.createdBy,
      createdAt: expense.createdAt,
    };
  }

  private calculateAmounts(dto: any) {
    let amount: number;
    let taxPercent = dto.taxPercent || 0;
    let taxAmount: number;
    let totalAmount: number;
    const lineItemsData: any[] = [];

    if (dto.lineItems && dto.lineItems.length > 0) {
      // Split expense — calculate from line items
      amount = 0;
      taxAmount = 0;

      for (const li of dto.lineItems) {
        const liTaxPercent = li.taxPercent || 0;
        const liTaxAmount =
          Math.round(li.amount * (liTaxPercent / 100) * 10000) / 10000;

        amount += li.amount;
        taxAmount += liTaxAmount;

        lineItemsData.push({
          expenseAccountId: li.expenseAccountId,
          description: li.description,
          amount: li.amount,
          taxPercent: liTaxPercent,
          taxAmount: liTaxAmount,
          sortOrder: li.sortOrder ?? lineItemsData.length,
        });
      }

      amount = Math.round(amount * 10000) / 10000;
      taxAmount = Math.round(taxAmount * 10000) / 10000;
      totalAmount = Math.round((amount + taxAmount) * 10000) / 10000;
    } else if (dto.isMileage && dto.mileageDistance && dto.mileageRate) {
      // Mileage expense — auto-calculate
      amount =
        Math.round(dto.mileageDistance * dto.mileageRate * 10000) / 10000;
      taxAmount = Math.round(amount * (taxPercent / 100) * 10000) / 10000;
      totalAmount = Math.round((amount + taxAmount) * 10000) / 10000;
    } else {
      // Simple expense
      amount = dto.amount || 0;
      taxAmount = Math.round(amount * (taxPercent / 100) * 10000) / 10000;
      totalAmount = Math.round((amount + taxAmount) * 10000) / 10000;
    }

    return { amount, taxAmount, totalAmount, lineItemsData };
  }

  private calculateNextRecurringDate(
    currentDate: Date,
    frequency: string,
  ): Date {
    const next = new Date(currentDate);

    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'BIWEEKLY':
        next.setDate(next.getDate() + 14);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'QUARTERLY':
        next.setMonth(next.getMonth() + 3);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }

    return next;
  }
}
