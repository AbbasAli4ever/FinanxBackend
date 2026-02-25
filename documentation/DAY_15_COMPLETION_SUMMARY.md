# Day 15: Credit Notes & Debit Notes - Completion Summary

## Overview

Day 15 adds two essential accounting modules for handling adjustments and refunds:

- **Credit Notes** — Issue credits to customers, apply to outstanding invoices, or refund directly
- **Debit Notes** — Issue debit notes to vendors, apply to outstanding bills, or receive vendor refunds

Both modules follow the same lifecycle: DRAFT → OPEN → PARTIALLY_APPLIED/APPLIED → VOID, with automatic journal entries at each state transition.

## What Was Built

### Schema Changes
- **2 new enums**: `CreditNoteStatus`, `DebitNoteStatus` (DRAFT, OPEN, PARTIALLY_APPLIED, APPLIED, VOID)
- **6 new models**:
  - `CreditNote` — Header with customer link, amounts, tracking fields
  - `CreditNoteLineItem` — Per-line detail with optional product/account
  - `CreditNoteApplication` — Junction table linking credit notes to invoices
  - `DebitNote` — Header with vendor link, amounts, tracking fields
  - `DebitNoteLineItem` — Per-line detail with optional product/expense account
  - `DebitNoteApplication` — Junction table linking debit notes to bills
- **Relation updates** to Company, Customer, Vendor, Invoice, Bill, Product, Account models

### Credit Notes Module (13 endpoints)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/credit-notes/summary` | Dashboard summary stats |
| GET | `/credit-notes/next-number` | Next CN number (CN-0001, CN-0002...) |
| GET | `/credit-notes/statuses` | Status metadata with action flags |
| POST | `/credit-notes` | Create draft credit note |
| GET | `/credit-notes` | List with filters/pagination |
| GET | `/credit-notes/:id` | Get detail |
| PATCH | `/credit-notes/:id` | Update (DRAFT only) |
| DELETE | `/credit-notes/:id` | Delete (DRAFT only) |
| POST | `/credit-notes/:id/open` | Issue (DRAFT→OPEN) + auto-JE |
| POST | `/credit-notes/:id/apply` | Apply to invoice(s) |
| POST | `/credit-notes/:id/refund` | Refund to customer + auto-JE |
| POST | `/credit-notes/:id/void` | Void + reversal auto-JE |

### Debit Notes Module (13 endpoints)
Same structure as credit notes but targeting vendors/bills:
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/debit-notes/summary` | Dashboard summary stats |
| GET | `/debit-notes/next-number` | Next DN number (DN-0001, DN-0002...) |
| GET | `/debit-notes/statuses` | Status metadata with action flags |
| POST | `/debit-notes` | Create draft debit note |
| GET | `/debit-notes` | List with filters/pagination |
| GET | `/debit-notes/:id` | Get detail |
| PATCH | `/debit-notes/:id` | Update (DRAFT only) |
| DELETE | `/debit-notes/:id` | Delete (DRAFT only) |
| POST | `/debit-notes/:id/open` | Issue (DRAFT→OPEN) + auto-JE |
| POST | `/debit-notes/:id/apply` | Apply to bill(s) |
| POST | `/debit-notes/:id/refund` | Receive vendor refund + auto-JE |
| POST | `/debit-notes/:id/void` | Void + reversal auto-JE |

### Permissions (8 new)
| Code | Category | Roles |
|------|----------|-------|
| `credit-note:view` | sales | admin, standard, limited, reports_only |
| `credit-note:create` | sales | admin, standard |
| `credit-note:edit` | sales | admin, standard |
| `credit-note:delete` | sales | admin |
| `debit-note:view` | expenses | admin, standard, reports_only |
| `debit-note:create` | expenses | admin, standard |
| `debit-note:edit` | expenses | admin, standard |
| `debit-note:delete` | expenses | admin |

## Auto-JE Accounting Logic

### Credit Note Events
| Event | Debit | Credit | Amount |
|-------|-------|--------|--------|
| `open()` | Per-line account (or 'Income') | Accounts Receivable | totalAmount |
| `apply()` | No new JE | — | — |
| `refund()` | Accounts Receivable | Bank (refundAccountId or fallback) | refund amount |
| `void()` | Accounts Receivable | Per-line account (or 'Income') | remainingCredit only |

### Debit Note Events
| Event | Debit | Credit | Amount |
|-------|-------|--------|--------|
| `open()` | Accounts Payable | Per-line expense account (or 'COGS') | totalAmount |
| `apply()` | No new JE | — | — |
| `refund()` | Bank (refundAccountId or fallback) | Accounts Payable | refund amount |
| `void()` | Per-line expense account (or 'COGS') | Accounts Payable | remainingCredit only |

**Key design decision**: Apply operations don't create JEs — the Open JE already adjusted AR/AP. Application only updates the invoice/bill's `amountDue` internally.

## Files Created (16)

### Credit Notes
- `src/modules/credit-notes/credit-notes.module.ts`
- `src/modules/credit-notes/credit-notes.service.ts`
- `src/modules/credit-notes/credit-notes.controller.ts`
- `src/modules/credit-notes/constants/credit-note-statuses.constant.ts`
- `src/modules/credit-notes/dto/create-credit-note.dto.ts`
- `src/modules/credit-notes/dto/update-credit-note.dto.ts`
- `src/modules/credit-notes/dto/query-credit-notes.dto.ts`
- `src/modules/credit-notes/dto/apply-credit-note.dto.ts`
- `src/modules/credit-notes/dto/refund-credit-note.dto.ts`

### Debit Notes
- `src/modules/debit-notes/debit-notes.module.ts`
- `src/modules/debit-notes/debit-notes.service.ts`
- `src/modules/debit-notes/debit-notes.controller.ts`
- `src/modules/debit-notes/constants/debit-note-statuses.constant.ts`
- `src/modules/debit-notes/dto/create-debit-note.dto.ts`
- `src/modules/debit-notes/dto/update-debit-note.dto.ts`
- `src/modules/debit-notes/dto/query-debit-notes.dto.ts`
- `src/modules/debit-notes/dto/apply-debit-note.dto.ts`
- `src/modules/debit-notes/dto/refund-debit-note.dto.ts`

## Files Modified (3)
- `prisma/schema.prisma` — 2 enums, 6 models, relation updates
- `src/app.module.ts` — Import CreditNotesModule, DebitNotesModule
- `prisma/seed.ts` — 8 new permissions + role mappings

## Test Results (All Passing)

| # | Test | Result |
|---|------|--------|
| 1 | GET /credit-notes/statuses | 5 statuses with action flags |
| 2 | GET /credit-notes (empty) | Empty array, pagination |
| 3 | GET /debit-notes/statuses | 5 statuses with action flags |
| 4 | GET /debit-notes (empty) | Empty array, pagination |
| 5 | Create credit note (DRAFT) | CN-0001, total $141.35 |
| 6 | Update draft credit note | Notes updated |
| 7 | Get next CN number | CN-0002 |
| 8 | Open credit note | Status=OPEN, auto-JE created |
| 9 | Apply CN to invoice (partial $100) | CN=PARTIALLY_APPLIED, invoice amountDue reduced |
| 10 | Refund remaining credit ($41.35) | CN=APPLIED, auto-JE created |
| 11 | Create debit note (DRAFT) | DN-0001, total $472.50 |
| 12 | Open debit note | Status=OPEN, auto-JE created |
| 13 | Apply DN to bill ($472.50) | DN=APPLIED, bill amountDue reduced |
| 14 | Receive vendor refund (partial $150) | DN=PARTIALLY_APPLIED |
| 15 | Void partially applied DN | Only reverses remaining $150 |
| 16 | Credit notes summary | Accurate counts and totals |
| 17 | Debit notes summary | Accurate counts and totals |
| 18 | Delete draft credit note | Hard delete succeeds |

## Running Totals After Day 15

| Metric | Before | Added | After |
|--------|--------|-------|-------|
| Tables | 25 | +6 | 31 |
| Enums | 12 | +2 | 14 |
| Endpoints | 104 | +26 | 130 |
| Permissions | 68 | +8 | 76 |
| Modules | 15 | +2 | 17 |
