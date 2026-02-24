import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto';
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto';
import { QueryJournalEntriesDto } from './dto/query-journal-entries.dto';
import { JOURNAL_ENTRY_STATUSES } from './constants/journal-entry-statuses.constant';
import { JOURNAL_ENTRY_TYPES } from './constants/journal-entry-types.constant';
import { Prisma } from '@prisma/client';

@Injectable()
export class JournalEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================================
  // STATIC DATA
  // =====================================================================

  getStatuses() {
    return JOURNAL_ENTRY_STATUSES;
  }

  getEntryTypes() {
    return JOURNAL_ENTRY_TYPES;
  }

  // =====================================================================
  // AUTO-NUMBERING
  // =====================================================================

  async getNextEntryNumber(companyId: string): Promise<string> {
    const lastEntry = await this.prisma.journalEntry.findFirst({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { entryNumber: true },
    });

    if (!lastEntry) {
      return 'JE-0001';
    }

    const match = lastEntry.entryNumber.match(/JE-(\d+)/);
    const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
    return `JE-${String(nextNum).padStart(4, '0')}`;
  }

  // =====================================================================
  // SUMMARY
  // =====================================================================

  async getSummary(companyId: string) {
    const [draftCount, postedAgg, voidCount, totalCount] = await Promise.all([
      this.prisma.journalEntry.count({
        where: { companyId, status: 'DRAFT' },
      }),
      this.prisma.journalEntry.aggregate({
        where: { companyId, status: 'POSTED' },
        _count: true,
        _sum: { totalDebit: true },
      }),
      this.prisma.journalEntry.count({
        where: { companyId, status: 'VOID' },
      }),
      this.prisma.journalEntry.count({
        where: { companyId },
      }),
    ]);

    return {
      draft: { count: draftCount },
      posted: {
        count: postedAgg._count,
        totalDebit: Number(postedAgg._sum.totalDebit || 0),
      },
      voided: { count: voidCount },
      totalEntries: totalCount,
    };
  }

  // =====================================================================
  // FULL INCLUDE
  // =====================================================================

  private getFullInclude() {
    return {
      lines: {
        include: {
          account: {
            select: {
              id: true,
              name: true,
              accountNumber: true,
              accountType: true,
              normalBalance: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' as const },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      postedBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      reversedFrom: {
        select: { id: true, entryNumber: true },
      },
    };
  }

  // =====================================================================
  // FORMAT HELPER
  // =====================================================================

  private formatEntry(entry: any) {
    return {
      ...entry,
      totalDebit: Number(entry.totalDebit),
      totalCredit: Number(entry.totalCredit),
      lines: entry.lines?.map((line: any) => ({
        ...line,
        debit: Number(line.debit),
        credit: Number(line.credit),
      })),
    };
  }

  // =====================================================================
  // VALIDATE LINES
  // =====================================================================

  private validateLines(lines: any[]) {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      const debit = line.debit || 0;
      const credit = line.credit || 0;

      if (debit > 0 && credit > 0) {
        throw new BadRequestException(
          'Each line must have either a debit or credit amount, not both',
        );
      }

      if (debit === 0 && credit === 0) {
        throw new BadRequestException(
          'Each line must have a debit or credit amount greater than zero',
        );
      }

      totalDebit += debit;
      totalCredit += credit;
    }

    return { totalDebit, totalCredit };
  }

  // =====================================================================
  // CREATE
  // =====================================================================

  async create(
    dto: CreateJournalEntryDto,
    companyId: string,
    userId: string,
  ) {
    // Validate lines
    const { totalDebit, totalCredit } = this.validateLines(dto.lines);

    // Verify all accounts exist and belong to company
    const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
    const accounts = await this.prisma.account.findMany({
      where: { id: { in: accountIds }, companyId, isActive: true },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException(
        'One or more account IDs are invalid or do not belong to your company',
      );
    }

    // Auto-number
    const entryNumber =
      dto.entryNumber || (await this.getNextEntryNumber(companyId));

    // Calculate next recurring date if recurring
    let nextRecurringDate: Date | null = null;
    if (dto.isRecurring && dto.recurringFrequency) {
      nextRecurringDate = this.calculateNextDate(
        new Date(dto.entryDate),
        dto.recurringFrequency,
      );
    }

    // Build entry data
    const entryData: any = {
      companyId,
      entryNumber,
      entryDate: new Date(dto.entryDate),
      referenceNumber: dto.referenceNumber || null,
      description: dto.description || null,
      notes: dto.notes || null,
      entryType: dto.entryType || 'STANDARD',
      status: 'DRAFT',
      totalDebit,
      totalCredit,
      isRecurring: dto.isRecurring || false,
      recurringFrequency: dto.recurringFrequency || null,
      nextRecurringDate,
      recurringEndDate: dto.recurringEndDate
        ? new Date(dto.recurringEndDate)
        : null,
      isAutoReversing: dto.isAutoReversing || false,
      reversalDate: dto.reversalDate ? new Date(dto.reversalDate) : null,
      sourceType: dto.sourceType || null,
      sourceId: dto.sourceId || null,
      createdById: userId,
    };

    // Create entry + lines in transaction (separate createMany to avoid XOR)
    const entry = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({ data: entryData });

      await tx.journalEntryLine.createMany({
        data: dto.lines.map((line, index) => ({
          journalEntryId: created.id,
          accountId: line.accountId,
          debit: line.debit || 0,
          credit: line.credit || 0,
          description: line.description || null,
          contactType: line.contactType || null,
          contactId: line.contactId || null,
          sortOrder: line.sortOrder ?? index,
        })),
      });

      return tx.journalEntry.findUnique({
        where: { id: created.id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEntry(entry);
  }

  // =====================================================================
  // FIND ALL (LIST)
  // =====================================================================

  async findAll(companyId: string, query: QueryJournalEntriesDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.entryType) where.entryType = query.entryType;

    if (query.dateFrom || query.dateTo) {
      where.entryDate = {};
      if (query.dateFrom) where.entryDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.entryDate.lte = new Date(query.dateTo);
    }

    if (query.amountMin !== undefined || query.amountMax !== undefined) {
      where.totalDebit = {};
      if (query.amountMin !== undefined) where.totalDebit.gte = query.amountMin;
      if (query.amountMax !== undefined) where.totalDebit.lte = query.amountMax;
    }

    // Filter by account (journal entries that have a line with this account)
    if (query.accountId) {
      where.lines = { some: { accountId: query.accountId } };
    }

    if (query.search) {
      where.OR = [
        { description: { contains: query.search, mode: 'insensitive' } },
        { entryNumber: { contains: query.search, mode: 'insensitive' } },
        { referenceNumber: { contains: query.search, mode: 'insensitive' } },
        { notes: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortBy = query.sortBy || 'entryDate';
    const sortOrder = query.sortOrder || 'desc';
    orderBy[sortBy] = sortOrder;

    const [items, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: this.getFullInclude(),
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      items: items.map((item) => this.formatEntry(item)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // =====================================================================
  // FIND ONE
  // =====================================================================

  async findOne(id: string, companyId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: this.getFullInclude(),
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    return this.formatEntry(entry);
  }

  // =====================================================================
  // UPDATE (DRAFT ONLY)
  // =====================================================================

  async update(
    id: string,
    dto: UpdateJournalEntryDto,
    companyId: string,
  ) {
    const existing = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Journal entry not found');
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only DRAFT journal entries can be edited',
      );
    }

    // Validate lines if provided
    let totalDebit: number | undefined;
    let totalCredit: number | undefined;
    if (dto.lines) {
      const validated = this.validateLines(dto.lines);
      totalDebit = validated.totalDebit;
      totalCredit = validated.totalCredit;

      // Verify accounts
      const accountIds = [...new Set(dto.lines.map((l) => l.accountId))];
      const accounts = await this.prisma.account.findMany({
        where: { id: { in: accountIds }, companyId, isActive: true },
        select: { id: true },
      });
      if (accounts.length !== accountIds.length) {
        throw new BadRequestException(
          'One or more account IDs are invalid or do not belong to your company',
        );
      }
    }

    // Calculate next recurring date if needed
    let nextRecurringDate: Date | null | undefined;
    if (dto.isRecurring !== undefined || dto.recurringFrequency !== undefined) {
      const isRecurring = dto.isRecurring ?? existing.isRecurring;
      const frequency = dto.recurringFrequency ?? (existing.recurringFrequency as string | null);
      const entryDate = dto.entryDate
        ? new Date(dto.entryDate)
        : existing.entryDate;

      if (isRecurring && frequency) {
        nextRecurringDate = this.calculateNextDate(entryDate, frequency);
      } else {
        nextRecurringDate = null;
      }
    }

    const updateData: any = {};
    if (dto.entryDate !== undefined) updateData.entryDate = new Date(dto.entryDate);
    if (dto.referenceNumber !== undefined) updateData.referenceNumber = dto.referenceNumber;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.entryType !== undefined) updateData.entryType = dto.entryType;
    if (dto.isRecurring !== undefined) updateData.isRecurring = dto.isRecurring;
    if (dto.recurringFrequency !== undefined) updateData.recurringFrequency = dto.recurringFrequency;
    if (dto.recurringEndDate !== undefined) updateData.recurringEndDate = new Date(dto.recurringEndDate);
    if (dto.isAutoReversing !== undefined) updateData.isAutoReversing = dto.isAutoReversing;
    if (dto.reversalDate !== undefined) updateData.reversalDate = new Date(dto.reversalDate);
    if (dto.sourceType !== undefined) updateData.sourceType = dto.sourceType;
    if (dto.sourceId !== undefined) updateData.sourceId = dto.sourceId;
    if (totalDebit !== undefined) updateData.totalDebit = totalDebit;
    if (totalCredit !== undefined) updateData.totalCredit = totalCredit;
    if (nextRecurringDate !== undefined) updateData.nextRecurringDate = nextRecurringDate;

    const entry = await this.prisma.$transaction(async (tx) => {
      // Delete existing lines and re-create if new lines provided
      if (dto.lines) {
        await tx.journalEntryLine.deleteMany({
          where: { journalEntryId: id },
        });

        await tx.journalEntryLine.createMany({
          data: dto.lines.map((line, index) => ({
            journalEntryId: id,
            accountId: line.accountId,
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description || null,
            contactType: line.contactType || null,
            contactId: line.contactId || null,
            sortOrder: line.sortOrder ?? index,
          })),
        });
      }

      await tx.journalEntry.update({
        where: { id },
        data: updateData,
      });

      return tx.journalEntry.findUnique({
        where: { id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEntry(entry);
  }

  // =====================================================================
  // DELETE (DRAFT ONLY)
  // =====================================================================

  async delete(id: string, companyId: string) {
    const existing = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
    });

    if (!existing) {
      throw new NotFoundException('Journal entry not found');
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only DRAFT journal entries can be deleted',
      );
    }

    await this.prisma.journalEntry.delete({ where: { id } });

    return { message: `Journal entry ${existing.entryNumber} deleted successfully` };
  }

  // =====================================================================
  // POST (DRAFT → POSTED) — Updates account balances
  // =====================================================================

  async post(id: string, companyId: string, userId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, normalBalance: true, currentBalance: true } },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only DRAFT journal entries can be posted',
      );
    }

    // Final balance validation
    const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Entry is not balanced. Total debits (${totalDebit.toFixed(2)}) must equal total credits (${totalCredit.toFixed(2)})`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Update account balances
      for (const line of entry.lines) {
        const debit = Number(line.debit);
        const credit = Number(line.credit);
        const normalBalance = line.account.normalBalance;

        // DEBIT normal balance: debit increases, credit decreases
        // CREDIT normal balance: credit increases, debit decreases
        let balanceChange: number;
        if (normalBalance === 'DEBIT') {
          balanceChange = debit - credit;
        } else {
          balanceChange = credit - debit;
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: {
            currentBalance: {
              increment: new Prisma.Decimal(balanceChange),
            },
          },
        });
      }

      // Update entry status
      await tx.journalEntry.update({
        where: { id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
          postedById: userId,
        },
      });

      // Auto-reversing: create a reversal DRAFT if isAutoReversing
      if (entry.isAutoReversing && entry.reversalDate) {
        const reversalNumber = await this.getNextEntryNumber(companyId);
        const reversalEntry = await tx.journalEntry.create({
          data: {
            companyId,
            entryNumber: reversalNumber,
            entryDate: entry.reversalDate,
            description: `Auto-reversal of ${entry.entryNumber}`,
            entryType: 'REVERSING',
            status: 'DRAFT',
            totalDebit,
            totalCredit,
            reversedFromId: entry.id,
            createdById: userId,
          },
        });

        // Create reversed lines (flip debit/credit)
        await tx.journalEntryLine.createMany({
          data: entry.lines.map((line, index) => ({
            journalEntryId: reversalEntry.id,
            accountId: line.accountId,
            debit: Number(line.credit),
            credit: Number(line.debit),
            description: line.description,
            contactType: line.contactType,
            contactId: line.contactId,
            sortOrder: index,
          })),
        });
      }

      // Recurring: create new DRAFT clone with next date
      if (entry.isRecurring && entry.recurringFrequency && entry.nextRecurringDate) {
        const endDate = entry.recurringEndDate;
        const nextDate = entry.nextRecurringDate;

        if (!endDate || nextDate <= endDate) {
          const cloneNumber = await this.getNextEntryNumber(companyId);
          const futureNextDate = this.calculateNextDate(
            nextDate,
            entry.recurringFrequency,
          );

          const clone = await tx.journalEntry.create({
            data: {
              companyId,
              entryNumber: cloneNumber,
              entryDate: nextDate,
              referenceNumber: entry.referenceNumber,
              description: entry.description,
              notes: entry.notes,
              entryType: entry.entryType,
              status: 'DRAFT',
              totalDebit,
              totalCredit,
              isRecurring: true,
              recurringFrequency: entry.recurringFrequency,
              nextRecurringDate: futureNextDate,
              recurringEndDate: entry.recurringEndDate,
              createdById: userId,
            },
          });

          await tx.journalEntryLine.createMany({
            data: entry.lines.map((line, index) => ({
              journalEntryId: clone.id,
              accountId: line.accountId,
              debit: Number(line.debit),
              credit: Number(line.credit),
              description: line.description,
              contactType: line.contactType,
              contactId: line.contactId,
              sortOrder: index,
            })),
          });
        }

        // Clear recurring fields on original (it's now posted)
        await tx.journalEntry.update({
          where: { id },
          data: { nextRecurringDate: null },
        });
      }

      return tx.journalEntry.findUnique({
        where: { id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEntry(result);
  }

  // =====================================================================
  // VOID (POSTED → VOID) — Reverses balance impact
  // =====================================================================

  async voidEntry(id: string, companyId: string, reason?: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, normalBalance: true } },
          },
        },
      },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status === 'VOID') {
      throw new BadRequestException('Journal entry is already voided');
    }

    if (entry.status !== 'POSTED') {
      throw new BadRequestException(
        'Only POSTED journal entries can be voided',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Reverse account balance changes
      for (const line of entry.lines) {
        const debit = Number(line.debit);
        const credit = Number(line.credit);
        const normalBalance = line.account.normalBalance;

        // Reverse: opposite of posting
        let balanceChange: number;
        if (normalBalance === 'DEBIT') {
          balanceChange = credit - debit; // reverse: credit increases, debit decreases
        } else {
          balanceChange = debit - credit;
        }

        await tx.account.update({
          where: { id: line.accountId },
          data: {
            currentBalance: {
              increment: new Prisma.Decimal(balanceChange),
            },
          },
        });
      }

      await tx.journalEntry.update({
        where: { id },
        data: {
          status: 'VOID',
          voidedAt: new Date(),
          voidReason: reason || null,
        },
      });

      return tx.journalEntry.findUnique({
        where: { id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEntry(result);
  }

  // =====================================================================
  // REVERSE (Create new DRAFT with flipped debit/credit)
  // =====================================================================

  async reverse(id: string, companyId: string, userId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== 'POSTED') {
      throw new BadRequestException(
        'Only POSTED journal entries can be reversed',
      );
    }

    const reversalNumber = await this.getNextEntryNumber(companyId);

    const reversal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber: reversalNumber,
          entryDate: new Date(),
          description: `Reversal of ${entry.entryNumber}`,
          entryType: 'REVERSING',
          status: 'DRAFT',
          totalDebit: Number(entry.totalCredit),
          totalCredit: Number(entry.totalDebit),
          reversedFromId: entry.id,
          createdById: userId,
        },
      });

      await tx.journalEntryLine.createMany({
        data: entry.lines.map((line, index) => ({
          journalEntryId: created.id,
          accountId: line.accountId,
          debit: Number(line.credit),
          credit: Number(line.debit),
          description: line.description,
          contactType: line.contactType,
          contactId: line.contactId,
          sortOrder: index,
        })),
      });

      return tx.journalEntry.findUnique({
        where: { id: created.id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEntry(reversal);
  }

  // =====================================================================
  // DUPLICATE (Clone as new DRAFT)
  // =====================================================================

  async duplicate(id: string, companyId: string, userId: string) {
    const entry = await this.prisma.journalEntry.findFirst({
      where: { id, companyId },
      include: { lines: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    const cloneNumber = await this.getNextEntryNumber(companyId);

    const clone = await this.prisma.$transaction(async (tx) => {
      const created = await tx.journalEntry.create({
        data: {
          companyId,
          entryNumber: cloneNumber,
          entryDate: new Date(),
          referenceNumber: entry.referenceNumber,
          description: entry.description,
          notes: entry.notes,
          entryType: entry.entryType === 'REVERSING' ? 'STANDARD' : entry.entryType,
          status: 'DRAFT',
          totalDebit: Number(entry.totalDebit),
          totalCredit: Number(entry.totalCredit),
          createdById: userId,
        },
      });

      await tx.journalEntryLine.createMany({
        data: entry.lines.map((line, index) => ({
          journalEntryId: created.id,
          accountId: line.accountId,
          debit: Number(line.debit),
          credit: Number(line.credit),
          description: line.description,
          contactType: line.contactType,
          contactId: line.contactId,
          sortOrder: index,
        })),
      });

      return tx.journalEntry.findUnique({
        where: { id: created.id },
        include: this.getFullInclude(),
      });
    });

    return this.formatEntry(clone);
  }

  // =====================================================================
  // HELPER: Calculate next recurring date
  // =====================================================================

  private calculateNextDate(fromDate: Date, frequency: string): Date {
    const date = new Date(fromDate);
    switch (frequency) {
      case 'DAILY':
        date.setDate(date.getDate() + 1);
        break;
      case 'WEEKLY':
        date.setDate(date.getDate() + 7);
        break;
      case 'BIWEEKLY':
        date.setDate(date.getDate() + 14);
        break;
      case 'MONTHLY':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'QUARTERLY':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'YEARLY':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date;
  }
}
