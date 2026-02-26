# Day 17 — Purchase Orders Module

## Overview
Full-featured Purchase Orders module completing the procurement cycle: **PO → Receive Goods → Bill → Payment**. POs go through a lifecycle from draft creation to sending to vendors, receiving goods (with partial receive tracking per line item), and converting to bills for accounting.

## Schema Changes
- **1 new enum**: `PurchaseOrderStatus` (DRAFT, SENT, PARTIAL, RECEIVED, CLOSED, VOID)
- **2 new models**: `PurchaseOrder`, `PurchaseOrderLineItem`
- **Relations added**: Company, Vendor, Product, Account (expense), Bill (converted link)

## New Endpoints (14 total)

| Method | Endpoint | Permission | Description |
|--------|----------|-----------|-------------|
| GET | /purchase-orders/summary | purchase-order:view | Dashboard stats (counts, amounts, overdue deliveries) |
| GET | /purchase-orders/next-number | purchase-order:create | Get next PO-XXXX number |
| GET | /purchase-orders/statuses | purchase-order:view | All 6 statuses with metadata |
| GET | /purchase-orders | purchase-order:view | List with filters, search, pagination |
| GET | /purchase-orders/:id | purchase-order:view | Full PO detail with line items |
| POST | /purchase-orders | purchase-order:create | Create draft PO |
| PATCH | /purchase-orders/:id | purchase-order:edit | Update draft only |
| DELETE | /purchase-orders/:id | purchase-order:delete | Delete draft only |
| POST | /purchase-orders/:id/send | purchase-order:send | DRAFT → SENT |
| POST | /purchase-orders/:id/receive | purchase-order:receive | Record receipt (partial/full) |
| POST | /purchase-orders/:id/convert-to-bill | purchase-order:convert | RECEIVED/PARTIAL → CLOSED (creates Bill DRAFT) |
| POST | /purchase-orders/:id/duplicate | purchase-order:create | Clone any PO as new draft |
| POST | /purchase-orders/:id/close | purchase-order:edit | Manually close RECEIVED/PARTIAL |
| POST | /purchase-orders/:id/void | purchase-order:void | SENT/PARTIAL → VOID |

## New Permissions (8)
- `purchase-order:view`, `purchase-order:create`, `purchase-order:edit`, `purchase-order:delete`
- `purchase-order:send`, `purchase-order:receive`, `purchase-order:convert`, `purchase-order:void`

## Key Features
1. **6-Status Lifecycle**: DRAFT → SENT → PARTIAL/RECEIVED → CLOSED/VOID
2. **Unified Receive Endpoint**: Single endpoint handles both partial and full receives — auto-determines status based on line-level `quantityReceived` tracking
3. **Convert to Bill**: One-click conversion creates a draft bill using received quantities (proportional recalculation for partial POs)
4. **Overdue Delivery Tracking**: Summary dashboard flags SENT/PARTIAL POs past their expected delivery date
5. **Per-Line Receipt Tracking**: Each line item tracks `quantityReceived` independently — supports multi-shipment receiving
6. **Over-Receive Protection**: Server validates that existing + new received quantity never exceeds ordered quantity
7. **Bill Link**: Converted PO maintains reference to created bill via `convertedBillId`
8. **No Auto-JE**: POs are procurement documents — accounting happens when the resulting bill is received via Bills module
9. **Vendor Message**: Separate field for vendor-facing message vs internal notes/memo
10. **Shipping Address**: Full address block (line1, line2, city, state, postal code, country) per PO

## Running Totals (After Day 17)
- **Tables**: 35 (was 33)
- **Enums**: 16 (was 15)
- **Endpoints**: ~160 (was ~146, added 14)
- **Permissions**: 91 (was 83, added 8)
- **Modules**: 19 (was 18)

## Seed Data (5 POs added to seed-dummy.ts)
- **PO-0001**: Dell Technologies — CLOSED (4 laptops + warranty, linked to bill2)
- **PO-0002**: AWS India — SENT (cloud services, awaiting delivery)
- **PO-0003**: TechMart — PARTIAL (2 of 3 desks received, chair pending)
- **PO-0004**: Airtel — RECEIVED (internet + phone, ready to convert)
- **PO-0005**: WeWork — DRAFT (next month rent, pending approval)

## Test Results (27/27 Passed)
- Static endpoints (statuses, summary, next-number, list)
- Create draft PO with 2 line items (total calculated correctly)
- Get PO detail with line items and vendor info
- Update draft PO (description + discount changes)
- Send PO (DRAFT → SENT)
- Edit sent PO (correctly rejected)
- Partial receive (SENT → PARTIAL, quantityReceived incremented)
- Full receive (PARTIAL → RECEIVED, all lines fully received)
- Over-receive rejection (correctly prevented)
- Over-receive on RECEIVED status (correctly rejected)
- Convert to bill (RECEIVED → CLOSED, BILL-XXXX created as DRAFT)
- Verify bill creation with correct amounts and vendor link
- Duplicate PO (cloned as DRAFT, quantityReceived reset to 0)
- Send duplicated PO (DRAFT → SENT)
- Void sent PO (SENT → VOID with reason)
- Create, send, partial receive, close manually (PARTIAL → CLOSED)
- Create and delete draft PO
- Verify deleted PO is gone (404)
- Void closed PO (correctly rejected with helpful message)
- Convert already-converted PO (correctly rejected)
- Summary dashboard with correct counts and amounts
- Search by PO number
- Filter by status
