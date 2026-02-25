import { Prisma } from '@prisma/client';

interface AutoJELine {
  accountType?: string; // e.g., 'Accounts Receivable' — resolved to accountId at runtime
  accountId?: string;   // Direct accountId — skips resolution (use for deposit/payment accounts)
  debit: number;
  credit: number;
  description?: string;
}

interface AutoJEParams {
  companyId: string;
  userId: string;
  entryDate: Date;
  description: string;
  sourceType: string; // 'INVOICE' | 'BILL' | 'EXPENSE'
  sourceId: string;
  lines: AutoJELine[];
}

/**
 * Creates and immediately posts a journal entry inside an existing Prisma transaction.
 * Uses a plain function (not @Injectable) to avoid circular module dependencies.
 *
 * Account resolution: each line specifies `accountType` (e.g., 'Accounts Receivable')
 * which is looked up by type for the company. If any account is missing, the function
 * returns early without throwing — financial data integrity takes priority.
 */
export async function createAutoJournalEntry(
  tx: Prisma.TransactionClient,
  params: AutoJEParams,
): Promise<void> {
  const { companyId, userId, entryDate, description, sourceType, sourceId, lines } = params;

  // Resolve all accounts by accountType
  const resolvedLines: Array<{
    accountId: string;
    normalBalance: string;
    debit: number;
    credit: number;
    description?: string;
  }> = [];

  for (const line of lines) {
    let accountId: string;
    let normalBalance: string;

    if (line.accountId) {
      // Direct accountId provided — look up normalBalance only
      const account = await tx.account.findFirst({
        where: { id: line.accountId, companyId, isActive: true },
        select: { id: true, normalBalance: true },
      });

      if (!account) {
        console.warn(
          `[AutoJE] Skipping auto-journal entry: account "${line.accountId}" not found for company ${companyId}`,
        );
        return;
      }
      accountId = account.id;
      normalBalance = account.normalBalance;
    } else if (line.accountType) {
      // Resolve by accountType
      const account = await tx.account.findFirst({
        where: { companyId, accountType: line.accountType, isActive: true },
        select: { id: true, normalBalance: true },
      });

      if (!account) {
        console.warn(
          `[AutoJE] Skipping auto-journal entry: account type "${line.accountType}" not found for company ${companyId}`,
        );
        return;
      }
      accountId = account.id;
      normalBalance = account.normalBalance;
    } else {
      console.warn('[AutoJE] Skipping auto-journal entry: line has neither accountId nor accountType');
      return;
    }

    resolvedLines.push({
      accountId,
      normalBalance,
      debit: line.debit,
      credit: line.credit,
      description: line.description,
    });
  }

  // Generate entry number (JE-XXXX)
  const lastEntry = await tx.journalEntry.findFirst({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { entryNumber: true },
  });
  const lastNum = lastEntry?.entryNumber?.match(/JE-(\d+)/);
  const nextNum = lastNum ? parseInt(lastNum[1], 10) + 1 : 1;
  const entryNumber = `JE-${String(nextNum).padStart(4, '0')}`;

  const totalDebit = resolvedLines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = resolvedLines.reduce((sum, l) => sum + l.credit, 0);

  // Create journal entry (POSTED immediately)
  const entry = await tx.journalEntry.create({
    data: {
      companyId,
      entryNumber,
      entryDate,
      description,
      entryType: 'STANDARD',
      status: 'POSTED',
      totalDebit,
      totalCredit,
      sourceType,
      sourceId,
      postedAt: new Date(),
      postedById: userId,
      createdById: userId,
    },
  });

  // Create lines
  await tx.journalEntryLine.createMany({
    data: resolvedLines.map((line, index) => ({
      journalEntryId: entry.id,
      accountId: line.accountId,
      debit: line.debit,
      credit: line.credit,
      description: line.description || null,
      sortOrder: index,
    })),
  });

  // Update account balances (double-entry rules)
  // DEBIT normalBalance: debit increases, credit decreases
  // CREDIT normalBalance: credit increases, debit decreases
  for (const line of resolvedLines) {
    let balanceChange: number;
    if (line.normalBalance === 'DEBIT') {
      balanceChange = line.debit - line.credit;
    } else {
      balanceChange = line.credit - line.debit;
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
}
