# Day 10: Invoices — Frontend Integration Guide

## Base URL
```
/api/v1/invoices
```

All endpoints require `Authorization: Bearer <token>`.

---

## TypeScript Interfaces

```typescript
interface InvoiceLineItem {
  id: string;
  product: { id: string; name: string; sku: string; type: string } | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  amount: number;
  sortOrder: number;
}

interface InvoicePayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'CASH' | 'CHECK' | 'BANK_TRANSFER' | 'CREDIT_CARD' | 'OTHER';
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

interface StatusInfo {
  label: string;
  color: string;
  description: string;
  allowEdit: boolean;
  allowDelete: boolean;
  allowSend: boolean;
  allowVoid: boolean;
  allowPayment: boolean;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  referenceNumber: string | null;
  status: 'DRAFT' | 'SENT' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';
  statusInfo: StatusInfo;
  invoiceDate: string;
  dueDate: string | null;
  paymentTerms: string | null;
  customer: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    billingAddressLine1: string | null;
    billingAddressLine2: string | null;
    billingCity: string | null;
    billingState: string | null;
    billingPostalCode: string | null;
    billingCountry: string | null;
  };
  lineItems: InvoiceLineItem[];
  subtotal: number;
  discountType: 'PERCENTAGE' | 'FIXED' | null;
  discountValue: number | null;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  depositAccount: { id: string; name: string; accountNumber: string } | null;
  notes: string | null;
  termsAndConditions: string | null;
  payments: InvoicePayment[];
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  referenceNumber: string | null;
  status: string;
  statusInfo: StatusInfo;
  invoiceDate: string;
  dueDate: string | null;
  customer: { id: string; displayName: string; email: string | null };
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  lineItemCount: number;
  paymentCount: number;
  createdAt: string;
}

interface InvoiceSummary {
  draft: { count: number };
  sent: { count: number };
  partiallyPaid: { count: number };
  paid: { count: number; amount: number };
  overdue: { count: number; amount: number };
  void: { count: number };
  totals: {
    totalInvoiced: number;
    totalUnpaid: number;
    totalPaid: number;
  };
}
```

---

## API Endpoints

### 1. Get Invoice Summary (Dashboard)
```
GET /invoices/summary
```
**Response:**
```json
{
  "success": true,
  "data": {
    "draft": { "count": 2 },
    "sent": { "count": 5 },
    "partiallyPaid": { "count": 1 },
    "paid": { "count": 10, "amount": 45000.00 },
    "overdue": { "count": 2, "amount": 3500.00 },
    "void": { "count": 1 },
    "totals": {
      "totalInvoiced": 52000.00,
      "totalUnpaid": 7000.00,
      "totalPaid": 45000.00
    }
  }
}
```

### 2. Get Next Invoice Number
```
GET /invoices/next-number
```
**Response:**
```json
{
  "success": true,
  "data": { "nextInvoiceNumber": "INV-0005" }
}
```

### 3. Get Invoice Statuses
```
GET /invoices/statuses
```
Returns all 6 statuses with metadata (label, color, allowed actions).

### 4. List Invoices (with filters)
```
GET /invoices?status=SENT&search=acme&dateFrom=2026-01-01&dateTo=2026-12-31&sortBy=totalAmount&sortOrder=desc&page=1&limit=20
```
**Query Parameters:**
| Param | Type | Options |
|-------|------|---------|
| status | string | DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, VOID |
| customerId | string (UUID) | Filter by customer |
| dateFrom | string (YYYY-MM-DD) | Invoice date range start |
| dateTo | string (YYYY-MM-DD) | Invoice date range end |
| search | string | Searches invoiceNumber, referenceNumber, customer displayName |
| sortBy | string | invoiceNumber, invoiceDate, dueDate, totalAmount, amountDue, status, createdAt |
| sortOrder | string | asc, desc |
| page | number | Min: 1 (default: 1) |
| limit | number | Min: 1 (default: 20) |

### 5. Get Invoice Detail
```
GET /invoices/:id
```
Returns full invoice with lineItems, payments, customer, depositAccount.

### 6. Create Invoice
```
POST /invoices
```
**Body:**
```json
{
  "customerId": "uuid",
  "invoiceDate": "2026-02-20",
  "dueDate": "2026-03-22",
  "paymentTerms": "NET_30",
  "invoiceNumber": "INV-CUSTOM",
  "referenceNumber": "PO-12345",
  "discountType": "PERCENTAGE",
  "discountValue": 10,
  "depositAccountId": "uuid",
  "notes": "Thank you for your business",
  "termsAndConditions": "Payment due within 30 days",
  "lineItems": [
    {
      "productId": "uuid",
      "description": "Web Development - 10 hours",
      "quantity": 10,
      "unitPrice": 150,
      "discountPercent": 0,
      "taxPercent": 8.5,
      "sortOrder": 0
    },
    {
      "description": "Custom line item (no product)",
      "quantity": 1,
      "unitPrice": 500,
      "taxPercent": 0
    }
  ]
}
```
**Required:** customerId, invoiceDate, lineItems (min 1 item with description, quantity, unitPrice)
**Optional:** invoiceNumber (auto-generated if omitted), referenceNumber, dueDate, paymentTerms, discountType/Value, depositAccountId, notes, termsAndConditions

**Payment Terms Options:**
- `DUE_ON_RECEIPT` — 0 days
- `NET_10` — 10 days
- `NET_15` — 15 days
- `NET_30` — 30 days (default if not specified when sending)
- `NET_45` — 45 days
- `NET_60` — 60 days
- `NET_90` — 90 days
- `CUSTOM` — Manual dueDate required

### 7. Update Invoice (DRAFT only)
```
PATCH /invoices/:id
```
Same body as create, all fields optional. If `lineItems` provided, replaces all existing line items.

### 8. Delete Invoice (DRAFT only)
```
DELETE /invoices/:id
```
Hard deletes the invoice. Only works on DRAFT status.

### 9. Send Invoice
```
POST /invoices/:id/send
```
No body required. Changes status to SENT, sets sentAt, calculates dueDate from paymentTerms.

**Side effects:** Deducts inventory for INVENTORY-type products in line items.

### 10. Void Invoice
```
POST /invoices/:id/void
```
**Body (optional):**
```json
{ "reason": "Customer cancelled order" }
```
Only works on SENT or PARTIALLY_PAID invoices. Cannot void PAID invoices.

**Side effects:** Restores inventory for INVENTORY-type products.

### 11. Record Payment
```
POST /invoices/:id/payments
```
**Body:**
```json
{
  "amount": 1000,
  "paymentDate": "2026-02-20",
  "paymentMethod": "BANK_TRANSFER",
  "referenceNumber": "TXN-001",
  "notes": "Wire transfer received",
  "depositAccountId": "uuid"
}
```
**Required:** amount (min 0.01), paymentDate
**Validation:** Cannot exceed amountDue

---

## UI Implementation Guide

### Invoice Status Badges
Use `statusInfo.color` and `statusInfo.label` for consistent badge rendering:
```tsx
const StatusBadge = ({ status, statusInfo }) => (
  <span style={{ backgroundColor: statusInfo.color, color: 'white', padding: '2px 8px', borderRadius: '12px' }}>
    {statusInfo.label}
  </span>
);
```

### Conditional Action Buttons
Use `statusInfo` flags to show/hide actions:
```tsx
{statusInfo.allowEdit && <EditButton />}
{statusInfo.allowDelete && <DeleteButton />}
{statusInfo.allowSend && <SendButton />}
{statusInfo.allowVoid && <VoidButton />}
{statusInfo.allowPayment && <RecordPaymentButton />}
```

### Invoice Form — Line Item Calculator
```typescript
function calculateLineItem(quantity: number, unitPrice: number, discountPercent: number, taxPercent: number) {
  const subtotal = quantity * unitPrice;
  const discount = subtotal * (discountPercent / 100);
  const afterDiscount = subtotal - discount;
  const tax = afterDiscount * (taxPercent / 100);
  return Math.round((afterDiscount + tax) * 10000) / 10000;
}
```

### Invoice Form — Total Calculator
```typescript
function calculateInvoiceTotals(lineItems, discountType, discountValue) {
  const subtotal = lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);

  const lineDiscountTotal = lineItems.reduce((sum, li) => {
    return sum + (li.quantity * li.unitPrice * (li.discountPercent || 0) / 100);
  }, 0);

  const lineTaxTotal = lineItems.reduce((sum, li) => {
    const sub = li.quantity * li.unitPrice;
    const disc = sub * ((li.discountPercent || 0) / 100);
    return sum + (sub - disc) * ((li.taxPercent || 0) / 100);
  }, 0);

  let invoiceDiscount = 0;
  if (discountType === 'PERCENTAGE' && discountValue) {
    invoiceDiscount = subtotal * (discountValue / 100);
  } else if (discountType === 'FIXED' && discountValue) {
    invoiceDiscount = discountValue;
  }

  return {
    subtotal,
    discountAmount: lineDiscountTotal + invoiceDiscount,
    taxAmount: lineTaxTotal,
    totalAmount: subtotal - lineDiscountTotal - invoiceDiscount + lineTaxTotal,
  };
}
```

### Dashboard Summary Cards
```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   Draft (2)  │ │  Unpaid (5)  │ │ Overdue (2)  │ │  Paid (10)   │
│              │ │  $7,000.00   │ │  $3,500.00   │ │ $45,000.00   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

### Invoice Lifecycle Flow
```
DRAFT ──── Send ────→ SENT ──── Payment ────→ PARTIALLY_PAID ──── Full Payment ────→ PAID
  │                    │                          │
  │ Delete             │ Void                     │ Void
  ↓                    ↓                          ↓
(removed)            VOID                       VOID
```
