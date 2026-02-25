# Day 15: Credit Notes & Debit Notes - Frontend Integration Guide

## Base URL
```
http://localhost:3000/api/v1
```

All endpoints require `Authorization: Bearer <token>` header.

---

## Credit Notes API

### 1. Get Status Metadata
```
GET /credit-notes/statuses
```
Returns status info for UI rendering (labels, colors, allowed actions).

**Response:**
```json
{
  "DRAFT": {
    "label": "Draft",
    "color": "#6B7280",
    "allowEdit": true,
    "allowDelete": true,
    "allowOpen": true,
    "allowApply": false,
    "allowRefund": false,
    "allowVoid": false
  },
  "OPEN": {
    "label": "Open",
    "color": "#3B82F6",
    "allowEdit": false,
    "allowDelete": false,
    "allowOpen": false,
    "allowApply": true,
    "allowRefund": true,
    "allowVoid": true
  }
}
```
Use the `allow*` flags to conditionally render action buttons.

### 2. Get Next Credit Note Number
```
GET /credit-notes/next-number
```
Pre-fill the credit note number field.

**Response:**
```json
{ "nextCreditNoteNumber": "CN-0002" }
```

### 3. Create Credit Note (Draft)
```
POST /credit-notes
Content-Type: application/json
```

**Body:**
```json
{
  "customerId": "uuid",
  "invoiceId": "uuid (optional - link to specific invoice)",
  "creditNoteNumber": "CN-0002 (optional - auto-generated if omitted)",
  "referenceNumber": "REF-001 (optional)",
  "creditNoteDate": "2026-02-24",
  "discountType": "PERCENTAGE or FIXED (optional)",
  "discountValue": 10,
  "refundAccountId": "uuid (optional - bank account for refunds)",
  "reason": "Defective goods returned",
  "notes": "Customer returned 2 items",
  "lineItems": [
    {
      "productId": "uuid (optional)",
      "accountId": "uuid (optional - income account to reverse)",
      "description": "Widget A - Return",
      "quantity": 2,
      "unitPrice": 50.00,
      "discountPercent": 0,
      "taxPercent": 10,
      "sortOrder": 0
    }
  ]
}
```

**Line Item Amount Calculation:**
```
lineAmount = quantity × unitPrice
afterDiscount = lineAmount × (1 - discountPercent/100)
amount = afterDiscount × (1 + taxPercent/100)
```

### 4. List Credit Notes
```
GET /credit-notes?status=OPEN&customerId=uuid&dateFrom=2026-01-01&dateTo=2026-12-31&search=CN-&sortBy=creditNoteDate&sortOrder=desc&page=1&limit=20
```

**Query Parameters:**
| Param | Type | Options |
|-------|------|---------|
| status | string | DRAFT, OPEN, PARTIALLY_APPLIED, APPLIED, VOID |
| customerId | UUID | Filter by customer |
| invoiceId | UUID | Filter by linked invoice |
| dateFrom | date | YYYY-MM-DD |
| dateTo | date | YYYY-MM-DD |
| search | string | Search CN number, reference, customer name |
| sortBy | string | creditNoteNumber, creditNoteDate, totalAmount, remainingCredit, status, createdAt |
| sortOrder | string | asc, desc |
| page | number | Min 1 |
| limit | number | Min 1 |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "creditNoteNumber": "CN-0001",
      "status": "OPEN",
      "statusInfo": { "label": "Open", "color": "#3B82F6", ... },
      "creditNoteDate": "2026-02-24T00:00:00.000Z",
      "customer": { "id": "uuid", "displayName": "Customer Name" },
      "totalAmount": 141.35,
      "remainingCredit": 141.35,
      "createdAt": "2026-02-24T17:44:51.662Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

### 5. Get Credit Note Detail
```
GET /credit-notes/:id
```
Returns full credit note with line items, applications, customer, invoice.

### 6. Update Credit Note (DRAFT only)
```
PATCH /credit-notes/:id
Content-Type: application/json
```
Same body as create, all fields optional. Line items are replaced entirely if provided.

### 7. Delete Credit Note (DRAFT only)
```
DELETE /credit-notes/:id
```

### 8. Open/Issue Credit Note
```
POST /credit-notes/:id/open
```
Transitions DRAFT → OPEN. Creates auto journal entry (Debit Income, Credit AR).

### 9. Apply to Invoice(s)
```
POST /credit-notes/:id/apply
Content-Type: application/json
```

**Body:**
```json
{
  "applications": [
    { "invoiceId": "uuid", "amount": 100.00 },
    { "invoiceId": "uuid", "amount": 41.35 }
  ]
}
```

**Validations:**
- Total application amount cannot exceed `remainingCredit`
- Each invoice must belong to the same customer
- Each application amount cannot exceed the invoice's `amountDue`
- Credit note must be OPEN or PARTIALLY_APPLIED

### 10. Refund to Customer
```
POST /credit-notes/:id/refund
Content-Type: application/json
```

**Body:**
```json
{
  "amount": 41.35,
  "refundDate": "2026-02-24",
  "paymentMethod": "BANK_TRANSFER",
  "refundAccountId": "uuid (optional - defaults to CN refundAccountId or Bank fallback)",
  "referenceNumber": "REF-001 (optional)",
  "notes": "Customer refund (optional)"
}
```

**Payment Methods:** `CASH`, `CHECK`, `BANK_TRANSFER`, `CREDIT_CARD`, `OTHER`

### 11. Void Credit Note
```
POST /credit-notes/:id/void
Content-Type: application/json
```

**Body:**
```json
{ "reason": "Customer changed their mind (optional)" }
```
Only reverses the `remainingCredit` portion. Cannot void a fully APPLIED credit note.

### 12. Dashboard Summary
```
GET /credit-notes/summary
```

**Response:**
```json
{
  "draft": { "count": 2, "totalAmount": 500.00 },
  "open": { "count": 3, "totalAmount": 1500.00, "remainingCredit": 1200.00 },
  "partiallyApplied": { "count": 1, "totalAmount": 300.00, "remainingCredit": 100.00 },
  "applied": { "count": 5, "totalAmount": 3000.00 },
  "void": { "count": 1, "totalAmount": 200.00 },
  "totalOutstandingCredit": 1300.00
}
```

---

## Debit Notes API

Same structure as Credit Notes but for vendors/bills.

### Key Differences
| Credit Notes | Debit Notes |
|-------------|-------------|
| `customerId` | `vendorId` |
| `invoiceId` | `billId` |
| `accountId` on line items (income account) | `expenseAccountId` on line items |
| Apply to invoices | Apply to bills |
| Refund = money going OUT to customer | Refund = money coming IN from vendor |

### Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/debit-notes/summary` | Dashboard summary |
| GET | `/debit-notes/next-number` | Next DN number |
| GET | `/debit-notes/statuses` | Status metadata |
| POST | `/debit-notes` | Create draft |
| GET | `/debit-notes` | List with filters |
| GET | `/debit-notes/:id` | Get detail |
| PATCH | `/debit-notes/:id` | Update (DRAFT only) |
| DELETE | `/debit-notes/:id` | Delete (DRAFT only) |
| POST | `/debit-notes/:id/open` | Issue + auto-JE |
| POST | `/debit-notes/:id/apply` | Apply to bill(s) |
| POST | `/debit-notes/:id/refund` | Receive vendor refund + auto-JE |
| POST | `/debit-notes/:id/void` | Void + reversal auto-JE |

### Create Debit Note
```json
{
  "vendorId": "uuid",
  "billId": "uuid (optional)",
  "debitNoteDate": "2026-02-24",
  "reason": "Defective supplies",
  "lineItems": [
    {
      "productId": "uuid (optional)",
      "expenseAccountId": "uuid (optional - expense account to reverse)",
      "description": "Raw Material A - Defective",
      "quantity": 10,
      "unitPrice": 25.00,
      "taxPercent": 5
    }
  ]
}
```

### Apply Debit Note to Bill(s)
```json
{
  "applications": [
    { "billId": "uuid", "amount": 472.50 }
  ]
}
```

### Receive Vendor Refund
```json
{
  "amount": 150.00,
  "refundDate": "2026-02-24",
  "paymentMethod": "BANK_TRANSFER",
  "notes": "Vendor refund received"
}
```

---

## UI Recommendations

### Credit Note Create/Edit Form
1. **Customer selector** — required, loads from GET /customers
2. **Invoice selector** (optional) — filter invoices by selected customer
3. **Credit note number** — pre-fill from GET /credit-notes/next-number
4. **Date picker** — creditNoteDate
5. **Line items table** — product search, description, qty, unit price, discount %, tax %
6. **Totals section** — auto-calculate subtotal, discount, tax, total
7. **Reason/Notes** — textarea fields

### Credit Note List Page
- Status filter tabs (DRAFT, OPEN, PARTIALLY_APPLIED, APPLIED, VOID)
- Use `statusInfo.color` for status badges
- Show `remainingCredit` column for OPEN/PARTIALLY_APPLIED
- Action buttons based on `statusInfo.allow*` flags

### Credit Note Detail Page
- Header: CN number, status badge, customer info, dates
- Line items table
- Totals breakdown
- Applications section (list of invoices it's been applied to)
- Action buttons: Open, Apply, Refund, Void (based on status)
- Journal entries link

### Apply Modal
- Show credit note's `remainingCredit`
- List customer's outstanding invoices with `amountDue`
- Amount input per invoice (max = min of remainingCredit, invoice.amountDue)
- Running total of application amounts

### Debit Note Pages
- Mirror credit note pages with vendor/bill terminology
- "Receive Refund" instead of "Issue Refund"

---

## Permissions Required

| Action | Credit Notes | Debit Notes |
|--------|-------------|-------------|
| View list/detail | `credit-note:view` | `debit-note:view` |
| Create | `credit-note:create` | `debit-note:create` |
| Edit/Open/Apply/Refund | `credit-note:edit` | `debit-note:edit` |
| Delete/Void | `credit-note:delete` | `debit-note:delete` |
