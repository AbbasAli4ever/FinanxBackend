import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================================
  // TRIAL BALANCE
  // Returns all accounts with their current balances, grouped by type.
  // Total debits must equal total credits for a balanced ledger.
  // =========================================================================
  async getTrialBalance(companyId: string, asOfDate?: string) {
    // If asOfDate is provided, compute balances from JE lines up to that date.
    // Otherwise use currentBalance (which reflects all posted JEs).
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isActive: true },
      orderBy: [{ accountType: 'asc' }, { accountNumber: 'asc' }],
      select: {
        id: true,
        accountNumber: true,
        name: true,
        accountType: true,
        normalBalance: true,
        currentBalance: true,
      },
    });

    let accountBalances: Map<string, number>;

    if (asOfDate) {
      // Compute balances from posted JE lines up to asOfDate
      const cutoff = new Date(asOfDate);
      cutoff.setHours(23, 59, 59, 999);

      const jeLines = await this.prisma.journalEntryLine.findMany({
        where: {
          journalEntry: {
            companyId,
            status: 'POSTED',
            entryDate: { lte: cutoff },
          },
          accountId: { in: accounts.map((a) => a.id) },
        },
        select: {
          accountId: true,
          debit: true,
          credit: true,
          account: { select: { normalBalance: true } },
        },
      });

      accountBalances = new Map();
      for (const line of jeLines) {
        const current = accountBalances.get(line.accountId) || 0;
        const normalBalance = line.account.normalBalance;
        let change: number;
        if (normalBalance === 'DEBIT') {
          change = Number(line.debit) - Number(line.credit);
        } else {
          change = Number(line.credit) - Number(line.debit);
        }
        accountBalances.set(line.accountId, current + change);
      }
    } else {
      accountBalances = new Map(
        accounts.map((a) => [a.id, Number(a.currentBalance)]),
      );
    }

    let totalDebits = 0;
    let totalCredits = 0;

    const rows = accounts.map((account) => {
      const balance = accountBalances.get(account.id) || 0;

      // Positive balance goes in normal balance column, negative in opposite
      let debitBalance = 0;
      let creditBalance = 0;

      if (account.normalBalance === 'DEBIT') {
        if (balance >= 0) debitBalance = balance;
        else creditBalance = Math.abs(balance);
      } else {
        if (balance >= 0) creditBalance = balance;
        else debitBalance = Math.abs(balance);
      }

      totalDebits += debitBalance;
      totalCredits += creditBalance;

      return {
        accountId: account.id,
        accountNumber: account.accountNumber,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        balance,
        debitBalance,
        creditBalance,
      };
    });

    // Group by accountType for frontend display
    const grouped = this.groupByAccountType(rows);

    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      accounts: rows,
      grouped,
      totals: {
        totalDebits,
        totalCredits,
        isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      },
    };
  }

  // =========================================================================
  // ACCOUNT LEDGER
  // Shows all JE lines for a specific account in a date range,
  // with running balance.
  // =========================================================================
  async getAccountLedger(
    accountId: string,
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id: accountId, companyId, isActive: true },
      select: {
        id: true,
        accountNumber: true,
        name: true,
        accountType: true,
        normalBalance: true,
        currentBalance: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Compute opening balance (sum of all posted JE lines BEFORE startDate)
    let openingBalance = 0;
    if (startDate) {
      const openingLines = await this.prisma.journalEntryLine.findMany({
        where: {
          accountId,
          journalEntry: {
            companyId,
            status: 'POSTED',
            entryDate: { lt: new Date(startDate) },
          },
        },
        select: { debit: true, credit: true },
      });

      for (const line of openingLines) {
        if (account.normalBalance === 'DEBIT') {
          openingBalance += Number(line.debit) - Number(line.credit);
        } else {
          openingBalance += Number(line.credit) - Number(line.debit);
        }
      }
    }

    // Fetch lines in range
    const where: any = {
      accountId,
      journalEntry: {
        companyId,
        status: 'POSTED',
      },
    };

    if (startDate || endDate) {
      where.journalEntry.entryDate = {};
      if (startDate) where.journalEntry.entryDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.journalEntry.entryDate.lte = end;
      }
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where,
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            description: true,
          },
        },
      },
      orderBy: [
        { journalEntry: { entryDate: 'asc' } },
        { journalEntry: { createdAt: 'asc' } },
      ],
    });

    // Build running balance
    let runningBalance = openingBalance;
    const ledgerLines = lines.map((line) => {
      const debit = Number(line.debit);
      const credit = Number(line.credit);

      let balanceChange: number;
      if (account.normalBalance === 'DEBIT') {
        balanceChange = debit - credit;
      } else {
        balanceChange = credit - debit;
      }
      runningBalance += balanceChange;

      return {
        date: line.journalEntry.entryDate,
        entryId: line.journalEntry.id,
        entryNumber: line.journalEntry.entryNumber,
        description: line.description || line.journalEntry.description,
        debit,
        credit,
        balance: runningBalance,
      };
    });

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        name: account.name,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
      },
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      openingBalance,
      lines: ledgerLines,
      closingBalance: runningBalance,
    };
  }

  // =========================================================================
  // INCOME STATEMENT (P&L)
  // Revenue - COGS - Expenses = Net Income
  // Computes from JE lines posted in the date range (not currentBalance,
  // which is cumulative).
  // =========================================================================
  async getIncomeStatement(
    companyId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const incomeTypes = ['Income', 'Other Income'];
    const cogsTypes = ['Cost of Goods Sold'];
    const expenseTypes = ['Expenses', 'Other Expense'];

    const where: any = {
      journalEntry: {
        companyId,
        status: 'POSTED',
      },
      account: {
        companyId,
        accountType: { in: [...incomeTypes, ...cogsTypes, ...expenseTypes] },
      },
    };

    if (startDate || endDate) {
      where.journalEntry.entryDate = {};
      if (startDate) where.journalEntry.entryDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.journalEntry.entryDate.lte = end;
      }
    }

    const lines = await this.prisma.journalEntryLine.findMany({
      where,
      select: {
        debit: true,
        credit: true,
        account: {
          select: {
            id: true,
            accountNumber: true,
            name: true,
            accountType: true,
            normalBalance: true,
          },
        },
      },
    });

    // Aggregate by account
    const accountTotals = new Map<string, { account: any; net: number }>();
    for (const line of lines) {
      const acc = line.account;
      const existing = accountTotals.get(acc.id) || { account: acc, net: 0 };

      let change: number;
      if (acc.normalBalance === 'DEBIT') {
        change = Number(line.debit) - Number(line.credit);
      } else {
        change = Number(line.credit) - Number(line.debit);
      }
      existing.net += change;
      accountTotals.set(acc.id, existing);
    }

    const rows = Array.from(accountTotals.values());

    const revenue = rows
      .filter((r) => incomeTypes.includes(r.account.accountType))
      .map((r) => ({ ...r.account, amount: r.net }));

    const cogs = rows
      .filter((r) => cogsTypes.includes(r.account.accountType))
      .map((r) => ({ ...r.account, amount: r.net }));

    const expenses = rows
      .filter((r) => expenseTypes.includes(r.account.accountType))
      .map((r) => ({ ...r.account, amount: r.net }));

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalCogs = cogs.reduce((s, r) => s + r.amount, 0);
    const grossProfit = totalRevenue - totalCogs;
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
    const netIncome = grossProfit - totalExpenses;

    return {
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      revenue: {
        accounts: revenue,
        total: totalRevenue,
      },
      costOfGoodsSold: {
        accounts: cogs,
        total: totalCogs,
      },
      grossProfit,
      expenses: {
        accounts: expenses,
        total: totalExpenses,
      },
      netIncome,
    };
  }

  // =========================================================================
  // BALANCE SHEET
  // Assets = Liabilities + Equity (+ Net Income)
  // Uses currentBalance for permanent accounts, and computed net income
  // from JE lines up to asOfDate.
  // =========================================================================
  async getBalanceSheet(companyId: string, asOfDate?: string) {
    const cutoff = asOfDate
      ? (() => {
          const d = new Date(asOfDate);
          d.setHours(23, 59, 59, 999);
          return d;
        })()
      : new Date();

    const assetTypes = [
      'Bank',
      'Accounts Receivable',
      'Other Current Assets',
      'Fixed Assets',
      'Other Assets',
    ];
    const liabilityTypes = [
      'Accounts Payable',
      'Credit Card',
      'Other Current Liabilities',
      'Long Term Liabilities',
    ];
    const equityTypes = ['Equity'];
    const incomeTypes = ['Income', 'Other Income'];
    const cogsTypes = ['Cost of Goods Sold'];
    const expenseTypes = ['Expenses', 'Other Expense'];

    // Get all balance-sheet accounts
    const bsAccounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isActive: true,
        accountType: {
          in: [...assetTypes, ...liabilityTypes, ...equityTypes],
        },
      },
      orderBy: [{ accountType: 'asc' }, { accountNumber: 'asc' }],
      select: {
        id: true,
        accountNumber: true,
        name: true,
        accountType: true,
        normalBalance: true,
        currentBalance: true,
      },
    });

    // Compute balances as of cutoff from JE lines
    const jeLines = await this.prisma.journalEntryLine.findMany({
      where: {
        accountId: { in: bsAccounts.map((a) => a.id) },
        journalEntry: {
          companyId,
          status: 'POSTED',
          entryDate: { lte: cutoff },
        },
      },
      select: {
        accountId: true,
        debit: true,
        credit: true,
        account: { select: { normalBalance: true } },
      },
    });

    const balanceMap = new Map<string, number>();
    for (const line of jeLines) {
      const current = balanceMap.get(line.accountId) || 0;
      let change: number;
      if (line.account.normalBalance === 'DEBIT') {
        change = Number(line.debit) - Number(line.credit);
      } else {
        change = Number(line.credit) - Number(line.debit);
      }
      balanceMap.set(line.accountId, current + change);
    }

    const mapAccounts = (types: string[]) =>
      bsAccounts
        .filter((a) => types.includes(a.accountType))
        .map((a) => ({
          id: a.id,
          accountNumber: a.accountNumber,
          name: a.name,
          accountType: a.accountType,
          normalBalance: a.normalBalance,
          balance: balanceMap.get(a.id) || 0,
        }));

    const assets = mapAccounts(assetTypes);
    const liabilities = mapAccounts(liabilityTypes);
    const equity = mapAccounts(equityTypes);

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);

    // Compute Net Income from P&L accounts in period (beginning of time to cutoff)
    const plLines = await this.prisma.journalEntryLine.findMany({
      where: {
        journalEntry: {
          companyId,
          status: 'POSTED',
          entryDate: { lte: cutoff },
        },
        account: {
          companyId,
          accountType: { in: [...incomeTypes, ...cogsTypes, ...expenseTypes] },
        },
      },
      select: {
        debit: true,
        credit: true,
        account: { select: { accountType: true, normalBalance: true } },
      },
    });

    let netIncome = 0;
    for (const line of plLines) {
      const acc = line.account;
      let net: number;
      if (acc.normalBalance === 'DEBIT') {
        net = Number(line.debit) - Number(line.credit);
      } else {
        net = Number(line.credit) - Number(line.debit);
      }

      if (incomeTypes.includes(acc.accountType)) {
        netIncome += net;
      } else {
        netIncome -= net; // COGS and Expenses reduce net income
      }
    }

    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity + netIncome;

    return {
      asOfDate: asOfDate || new Date().toISOString().split('T')[0],
      assets: {
        accounts: assets,
        total: totalAssets,
      },
      liabilities: {
        accounts: liabilities,
        total: totalLiabilities,
      },
      equity: {
        accounts: equity,
        total: totalEquity,
        netIncome,
        totalIncludingNetIncome: totalEquity + netIncome,
      },
      totals: {
        totalAssets,
        totalLiabilitiesAndEquity,
        isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
      },
    };
  }

  // =========================================================================
  // HELPER: Group accounts by type
  // =========================================================================
  private groupByAccountType(accounts: any[]) {
    const groups: Record<string, any[]> = {};
    for (const account of accounts) {
      if (!groups[account.accountType]) {
        groups[account.accountType] = [];
      }
      groups[account.accountType].push(account);
    }
    return groups;
  }
}
