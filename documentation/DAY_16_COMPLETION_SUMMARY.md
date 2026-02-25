# Day 16 — Estimates & Quotes Module

## Overview
Full-featured Estimates/Quotes module for the sales pipeline. Estimates go through a rich lifecycle from draft to conversion into invoices, with tracking for customer viewing, acceptance, rejection, expiration, and voiding.

## Schema Changes
- **1 new enum**: `EstimateStatus` (DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CONVERTED, VOID)
- **2 new models**: `Estimate`, `EstimateLineItem`
- **Relations added**: Company, Customer, Account, Product, Invoice (converted link)

## New Endpoints (16 total)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | /estimates/summary | estimate:view | Dashboard stats with conversion rate |
| GET | /estimates/next-number | estimate:create | Get next EST-XXXX number |
| GET | /estimates/statuses | estimate:view | All 8 statuses with metadata |
| GET | /estimates | estimate:view | List with filters, search, pagination |
| GET | /estimates/:id | estimate:view | Full estimate detail |
| POST | /estimates | estimate:create | Create draft estimate |
| PATCH | /estimates/:id | estimate:edit | Update draft only |
| DELETE | /estimates/:id | estimate:delete | Delete draft only |
| POST | /estimates/:id/send | estimate:send | DRAFT → SENT |
| POST | /estimates/:id/mark-viewed | estimate:edit | SENT → VIEWED |
| POST | /estimates/:id/accept | estimate:edit | SENT/VIEWED → ACCEPTED |
| POST | /estimates/:id/reject | estimate:edit | SENT/VIEWED → REJECTED |
| POST | /estimates/:id/convert-to-invoice | estimate:convert | ACCEPTED → CONVERTED (creates invoice) |
| POST | /estimates/:id/duplicate | estimate:create | Clone any estimate as new draft |
| POST | /estimates/:id/void | estimate:void | SENT/VIEWED/ACCEPTED → VOID |
| POST | /estimates/expire-overdue | estimate:edit | Batch expire overdue estimates |

## New Permissions (7)
- `estimate:view`, `estimate:create`, `estimate:edit`, `estimate:delete`
- `estimate:send`, `estimate:convert`, `estimate:void`

## Key Features
1. **8-Status Lifecycle**: DRAFT → SENT → VIEWED → ACCEPTED → REJECTED/EXPIRED/VOID → CONVERTED
2. **Convert to Invoice**: One-click conversion copies all line items and creates a draft invoice
3. **Expiration Tracking**: Auto-expire overdue estimates with batch endpoint
4. **Customer Engagement Tracking**: View tracking, acceptance/rejection with reasons
5. **Duplicate/Clone**: Clone any estimate as a new draft
6. **Invoice Link**: Converted estimate maintains reference to the created invoice
7. **Line-Level Calculations**: Per-line discounts, tax, with invoice-level discount support
8. **Customer Message**: Separate field for customer-facing message vs internal notes
9. **Summary Dashboard**: Conversion rate, pending amounts, expiring estimates

## Running Totals (After Day 16)
- **Tables**: 33 (was 31)
- **Enums**: 15 (was 14)
- **Endpoints**: ~146 (was 130, added 16)
- **Permissions**: 83 (was 76, added 7)
- **Modules**: 18 (was 17)

## Seed Data (5 estimates added to seed-dummy.ts)
- **EST-0001**: Tata Consultancy — SENT (cloud migration proposal, 2 line items)
- **EST-0002**: Reliance Digital — ACCEPTED (UI/UX + IT support, 10% discount)
- **EST-0003**: Infosys — DRAFT (mobile app proposal)
- **EST-0004**: Rajesh Sharma — EXPIRED (personal website, past expiration)
- **EST-0005**: Priya Enterprises — CONVERTED (hardware + software bundle, flat discount)

## Test Results (28/28 Passed)
- Static endpoints (statuses, summary, next-number, empty list)
- Create draft estimate with line items
- Update draft estimate
- Send estimate (DRAFT → SENT)
- Edit sent (correctly rejected)
- Mark viewed (SENT → VIEWED)
- Accept estimate (VIEWED → ACCEPTED)
- Convert to invoice (ACCEPTED → CONVERTED, creates INV-XXXX)
- Verify invoice creation
- Duplicate estimate
- Create & reject estimate with reason
- Create, send & void estimate
- Void converted (correctly rejected)
- Delete draft, delete non-draft (correctly rejected)
- Accept expired estimate (correctly rejected)
- Batch expire overdue estimates
- Summary with conversion rate calculation
- List with status and search filters
