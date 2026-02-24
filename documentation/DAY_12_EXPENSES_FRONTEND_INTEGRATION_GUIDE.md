# Day 12: Expenses Module — Frontend Integration Guide

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** Bearer token in `Authorization` header

---

## TypeScript Interfaces

```typescript
// ============================================================
// ENUMS
// ============================================================
type ExpenseStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'REIMBURSED'
  | 'VOID';

type RecurringFrequency =
  | 'DAILY'
  | 'WEEKLY'
  | 'BIWEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY';

type PaymentMethod =
  | 'CASH'
  | 'CHECK'
  | 'BANK_TRANSFER'
  | 'CREDIT_CARD'
  | 'OTHER';

// ============================================================
// EXPENSE
// ============================================================
interface Expense {
  id: string;
  expenseNumber: string;
  referenceNumber: string | null;
  description: string | null;
  notes: string | null;
  status: ExpenseStatus;
  expenseDate: string; // YYYY-MM-DD

  // Amounts
  amount: number;
  taxPercent: number;
  taxAmount: number;
  totalAmount: number;

  // Vendor & Category
  vendor: { id: string; displayName: string } | null;
  category: { id: string; name: string } | null;

  // Accounts
  expenseAccount: {
    id: string;
    name: string;
    accountNumber: string | null;
    accountType: string;
  };
  paymentAccount: {
    id: string;
    name: string;
    accountNumber: string | null;
    accountType: string;
  } | null;
  paymentMethod: PaymentMethod | null;

  // Tax
  isTaxDeductible: boolean;

  // Billable
  isBillable: boolean;
  billableCustomer: { id: string; displayName: string } | null;
  markupPercent: number | null;
  markedUpAmount: number | null;

  // Reimbursable
  isReimbursable: boolean;
  reimbursedAt: string | null;
  reimbursedAmount: number | null;

  // Mileage
  isMileage: boolean;
  mileageDistance: number | null;
  mileageRate: number | null;

  // Receipt
  receiptUrl: string | null;
  receiptFileName: string | null;

  // Recurring
  isRecurring: boolean;
  recurringFrequency: RecurringFrequency | null;
  nextRecurringDate: string | null;
  recurringEndDate: string | null;

  // Approval
  submittedAt: string | null;
  approvedAt: string | null;
  approvedBy: { id: string; firstName: string; lastName: string; email: string } | null;
  rejectedAt: string | null;
  rejectionReason: string | null;

  // Terminal
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;

  // Created by
  createdBy: { id: string; firstName: string; lastName: string; email: string };

  // Line items (for split expenses)
  lineItems: ExpenseLineItem[];

  // Audit
  createdAt: string;
  updatedAt: string;
}

interface ExpenseLineItem {
  id: string;
  expenseAccount: {
    id: string;
    name: string;
    accountNumber: string | null;
    accountType: string;
  };
  description: string;
  amount: number;
  taxPercent: number;
  taxAmount: number;
  sortOrder: number;
}

// ============================================================
// CREATE / UPDATE DTOs
// ============================================================
interface CreateExpenseDto {
  expenseDate: string; // Required: YYYY-MM-DD
  expenseAccountId: string; // Required: UUID
  amount: number; // Required (0 for mileage/split)

  // Optional
  expenseNumber?: string;
  description?: string;
  referenceNumber?: string;
  notes?: string;
  vendorId?: string;
  categoryId?: string;
  paymentAccountId?: string;
  paymentMethod?: PaymentMethod;
  taxPercent?: number;
  isTaxDeductible?: boolean;
  isBillable?: boolean;
  billableCustomerId?: string;
  markupPercent?: number;
  isReimbursable?: boolean;
  isMileage?: boolean;
  mileageDistance?: number;
  mileageRate?: number;
  receiptUrl?: string;
  receiptFileName?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  recurringEndDate?: string;
  lineItems?: CreateExpenseLineItemDto[]; // Min 2 if provided
}

interface CreateExpenseLineItemDto {
  expenseAccountId: string; // Required
  description: string; // Required
  amount: number; // Required (min 0.01)
  taxPercent?: number;
  sortOrder?: number;
}

// UpdateExpenseDto: same as CreateExpenseDto but ALL fields optional

// ============================================================
// QUERY
// ============================================================
interface QueryExpensesDto {
  status?: ExpenseStatus;
  vendorId?: string;
  categoryId?: string;
  expenseAccountId?: string;
  isBillable?: boolean;
  isReimbursable?: boolean;
  isMileage?: boolean;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string; // Searches description, expenseNumber, referenceNumber, notes
  sortBy?: 'expenseDate' | 'amount' | 'totalAmount' | 'expenseNumber' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number; // Default: 1
  limit?: number; // Default: 20
}

// ============================================================
// STATUS METADATA (from GET /expenses/statuses)
// ============================================================
interface StatusInfo {
  key: string;
  label: string;
  color: string;
  description: string;
  allowEdit: boolean;
  allowDelete: boolean;
  allowSubmit: boolean;
  allowApprove: boolean;
  allowReject: boolean;
  allowMarkPaid: boolean;
  allowVoid: boolean;
}

// ============================================================
// SUMMARY (from GET /expenses/summary)
// ============================================================
interface ExpenseSummary {
  draft: { count: number };
  pendingApproval: { count: number; amount: number };
  approved: { count: number; amount: number };
  rejected: { count: number };
  paid: { count: number; amount: number };
  reimbursed: { count: number; amount: number };
  voided: { count: number };
  totalExpenses: number;
  totalAmount: number;
}
```

---

## API Examples

### 1. Get Next Expense Number
```http
GET /api/v1/expenses/next-number
Authorization: Bearer {token}
```
Response: `{ success: true, data: { nextExpenseNumber: "EXP-0001" } }`

### 2. Get Statuses (for dropdowns/filters)
```http
GET /api/v1/expenses/statuses
```

### 3. Get Recurring Frequencies (for dropdowns)
```http
GET /api/v1/expenses/recurring-frequencies
```

### 4. Create Simple Expense
```http
POST /api/v1/expenses
Content-Type: application/json

{
  "expenseDate": "2026-02-20",
  "expenseAccountId": "uuid-of-expense-account",
  "amount": 150.00,
  "description": "Office supplies purchase",
  "vendorId": "uuid-of-vendor",
  "categoryId": "uuid-of-category",
  "paymentAccountId": "uuid-of-bank-account",
  "paymentMethod": "CREDIT_CARD",
  "taxPercent": 10
}
```

### 5. Create Mileage Expense
```http
POST /api/v1/expenses

{
  "expenseDate": "2026-02-21",
  "expenseAccountId": "uuid-of-expense-account",
  "amount": 0,
  "isMileage": true,
  "mileageDistance": 120,
  "mileageRate": 0.655,
  "description": "Client visit drive"
}
```
Amount auto-calculates: 120 × 0.655 = **$78.60**

### 6. Create Split Expense
```http
POST /api/v1/expenses

{
  "expenseDate": "2026-02-22",
  "expenseAccountId": "uuid-primary-account",
  "amount": 0,
  "description": "Mixed office+travel",
  "lineItems": [
    { "expenseAccountId": "uuid-supplies", "description": "Office supplies", "amount": 100 },
    { "expenseAccountId": "uuid-travel", "description": "Travel", "amount": 200 }
  ]
}
```
Amount auto-calculates: 100 + 200 = **$300.00**

### 7. Create Billable Expense with Markup
```http
POST /api/v1/expenses

{
  "expenseDate": "2026-02-23",
  "expenseAccountId": "uuid-of-expense-account",
  "amount": 500,
  "description": "Client project materials",
  "isBillable": true,
  "billableCustomerId": "uuid-of-customer",
  "markupPercent": 20
}
```
MarkedUpAmount: 500 × 1.20 = **$600.00**

### 8. Create Recurring Expense
```http
POST /api/v1/expenses

{
  "expenseDate": "2026-02-23",
  "expenseAccountId": "uuid-of-expense-account",
  "amount": 99,
  "description": "Monthly SaaS subscription",
  "isRecurring": true,
  "recurringFrequency": "MONTHLY",
  "recurringEndDate": "2027-02-23"
}
```

### 9. List Expenses with Filters
```http
GET /api/v1/expenses?status=DRAFT&vendorId=uuid&search=office&page=1&limit=20&sortBy=expenseDate&sortOrder=desc
```

### 10. Lifecycle Actions
```http
POST /api/v1/expenses/{id}/submit        # DRAFT → PENDING_APPROVAL
POST /api/v1/expenses/{id}/approve       # PENDING_APPROVAL → APPROVED
POST /api/v1/expenses/{id}/reject        # PENDING_APPROVAL → REJECTED
  Body: { "reason": "Missing receipt" }
POST /api/v1/expenses/{id}/mark-paid     # APPROVED → PAID/REIMBURSED
  Body: { "paymentMethod": "BANK_TRANSFER", "paymentAccountId": "uuid" }
POST /api/v1/expenses/{id}/void          # Any → VOID
  Body: { "reason": "Duplicate entry" }
```

---

## UI Implementation Guide

### Expense List Page
- Use `GET /expenses/statuses` to build status filter tabs
- Status colors from metadata: Draft=gray, Pending=yellow, Approved=blue, Rejected=red, Paid=green, Reimbursed=purple, Void=dark
- Show: expenseNumber, date, vendor, description, amount, status badge
- Filter by status, vendor, category, date range, billable/reimbursable

### Create/Edit Expense Form
- **Step 1**: Basic info (date, account, amount, description, vendor, category)
- **Step 2**: Payment (method, account)
- **Step 3**: Optional toggles:
  - Billable → show customer picker + markup %
  - Reimbursable → checkbox
  - Mileage → show distance + rate (auto-calc amount)
  - Recurring → show frequency + end date
  - Tax deductible → checkbox
- **Step 4**: Split expense → add/remove line items (min 2)
- **Step 5**: Receipt upload → receiptUrl + receiptFileName

### Expense Detail Page
- Show all fields
- Action buttons based on status (use `allowXxx` flags from statuses endpoint):
  - DRAFT: Edit, Delete, Submit
  - PENDING_APPROVAL: Approve, Reject, Void
  - APPROVED: Mark Paid, Void
  - REJECTED: Edit (resets to DRAFT), Delete
  - PAID/REIMBURSED: Void
  - VOID: (no actions)
- Show approval timeline (submittedAt → approvedAt/rejectedAt → paidAt)

### Dashboard Widget
- Use `GET /expenses/summary` for counts and amounts
- Show cards: Draft, Pending Approval, Approved, Paid
- Quick action buttons: "New Expense", "Submit All Drafts"

### Recurring Expenses
- When a recurring expense is marked as paid, the system auto-creates a new DRAFT clone with the next date
- Show a "Recurring" badge on recurring expenses
- Display next occurrence date

---

## Response Format

All endpoints follow: `{ success: boolean, message: string, data: ... }`

### List Response
```json
{
  "success": true,
  "message": "Expenses retrieved successfully",
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
