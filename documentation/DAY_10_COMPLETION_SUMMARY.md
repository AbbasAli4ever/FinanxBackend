# Day 10: Invoices Module - Completion Summary

## Overview
Full-featured invoicing system rivaling QuickBooks, Xero, and Zoho Books. Supports complete invoice lifecycle (Draft → Sent → Partially Paid → Paid / Overdue / Void), auto-numbering, multi-line items with per-line discounts & tax, invoice-level discounts, partial payments, inventory deduction on send, inventory restoration on void, and dashboard summary stats.

## Database Changes

### New Enums (3)
- `InvoiceStatus` — DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, VOID
- `DiscountType` — PERCENTAGE, FIXED
- `PaymentMethod` — CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, OTHER

### New Tables (3)

| Table | Description | Key Fields |
|-------|-------------|------------|
| `invoices` | Main invoice header | invoiceNumber, status, customerId, dates, amounts, discounts, tax |
| `invoice_line_items` | Line items per invoice | invoiceId, productId, description, quantity, unitPrice, discountPercent, taxPercent, amount |
| `invoice_payments` | Payment records against invoices | invoiceId, amount, paymentDate, paymentMethod, referenceNumber |

### Updated Tables
- `companies` — Added invoices[] relation
- `customers` — Added invoices[] relation
- `products` — Added invoiceLineItems[] relation
- `accounts` — Added invoiceDepositAccounts[], paymentDepositAccounts[] relations

## API Endpoints (11 total)

### Invoices Controller — `/api/v1/invoices`
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/invoices/summary` | invoice:view | Dashboard stats (draft, sent, paid, overdue, void counts + amounts) |
| GET | `/invoices/next-number` | invoice:create | Returns next auto-generated invoice number |
| GET | `/invoices/statuses` | invoice:view | Returns all 6 statuses with metadata |
| GET | `/invoices` | invoice:view | List with filters, search, sort, pagination |
| GET | `/invoices/:id` | invoice:view | Full detail with line items, payments, customer |
| POST | `/invoices` | invoice:create | Create invoice (DRAFT) with line items |
| PATCH | `/invoices/:id` | invoice:edit | Update draft invoice |
| DELETE | `/invoices/:id` | invoice:delete | Delete draft invoice (hard delete) |
| POST | `/invoices/:id/send` | invoice:send | Send invoice (DRAFT → SENT) |
| POST | `/invoices/:id/void` | invoice:void | Void invoice (restores inventory) |
| POST | `/invoices/:id/payments` | invoice:edit | Record payment against invoice |

## Business Rules

1. **Auto-numbering**: INV-0001, INV-0002... per company
2. **DRAFT only**: Edit and delete restricted to DRAFT status
3. **Send**: DRAFT → SENT, calculates dueDate from paymentTerms (NET_30 default), deducts inventory for INVENTORY products
4. **Void**: SENT/PARTIALLY_PAID → VOID, restores inventory, records voidReason
5. **Cannot void PAID**: Fully paid invoices cannot be voided
6. **Payments**: Only on SENT/PARTIALLY_PAID invoices, cannot overpay
7. **Auto-status transitions**: Payment auto-transitions SENT → PARTIALLY_PAID → PAID
8. **Line item calculation**: amount = (qty × unitPrice) - lineDiscount + lineTax
9. **Invoice-level discount**: Applied to subtotal (PERCENTAGE or FIXED)
10. **Payment terms**: DUE_ON_RECEIPT, NET_10/15/30/45/60/90, CUSTOM

## Files Created (9 new)

### Invoices Module
- `src/modules/invoices/constants/invoice-statuses.constant.ts`
- `src/modules/invoices/constants/payment-terms.constant.ts`
- `src/modules/invoices/dto/create-invoice.dto.ts`
- `src/modules/invoices/dto/update-invoice.dto.ts`
- `src/modules/invoices/dto/query-invoices.dto.ts`
- `src/modules/invoices/dto/record-payment.dto.ts`
- `src/modules/invoices/invoices.service.ts`
- `src/modules/invoices/invoices.controller.ts`
- `src/modules/invoices/invoices.module.ts`

## Files Modified
- `prisma/schema.prisma` — Added 3 enums + 3 models + relation updates
- `src/app.module.ts` — Registered InvoicesModule

## Pre-existing Permissions (already seeded)
- `invoice:view`, `invoice:create`, `invoice:edit`, `invoice:delete`, `invoice:send`, `invoice:void`
- Role mappings: company_admin (all), standard (view/create/edit/send), limited (view/create/edit), reports_only (view)

## Test Results
All 11 endpoints tested and verified:
- Invoice creation (DRAFT) with line items ✅
- Auto invoice number generation (INV-0001) ✅
- Line item calculations (quantity × price - discount + tax) ✅
- Invoice-level percentage discount ✅
- Update draft invoice (replace line items) ✅
- Delete draft invoice (hard delete) ✅
- Send invoice (DRAFT → SENT, inventory deducted) ✅
- Due date auto-calculation from payment terms ✅
- Edit/delete prevention on non-draft invoices ✅
- Partial payment (SENT → PARTIALLY_PAID) ✅
- Full payment (PARTIALLY_PAID → PAID) ✅
- Overpayment prevention ✅
- Void sent invoice (inventory restored) ✅
- Void prevention on paid invoices ✅
- Invoice summary (dashboard stats) ✅
- Search by invoice number and customer name ✅
- Filter by status ✅
- Invoice statuses endpoint ✅
- Next number endpoint ✅
- Permission enforcement ✅
