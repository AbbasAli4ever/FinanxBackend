# Day 12: Expenses Module — Completion Summary

**Date:** February 23, 2026
**Module:** Expenses (Expense Tracking with Approval Workflow)
**Status:** COMPLETED

---

## What Was Built

A comprehensive Expenses module inspired by QuickBooks, Xero, FreshBooks, Wave, and Zoho Books. Unlike Bills (vendor invoices with line items and partial payments), Expenses are simpler, faster-to-create records for one-off payments like gas receipts, meals, office supplies, and mileage — while supporting advanced features like approval workflows, billable tracking, mileage auto-calculation, recurring expenses, and split expenses.

---

## Database Changes

### New Enums (2)
| Enum | Values |
|------|--------|
| `ExpenseStatus` | DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, PAID, REIMBURSED, VOID |
| `RecurringFrequency` | DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, YEARLY |

### New Models (2)
| Model | Fields | Description |
|-------|--------|-------------|
| `Expense` | 40+ fields | Main expense record with full lifecycle |
| `ExpenseLineItem` | 7 fields | For split expenses (min 2 items) |

### Relation Updates (6 existing models)
- Company → `expenses[]`
- User → `expensesCreated[]`, `expensesApproved[]`
- Customer → `billableExpenses[]`
- Vendor → `expenses[]`
- Category → `expenses[]`
- Account → `expenseAccounts[]`, `expensePaymentAccounts[]`, `expenseLineAccounts[]`

### New Permissions (2)
| Code | Name | Display Order |
|------|------|--------------|
| `expense:approve` | Approve Expenses | 44 |
| `expense:void` | Void Expenses | 45 |

**Total permissions: 63**

---

## API Endpoints (14)

### Static Routes
| # | Method | Route | Permission | Description |
|---|--------|-------|------------|-------------|
| 1 | GET | `/expenses/summary` | expense:view | Dashboard stats by status |
| 2 | GET | `/expenses/next-number` | expense:create | Next EXP-XXXX |
| 3 | GET | `/expenses/statuses` | expense:view | 7 statuses with metadata |
| 4 | GET | `/expenses/recurring-frequencies` | expense:view | 6 frequency options |

### CRUD
| # | Method | Route | Permission | Description |
|---|--------|-------|------------|-------------|
| 5 | GET | `/expenses` | expense:view | List + filters/search/sort/pagination |
| 6 | GET | `/expenses/:id` | expense:view | Full detail with relations |
| 7 | POST | `/expenses` | expense:create | Create expense (DRAFT) |
| 8 | PATCH | `/expenses/:id` | expense:edit | Update draft/rejected only |
| 9 | DELETE | `/expenses/:id` | expense:delete | Delete draft/rejected only |

### Lifecycle Actions
| # | Method | Route | Permission | Description |
|---|--------|-------|------------|-------------|
| 10 | POST | `/expenses/:id/submit` | expense:edit | DRAFT → PENDING_APPROVAL |
| 11 | POST | `/expenses/:id/approve` | expense:approve | PENDING_APPROVAL → APPROVED |
| 12 | POST | `/expenses/:id/reject` | expense:approve | PENDING_APPROVAL → REJECTED |
| 13 | POST | `/expenses/:id/mark-paid` | expense:edit | APPROVED → PAID/REIMBURSED |
| 14 | POST | `/expenses/:id/void` | expense:void | Any active → VOID |

---

## Status Workflow

```
DRAFT --submit--> PENDING_APPROVAL --approve--> APPROVED --mark-paid--> PAID
  |                   |       |                    |                      |
delete              void    reject               void                  void
                              |                    |
                           REJECTED            mark-paid
                            |   |            (reimbursable)
                          edit delete              |
                          (→DRAFT)            REIMBURSED → void → VOID
```

---

## Key Features

1. **Auto-numbering**: EXP-0001, EXP-0002, ... per company
2. **Mileage auto-calculation**: amount = mileageDistance × mileageRate
3. **Split expenses**: Provide lineItems (min 2) → amount = sum of line items
4. **Billable markup**: markedUpAmount = totalAmount × (1 + markupPercent/100)
5. **Reimbursable tracking**: mark-paid on reimbursable → REIMBURSED (not PAID)
6. **Rejected → Edit flow**: Editing REJECTED auto-resets to DRAFT, clears rejection
7. **Recurring auto-clone**: On mark-paid, if isRecurring, auto-creates new DRAFT with next date
8. **Tax calculation**: taxAmount = amount × taxPercent/100, totalAmount = amount + taxAmount
9. **7-state approval workflow**: Full lifecycle from DRAFT to PAID/REIMBURSED/VOID
10. **Receipt tracking**: receiptUrl + receiptFileName fields

---

## Test Results (20/20 Scenarios Passing)

| # | Scenario | Result |
|---|----------|--------|
| 1 | GET next-number → EXP-XXXX | PASS |
| 2 | GET statuses → 7 statuses | PASS |
| 3 | GET recurring-frequencies → 6 options | PASS |
| 4 | POST create simple expense → DRAFT | PASS |
| 5 | POST create mileage expense → auto-calc 78.6 | PASS |
| 6 | POST create split expense → amount=300 | PASS |
| 7 | POST create billable expense → markup=600 | PASS |
| 8 | PATCH update draft → amount=175 | PASS |
| 9 | POST submit → PENDING_APPROVAL | PASS |
| 10 | POST reject, then edit → resets to DRAFT | PASS |
| 11 | POST submit → approve → APPROVED | PASS |
| 12 | POST mark-paid → PAID | PASS |
| 13 | Reimbursable mark-paid → REIMBURSED | PASS |
| 14 | Cannot edit PAID expense | PASS |
| 15 | Void paid expense → VOID | PASS |
| 16 | Cannot void already VOID | PASS |
| 17 | DELETE draft expense | PASS |
| 18 | GET summary → dashboard stats | PASS |
| 19 | Search/filter/pagination | PASS |
| 20 | Recurring auto-clone on mark-paid | PASS |

---

## Files Created (8)

| File | Lines | Purpose |
|------|-------|---------|
| `src/modules/expenses/constants/expense-statuses.constant.ts` | ~80 | Status metadata |
| `src/modules/expenses/constants/recurring-frequencies.constant.ts` | ~40 | Frequency options |
| `src/modules/expenses/dto/create-expense.dto.ts` | ~183 | Create DTO + line item DTO |
| `src/modules/expenses/dto/update-expense.dto.ts` | ~141 | Update DTO (all optional) |
| `src/modules/expenses/dto/query-expenses.dto.ts` | ~100 | Filter/search/sort/paginate |
| `src/modules/expenses/expenses.service.ts` | ~900 | Full business logic |
| `src/modules/expenses/expenses.controller.ts` | ~243 | 14 REST endpoints |
| `src/modules/expenses/expenses.module.ts` | ~10 | Module definition |

## Files Modified (3)

| File | Change |
|------|--------|
| `prisma/schema.prisma` | +2 enums, +2 models, relation updates on 6 models |
| `prisma/seed.ts` | +2 permissions (expense:approve, expense:void) |
| `src/app.module.ts` | +ExpensesModule import |

---

## Running Totals (After Day 12)

| Metric | Count |
|--------|-------|
| Database Tables | 23 |
| Database Enums | 10 |
| API Endpoints | 87 |
| Permissions | 63 |
| Modules | 13 |

---

## Bugs Fixed During Development

1. **Import paths**: Controller imports pointed to `../auth/guards/` instead of `../../common/guards/`
2. **User ID**: Controller used `user.sub` (JWT payload field) instead of `user.id` (Prisma user object)
3. **Prisma XOR type conflict**: Nested `lineItems: { create: [...] }` in `expense.create()` forced Prisma into "checked" mode requiring relation connect syntax. Fixed by separating line item creation with `createMany` after expense creation.
