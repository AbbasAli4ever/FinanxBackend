# Day 13: Journal Entries — Frontend Integration Guide

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** Bearer token in `Authorization` header

---

## TypeScript Interfaces

```typescript
// ============================================================
// ENUMS
// ============================================================
type JournalEntryStatus = 'DRAFT' | 'POSTED' | 'VOID';

type JournalEntryType =
  | 'STANDARD'
  | 'ADJUSTING'
  | 'CLOSING'
  | 'REVERSING'
  | 'RECURRING';

type RecurringFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

// ============================================================
// JOURNAL ENTRY
// ============================================================
interface JournalEntry {
  id: string;
  entryNumber: string;
  referenceNumber: string | null;
  description: string | null;
  notes: string | null;
  entryType: JournalEntryType;
  status: JournalEntryStatus;
  entryDate: string; // YYYY-MM-DD

  // Totals (must be equal when posted)
  totalDebit: number;
  totalCredit: number;

  // Recurring
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  nextRecurringDate: string | null;
  recurringEndDate: string | null;

  // Auto-Reversing
  isAutoReversing: boolean;
  reversalDate: string | null;

  // Reversal Link
  reversedFrom: { id: string; entryNumber: string } | null;

  // Source Link
  sourceType: string | null;
  sourceId: string | null;

  // Posting
  postedAt: string | null;
  postedBy: { id: string; firstName: string; lastName: string; email: string } | null;

  // Void
  voidedAt: string | null;
  voidReason: string | null;

  // Created by
  createdBy: { id: string; firstName: string; lastName: string; email: string };

  // Lines
  lines: JournalEntryLine[];

  // Audit
  createdAt: string;
  updatedAt: string;
}

interface JournalEntryLine {
  id: string;
  account: {
    id: string;
    name: string;
    accountNumber: string | null;
    accountType: string;
    normalBalance: string;
  };
  debit: number;
  credit: number;
  description: string | null;
  contactType: string | null; // "CUSTOMER" or "VENDOR"
  contactId: string | null;
  sortOrder: number;
}

// ============================================================
// CREATE / UPDATE DTOs
// ============================================================
interface CreateJournalEntryDto {
  entryDate: string; // Required: YYYY-MM-DD
  lines: CreateJournalEntryLineDto[]; // Required: min 2

  // Optional
  entryNumber?: string;
  description?: string;
  referenceNumber?: string;
  notes?: string;
  entryType?: JournalEntryType;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  isAutoReversing?: boolean;
  reversalDate?: string;
  sourceType?: string;
  sourceId?: string;
}

interface CreateJournalEntryLineDto {
  accountId: string; // Required
  debit?: number; // One of debit/credit must be > 0
  credit?: number;
  description?: string;
  contactType?: 'CUSTOMER' | 'VENDOR';
  contactId?: string;
  sortOrder?: number;
}

// UpdateJournalEntryDto: same as Create but ALL fields optional
// If lines provided, replaces all existing lines (min 2)

// ============================================================
// QUERY
// ============================================================
interface QueryJournalEntriesDto {
  status?: JournalEntryStatus;
  entryType?: JournalEntryType;
  accountId?: string; // Filter by entries containing this account
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string; // Searches description, entryNumber, referenceNumber, notes
  sortBy?: 'entryDate' | 'totalDebit' | 'entryNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number; // Default: 1
  limit?: number; // Default: 20
}

// ============================================================
// STATUS METADATA (from GET /journal-entries/statuses)
// ============================================================
interface StatusInfo {
  key: string;
  label: string;
  color: string;
  description: string;
  allowEdit: boolean;
  allowDelete: boolean;
  allowPost: boolean;
  allowVoid: boolean;
  allowReverse: boolean;
  allowDuplicate: boolean;
}

// ============================================================
// SUMMARY (from GET /journal-entries/summary)
// ============================================================
interface JournalEntrySummary {
  draft: { count: number };
  posted: { count: number; totalDebit: number };
  voided: { count: number };
  totalEntries: number;
}
```

---

## API Examples

### 1. Get Next Entry Number
```http
GET /api/v1/journal-entries/next-number
Authorization: Bearer {token}
```
Response: `{ success: true, data: { nextEntryNumber: "JE-0001" } }`

### 2. Get Statuses (for dropdowns/filters)
```http
GET /api/v1/journal-entries/statuses
```

### 3. Get Entry Types (for dropdowns)
```http
GET /api/v1/journal-entries/entry-types
```

### 4. Create Standard Journal Entry
```http
POST /api/v1/journal-entries
Content-Type: application/json

{
  "entryDate": "2026-02-24",
  "description": "Record office rent payment",
  "lines": [
    { "accountId": "uuid-rent-expense", "debit": 2000, "description": "Monthly rent" },
    { "accountId": "uuid-checking-account", "credit": 2000, "description": "Paid from checking" }
  ]
}
```

### 5. Create Adjusting Entry (Auto-Reversing)
```http
POST /api/v1/journal-entries

{
  "entryDate": "2026-02-28",
  "description": "Accrued salaries payable",
  "entryType": "ADJUSTING",
  "isAutoReversing": true,
  "reversalDate": "2026-03-01",
  "lines": [
    { "accountId": "uuid-salary-expense", "debit": 5000 },
    { "accountId": "uuid-salary-payable", "credit": 5000 }
  ]
}
```
When posted, auto-creates a reversal DRAFT dated 2026-03-01 with flipped debits/credits.

### 6. Create Recurring Entry
```http
POST /api/v1/journal-entries

{
  "entryDate": "2026-02-24",
  "description": "Monthly depreciation",
  "entryType": "RECURRING",
  "isRecurring": true,
  "recurringFrequency": "MONTHLY",
  "recurringEndDate": "2026-12-31",
  "lines": [
    { "accountId": "uuid-depreciation-expense", "debit": 500 },
    { "accountId": "uuid-accumulated-depreciation", "credit": 500 }
  ]
}
```
When posted, auto-creates next month's DRAFT clone.

### 7. Create Multi-Line Entry
```http
POST /api/v1/journal-entries

{
  "entryDate": "2026-02-24",
  "description": "Payroll journal entry",
  "lines": [
    { "accountId": "uuid-salary-expense", "debit": 10000, "description": "Gross salaries" },
    { "accountId": "uuid-tax-payable", "credit": 2000, "description": "Payroll tax withheld" },
    { "accountId": "uuid-insurance-payable", "credit": 500, "description": "Health insurance" },
    { "accountId": "uuid-checking", "credit": 7500, "description": "Net pay" }
  ]
}
```

### 8. Post Entry (Updates Account Balances)
```http
POST /api/v1/journal-entries/{id}/post
```
**Important:** Entry must be balanced (totalDebit = totalCredit) or posting will fail.

### 9. Void Posted Entry (Reverses Balances)
```http
POST /api/v1/journal-entries/{id}/void
Body: { "reason": "Incorrect amounts" }
```

### 10. Reverse Posted Entry (Creates New DRAFT)
```http
POST /api/v1/journal-entries/{id}/reverse
```
Creates a new DRAFT with all debit↔credit flipped, linked via `reversedFrom`.

### 11. Duplicate Entry
```http
POST /api/v1/journal-entries/{id}/duplicate
```

### 12. List with Filters
```http
GET /api/v1/journal-entries?status=POSTED&entryType=ADJUSTING&dateFrom=2026-02-01&dateTo=2026-02-28&search=rent&sortBy=entryDate&sortOrder=desc
```

---

## UI Implementation Guide

### Journal Entry List Page
- Use `GET /journal-entries/statuses` to build status filter tabs
- Status colors: Draft=gray, Posted=green, Void=dark
- Show: entryNumber, date, description, type, totalDebit, status badge
- Filter by status, type, date range, account, search
- Action buttons based on status metadata (`allowXxx` flags)

### Create/Edit Journal Entry Form
- **Header**: Entry date, reference number, description, entry type dropdown
- **Lines table** (dynamic rows, min 2):
  - Account picker (from chart of accounts)
  - Debit amount OR Credit amount (toggle per line)
  - Description (optional)
  - Contact (optional customer/vendor picker)
- **Running totals** at bottom: Total Debits | Total Credits | Difference
- **Validation**: Highlight if debits ≠ credits (warn, but allow saving as DRAFT)
- **Optional sections**:
  - Recurring: frequency dropdown + end date
  - Auto-reversing: checkbox + reversal date

### Journal Entry Detail Page
- Show all fields + lines with account details
- Action buttons based on status:
  - DRAFT: Edit, Delete, Post, Duplicate
  - POSTED: Void, Reverse, Duplicate
  - VOID: Duplicate only
- Show posting timeline (createdAt → postedAt → voidedAt)
- If entry has reversedFrom, show link to original entry

### Dashboard Widget
- Use `GET /journal-entries/summary` for counts
- Show cards: Drafts (pending post), Posted, Voided
- Quick actions: "New Journal Entry"

### Balance Impact Preview
Before posting, show a preview of how each account balance will change:
- Account Name | Current Balance | Debit | Credit | New Balance

---

## Response Format

All endpoints follow: `{ success: boolean, message: string, data: ... }`

### List Response
```json
{
  "success": true,
  "message": "Journal entries retrieved successfully",
  "data": {
    "items": [...],
    "pagination": {
      "total": 25,
      "page": 1,
      "limit": 20,
      "totalPages": 2
    }
  }
}
```

---

## Key Business Rules for Frontend

1. **Debits must equal credits** to post — show real-time difference in the form
2. **Each line**: exactly one of debit/credit must be > 0, the other must be 0
3. **Min 2 lines** per entry
4. **DRAFT → POSTED → VOID** is the only lifecycle path
5. **Posted entries are immutable** — correct via reversal (creates new entry)
6. **Auto-reversing**: When posting an entry with `isAutoReversing=true`, the API auto-creates a reversal DRAFT — no frontend action needed
7. **Recurring**: When posting a recurring entry, the API auto-creates the next clone as DRAFT
