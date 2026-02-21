# Day 11: Bills Module (Accounts Payable) - Completion Summary

## Overview
Full-featured Accounts Payable (Bills) module — the vendor-side counterpart to Invoices. Tracks money owed TO vendors, supports the complete bill lifecycle (Draft → Received → Partially Paid → Paid / Overdue / Void), auto-numbering (BILL-0001), multi-line items with per-line discounts, tax, & expense account linking, bill-level discounts, partial payments, inventory INCREASE on receive, inventory DECREASE on void, vendor balance tracking, and dashboard summary stats.

## Key Differences: Bills vs Invoices

| Aspect | Invoice | Bill |
|--------|---------|------|
| Counterparty | Customer | Vendor |
| Direction | We send TO customer | We receive FROM vendor |
| Lifecycle | DRAFT → SENT → PAID | DRAFT → RECEIVED → PAID |
| Inventory | DEDUCTS on send | INCREASES on receive |
| Balance | Updates customer balance | Updates vendor balance |
| Account | depositAccountId (money INTO) | paymentAccountId (money FROM) |
| Line items | No expense account | expenseAccountId per line |
| Extra fields | termsAndConditions | vendorInvoiceNumber, memo |
| Numbering | INV-0001 | BILL-0001 |

## Database Changes

### New Enum (1)
- `BillStatus` — DRAFT, RECEIVED, PARTIALLY_PAID, PAID, OVERDUE, VOID

### New Tables (3)

| Table | Description | Key Fields |
|-------|-------------|------------|
| `bills` | Main bill header | billNumber, status, vendorId, vendorInvoiceNumber, dates, amounts, discounts, tax, paymentAccountId, memo |
| `bill_line_items` | Line items per bill | billId, productId, expenseAccountId, description, quantity, unitPrice, discountPercent, taxPercent, amount |
| `bill_payments` | Payment records against bills | billId, amount, paymentDate, paymentMethod, paymentAccountId, referenceNumber |

### Updated Tables
- `companies` — Added bills[] relation
- `vendors` — Added bills[] relation
- `products` — Added billLineItems[] relation
- `accounts` — Added billPaymentAccounts[], billLineExpenseAccounts[], billPaymentDepositAccounts[] relations

### New Permissions (2)
- `bill:delete` — Delete draft bills (category: expenses, displayOrder: 54)
- `bill:void` — Void received bills (category: expenses, displayOrder: 55)

Total permissions: 61 (was 59)

## API Endpoints (11 total)

### Bills Controller — `/api/v1/bills`
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/bills/summary` | bill:view | Dashboard stats (draft, received, paid, overdue, void counts + amounts) |
| GET | `/bills/next-number` | bill:create | Returns next auto-generated bill number (BILL-0001) |
| GET | `/bills/statuses` | bill:view | Returns all 6 statuses with metadata |
| GET | `/bills` | bill:view | List with filters, search, sort, pagination |
| GET | `/bills/:id` | bill:view | Full detail with line items, payments, vendor |
| POST | `/bills` | bill:create | Create bill (DRAFT) with line items |
| PATCH | `/bills/:id` | bill:edit | Update draft bill (replaces line items) |
| DELETE | `/bills/:id` | bill:delete | Delete draft bill (hard delete) |
| POST | `/bills/:id/receive` | bill:edit | Receive bill (DRAFT → RECEIVED, inventory increased, vendor balance increased) |
| POST | `/bills/:id/void` | bill:void | Void bill (inventory reversed, vendor balance reversed) |
| POST | `/bills/:id/payments` | bill:pay | Record payment (vendor balance decreased) |

## Business Rules

1. **Auto-numbering**: BILL-0001, BILL-0002... per company
2. **DRAFT only**: Edit and delete restricted to DRAFT status
3. **Receive**: DRAFT → RECEIVED, sets receivedAt, calculates dueDate from paymentTerms, INCREASES inventory for INVENTORY products, INCREASES vendor.currentBalance by totalAmount
4. **Void**: RECEIVED/PARTIALLY_PAID → VOID, DECREASES inventory, DECREASES vendor.currentBalance by amountDue, records voidReason
5. **Cannot void PAID**: Fully paid bills cannot be voided
6. **Payments**: Only on RECEIVED/PARTIALLY_PAID bills, cannot overpay, DECREASES vendor.currentBalance by payment amount
7. **Auto-status transitions**: Payment auto-transitions RECEIVED → PARTIALLY_PAID → PAID
8. **Line item calculation**: amount = (qty × unitPrice) - lineDiscount + lineTax
9. **Bill-level discount**: Applied to subtotal (PERCENTAGE or FIXED)
10. **Per-line expense accounts**: Each line item can optionally link to an expense account from the Chart of Accounts
11. **Vendor invoice number**: Store the vendor's own invoice/reference number
12. **Payment terms reuse**: Shared from invoices module (DUE_ON_RECEIPT, NET_10/15/30/45/60/90, CUSTOM)

## Files Created (8 new)

### Bills Module
- `src/modules/bills/constants/bill-statuses.constant.ts`
- `src/modules/bills/dto/create-bill.dto.ts`
- `src/modules/bills/dto/update-bill.dto.ts`
- `src/modules/bills/dto/query-bills.dto.ts`
- `src/modules/bills/dto/record-bill-payment.dto.ts`
- `src/modules/bills/bills.service.ts`
- `src/modules/bills/bills.controller.ts`
- `src/modules/bills/bills.module.ts`

## Files Modified (3)
- `prisma/schema.prisma` — Added BillStatus enum + 3 models + relation updates
- `prisma/seed.ts` — Added bill:delete + bill:void permissions (now 61 total)
- `src/app.module.ts` — Registered BillsModule

## Test Results (All 16 scenarios pass)

| # | Test | Result |
|---|------|--------|
| 1 | GET /bills/next-number → BILL-0001 | ✅ |
| 2 | GET /bills/statuses → 6 statuses with metadata | ✅ |
| 3 | POST /bills → Create with 2 line items (DRAFT), amounts calculated correctly | ✅ |
| 4 | GET /bills → List bills with pagination | ✅ |
| 5 | GET /bills/:id → Full detail with line items, vendor, payments | ✅ |
| 6 | PATCH /bills/:id → Update draft (replace line items, recalculate totals) | ✅ |
| 7 | POST /bills/:id/receive → RECEIVED, inventory +20, vendor balance +653.20, dueDate calculated | ✅ |
| 8a | PATCH after receive → Blocked ("Only draft bills can be edited") | ✅ |
| 8b | DELETE after receive → Blocked ("Only draft bills can be deleted") | ✅ |
| 9 | POST /bills/:id/payments → Partial $200, status → PARTIALLY_PAID, vendor balance -200 | ✅ |
| 10 | Overpayment → Blocked ("Payment amount exceeds amount due") | ✅ |
| 11 | Final payment $453.20 → status → PAID, vendor balance → 0 | ✅ |
| 12 | Void paid bill → Blocked ("Fully paid bills cannot be voided") | ✅ |
| 13 | Create + receive + void 2nd bill → inventory reversed, vendor balance reversed | ✅ |
| 14 | Create + delete draft bill → Hard deleted, 404 on re-fetch | ✅ |
| 15 | GET /bills/summary → Correct counts and amounts by status | ✅ |
| 16 | Search/filter/pagination (status, vendor name, vendor invoice#, limit) | ✅ |

## Running Total

| Metric | Count |
|--------|-------|
| Database tables | 21 |
| Database enums | 8 |
| API endpoints | 73 |
| Seeded permissions | 61 |
| Modules | 12 |
