# Day 14: Financial Reports — Frontend Integration Guide

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** Bearer token in `Authorization` header

---

## TypeScript Interfaces

```typescript
// ============================================================
// SHARED
// ============================================================
interface AccountSummary {
  id: string;
  accountNumber: string | null;
  name: string;
  accountType: string;
  normalBalance: 'DEBIT' | 'CREDIT';
}

// ============================================================
// TRIAL BALANCE
// GET /reports/trial-balance?asOfDate=YYYY-MM-DD
// ============================================================
interface TrialBalanceAccount extends AccountSummary {
  balance: number;      // Net balance (positive = normal direction)
  debitBalance: number; // Amount in debit column
  creditBalance: number; // Amount in credit column
}

interface TrialBalanceResponse {
  asOfDate: string;
  accounts: TrialBalanceAccount[];
  grouped: Record<string, TrialBalanceAccount[]>; // grouped by accountType
  totals: {
    totalDebits: number;
    totalCredits: number;
    isBalanced: boolean; // true if totalDebits ≈ totalCredits
  };
}

// ============================================================
// ACCOUNT LEDGER
// GET /reports/account-ledger/:accountId?startDate=...&endDate=...
// ============================================================
interface LedgerLine {
  date: string;        // ISO date string
  entryId: string;
  entryNumber: string; // JE-XXXX
  description: string | null;
  debit: number;
  credit: number;
  balance: number;     // Running balance after this line
}

interface AccountLedgerResponse {
  account: AccountSummary;
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  openingBalance: number;  // Balance before startDate
  lines: LedgerLine[];
  closingBalance: number;  // Balance at end of period
}

// ============================================================
// INCOME STATEMENT (P&L)
// GET /reports/income-statement?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// ============================================================
interface IncomeStatementAccount extends AccountSummary {
  amount: number;  // Net activity in the period
}

interface IncomeStatementResponse {
  period: {
    startDate: string | null;
    endDate: string | null;
  };
  revenue: {
    accounts: IncomeStatementAccount[];
    total: number;
  };
  costOfGoodsSold: {
    accounts: IncomeStatementAccount[];
    total: number;
  };
  grossProfit: number;    // revenue.total - costOfGoodsSold.total
  expenses: {
    accounts: IncomeStatementAccount[];
    total: number;
  };
  netIncome: number;      // grossProfit - expenses.total
}

// ============================================================
// BALANCE SHEET
// GET /reports/balance-sheet?asOfDate=YYYY-MM-DD
// ============================================================
interface BalanceSheetAccount extends AccountSummary {
  balance: number;  // Balance as of asOfDate
}

interface BalanceSheetResponse {
  asOfDate: string;
  assets: {
    accounts: BalanceSheetAccount[];
    total: number;
  };
  liabilities: {
    accounts: BalanceSheetAccount[];
    total: number;
  };
  equity: {
    accounts: BalanceSheetAccount[];
    total: number;
    netIncome: number;                // P&L net income up to asOfDate
    totalIncludingNetIncome: number;  // equity.total + netIncome
  };
  totals: {
    totalAssets: number;
    totalLiabilitiesAndEquity: number; // = liabilities + equity + netIncome
    isBalanced: boolean;               // Assets = Liabilities + Equity (within $0.01)
  };
}
```

---

## API Examples

### 1. Trial Balance (Current)
```http
GET /api/v1/reports/trial-balance
Authorization: Bearer {token}
```

### 2. Trial Balance (As of Date)
```http
GET /api/v1/reports/trial-balance?asOfDate=2026-12-31
```

### 3. Account Ledger (All time)
```http
GET /api/v1/reports/account-ledger/{accountId}
```

### 4. Account Ledger (Date Range)
```http
GET /api/v1/reports/account-ledger/{accountId}?startDate=2026-01-01&endDate=2026-03-31
```

### 5. Income Statement (YTD)
```http
GET /api/v1/reports/income-statement?startDate=2026-01-01&endDate=2026-12-31
```

### 6. Balance Sheet (End of Month)
```http
GET /api/v1/reports/balance-sheet?asOfDate=2026-02-28
```

---

## Response Format

All endpoints follow: `{ success: boolean, message: string, data: ... }`

---

## UI Implementation Guide

### Trial Balance Page
- Table with columns: Account Number | Account Name | Account Type | Debit | Credit
- Show only non-zero accounts by default (toggle to show all)
- Footer row: **Total Debits | Total Credits** (highlighted red if not balanced)
- Date picker for `asOfDate` (defaults to today)

### Account Ledger Page
- Header: Account name, number, type, opening balance
- Table: Date | Entry # | Description | Debit | Credit | Balance
- Entry # links to the journal entry detail page
- Running balance column: green if positive (normal), red if abnormal
- Date range picker for startDate / endDate

### Income Statement (P&L) Page
- **Revenue** section: list of income accounts + total
- **Cost of Goods Sold** section: list of COGS accounts + total
- **Gross Profit** = Revenue - COGS (bold)
- **Operating Expenses** section: list of expense accounts + total
- **Net Income** = Gross Profit - Expenses (bold, color-coded green/red)
- Date range picker (month, quarter, YTD, custom)

### Balance Sheet Page
- **Assets** section (debit-normal accounts)
  - Current Assets: Bank, AR, Other Current Assets
  - Fixed Assets: Fixed Assets, Other Assets
- **Liabilities** section
  - Current Liabilities: AP, Credit Card, Other Current
  - Long-term Liabilities
- **Equity** section + Net Income
- Footer: Assets = Liabilities + Equity (isBalanced indicator)
- `asOfDate` picker (defaults to today)

---

## Auto-Journal Entry Traceability

Every auto-created JE from invoices/bills/expenses has:
- `sourceType`: `'INVOICE'`, `'BILL'`, or `'EXPENSE'`
- `sourceId`: UUID of the source record

Use the Journal Entries list endpoint with `sourceType` filter:
```http
GET /api/v1/journal-entries?search=INV-0001
```
Or filter by account to see all activity on a specific account:
```http
GET /api/v1/journal-entries?accountId={accountId}
```

---

## Business Rules for Frontend

1. **Trial Balance** is balanced when `totalDebits ≈ totalCredits` (within $0.01 rounding)
2. **Income Statement** shows period activity only (not cumulative balances)
3. **Balance Sheet** uses as-of-date snapshots computed from JE lines, not account.currentBalance
4. **Net Income** from the Income Statement appears as a line in Balance Sheet → Equity section
5. **Account Ledger** `openingBalance` = sum of all JE activity before `startDate`
6. All amounts in reports are in the company's base currency (no currency conversion)

## Auto-JE Accounting Notes

7. **Void reverses remaining balance only**: voiding a partially-paid invoice/bill only reverses `amountDue`, not `totalAmount` — payment JEs already handled the paid portion
8. **Bill JEs use per-line-item accounts**: each bill line item's `expenseAccountId` is debited separately (not a blanket COGS debit), so the Income Statement correctly splits costs across expense categories
9. **Expense JEs use the specific expense account**: the auto-JE debits the expense's own `expenseAccountId` (or per-line accounts for split expenses), not a generic Expenses account
10. **Payment JEs use specific bank accounts**: invoice payments use `depositAccountId`, bill/expense payments use `paymentAccountId` — falls back to first Bank account only when none is set
