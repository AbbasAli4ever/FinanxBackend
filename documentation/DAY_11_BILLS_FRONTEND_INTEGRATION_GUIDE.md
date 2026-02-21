# Day 11: Bills Module — Frontend Integration Guide

## Base URL
```
/api/v1/bills
```

## TypeScript Interfaces

```typescript
// === Bill Status ===
type BillStatus = 'DRAFT' | 'RECEIVED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID';

interface BillStatusInfo {
  value: BillStatus;
  label: string;
  color: string;        // hex color for badges
  description: string;
  allowEdit: boolean;
  allowDelete: boolean;
  allowReceive: boolean;
  allowVoid: boolean;
  allowPayment: boolean;
}

// === Bill Line Item ===
interface BillLineItem {
  id: string;
  product: {
    id: string;
    name: string;
    sku: string | null;
    type: string;
  } | null;
  expenseAccount: {
    id: string;
    name: string;
    code: string;
    accountType: string;
  } | null;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  amount: number;        // calculated: (qty × unitPrice - discount + tax)
  sortOrder: number;
}

// === Bill Payment ===
interface BillPayment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  paymentAccount: {
    id: string;
    name: string;
    code: string;
  } | null;
  notes: string | null;
  createdAt: string;
}

// === Bill (Full Detail) ===
interface Bill {
  id: string;
  billNumber: string;            // BILL-0001
  vendorInvoiceNumber: string | null;  // vendor's own reference
  referenceNumber: string | null;
  status: BillStatus;
  statusInfo: BillStatusInfo;
  billDate: string;
  dueDate: string | null;       // calculated on receive
  paymentTerms: string | null;
  vendor: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  };
  lineItems: BillLineItem[];
  subtotal: number;              // sum of (qty × unitPrice)
  discountType: 'PERCENTAGE' | 'FIXED' | null;
  discountValue: number | null;
  discountAmount: number;        // total discount (line + bill-level)
  taxAmount: number;
  totalAmount: number;           // subtotal - discountAmount + taxAmount
  amountPaid: number;
  amountDue: number;
  paymentAccount: { id: string; name: string; code: string } | null;
  notes: string | null;
  memo: string | null;           // internal memo (bills-only field)
  payments: BillPayment[];
  receivedAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// === Bill List Item (abbreviated) ===
interface BillListItem {
  id: string;
  billNumber: string;
  vendorInvoiceNumber: string | null;
  referenceNumber: string | null;
  status: BillStatus;
  statusInfo: BillStatusInfo;
  billDate: string;
  dueDate: string | null;
  paymentTerms: string | null;
  vendor: {
    id: string;
    displayName: string;
    email: string | null;
  };
  lineItemCount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  createdAt: string;
}

// === Summary ===
interface BillSummary {
  draft: { count: number };
  received: { count: number; amount?: number };
  partiallyPaid: { count: number; amount?: number };
  paid: { count: number; amount?: number };
  overdue: { count: number; amount?: number };
  void: { count: number };
  totals: {
    totalBilled: number;
    totalUnpaid: number;
    totalPaid: number;
  };
}
```

## API Endpoints

### 1. Get Bill Summary (Dashboard)
```
GET /api/v1/bills/summary
Permission: bill:view
```

**Response:**
```json
{
  "success": true,
  "message": "Bill summary retrieved successfully",
  "data": {
    "draft": { "count": 2 },
    "received": { "count": 3, "amount": 1500.00 },
    "partiallyPaid": { "count": 1, "amount": 450.00 },
    "paid": { "count": 5, "amount": 8200.00 },
    "overdue": { "count": 1, "amount": 300.00 },
    "void": { "count": 1 },
    "totals": {
      "totalBilled": 10450.00,
      "totalUnpaid": 2250.00,
      "totalPaid": 8200.00
    }
  }
}
```

### 2. Get Next Bill Number
```
GET /api/v1/bills/next-number
Permission: bill:create
```

**Response:**
```json
{
  "success": true,
  "data": { "nextBillNumber": "BILL-0005" }
}
```

### 3. Get Bill Statuses
```
GET /api/v1/bills/statuses
Permission: bill:view
```

**Response:** Array of `BillStatusInfo` objects. Use `color` for status badges and boolean flags to show/hide action buttons.

### 4. List Bills (with filters)
```
GET /api/v1/bills?status=RECEIVED&vendorId=xxx&search=paper&sortBy=billDate&sortOrder=desc&page=1&limit=20
Permission: bill:view
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter: DRAFT, RECEIVED, PARTIALLY_PAID, PAID, OVERDUE, VOID |
| vendorId | UUID | Filter by vendor |
| dateFrom | string | Bills on or after this date (YYYY-MM-DD) |
| dateTo | string | Bills on or before this date (YYYY-MM-DD) |
| search | string | Search billNumber, vendorInvoiceNumber, referenceNumber, vendor name |
| sortBy | string | billDate (default), billNumber, totalAmount, dueDate, createdAt |
| sortOrder | asc/desc | Default: desc |
| page | number | Default: 1 |
| limit | number | Default: 20, max 100 |

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [ /* BillListItem[] */ ],
    "pagination": {
      "total": 42,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

### 5. Get Bill Detail
```
GET /api/v1/bills/:id
Permission: bill:view
```

**Response:** Full `Bill` object with line items, payments, vendor details, and statusInfo.

### 6. Create Bill (DRAFT)
```
POST /api/v1/bills
Permission: bill:create
Content-Type: application/json
```

**Request Body:**
```json
{
  "vendorId": "uuid",
  "billDate": "2026-02-21",
  "billNumber": "BILL-CUSTOM",       // optional, auto-generated if omitted
  "vendorInvoiceNumber": "VS-001",   // optional, vendor's own reference
  "referenceNumber": "PO-2026-042",  // optional
  "paymentTerms": "NET_30",          // optional: DUE_ON_RECEIPT, NET_10/15/30/45/60/90, CUSTOM
  "dueDate": "2026-03-23",           // optional, calculated from paymentTerms on receive
  "discountType": "PERCENTAGE",      // optional: PERCENTAGE or FIXED
  "discountValue": 5,                // optional: percent or fixed amount
  "paymentAccountId": "uuid",        // optional: bank account for payments
  "notes": "Order notes",            // optional
  "memo": "Internal memo",           // optional
  "lineItems": [
    {
      "productId": "uuid",           // optional
      "expenseAccountId": "uuid",    // optional: per-line expense tracking
      "description": "Item desc",    // required
      "quantity": 10,                // required
      "unitPrice": 25.00,            // required
      "discountPercent": 5,          // optional
      "taxPercent": 8,               // optional
      "sortOrder": 0                 // optional
    }
  ]
}
```

### 7. Update Bill (DRAFT only)
```
PATCH /api/v1/bills/:id
Permission: bill:edit
```

Same fields as create, all optional. If `lineItems` is provided, it **replaces** all existing line items.

**Error if not DRAFT:** `400 "Only draft bills can be edited"`

### 8. Delete Bill (DRAFT only)
```
DELETE /api/v1/bills/:id
Permission: bill:delete
```

**Error if not DRAFT:** `400 "Only draft bills can be deleted. To remove a received bill, void it instead."`

### 9. Receive Bill
```
POST /api/v1/bills/:id/receive
Permission: bill:edit
```

No body required. This action:
- Changes status: DRAFT → RECEIVED
- Sets `receivedAt` timestamp
- Calculates `dueDate` from `paymentTerms` (if not manually set)
- **INCREASES inventory** for INVENTORY products (qty from line items)
- **INCREASES vendor.currentBalance** by totalAmount

### 10. Void Bill
```
POST /api/v1/bills/:id/void
Permission: bill:void
Content-Type: application/json
```

**Request Body:**
```json
{
  "reason": "Duplicate order"   // optional but recommended
}
```

This action:
- Changes status: RECEIVED/PARTIALLY_PAID → VOID
- **DECREASES inventory** (reverses receive)
- **DECREASES vendor.currentBalance** by amountDue
- **Cannot void PAID bills** → `400 "Fully paid bills cannot be voided"`

### 11. Record Payment
```
POST /api/v1/bills/:id/payments
Permission: bill:pay
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 200.00,                   // required, min 0.01
  "paymentDate": "2026-02-21",        // required
  "paymentMethod": "BANK_TRANSFER",   // optional: CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, OTHER
  "referenceNumber": "TRX-001",       // optional
  "notes": "First payment",           // optional
  "paymentAccountId": "uuid"          // optional: bank account
}
```

This action:
- Only allowed on RECEIVED/PARTIALLY_PAID bills
- **Cannot overpay** → `400 "Payment amount exceeds amount due"`
- **DECREASES vendor.currentBalance** by payment amount
- Auto-transitions: RECEIVED → PARTIALLY_PAID → PAID

## UI Implementation Guide

### Bills List Page
```
┌──────────────────────────────────────────────────┐
│ Bills (Accounts Payable)              [+ New Bill]│
├──────────────────────────────────────────────────┤
│ Summary Cards (from /bills/summary):              │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│ │  Draft   │ │Received │ │ Overdue │ │  Paid   ││
│ │    2     │ │  $1,500 │ │  $300   │ │ $8,200  ││
│ │         │ │    3    │ │    1    │ │    5    ││
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
├──────────────────────────────────────────────────┤
│ [🔍 Search] [Status ▼] [Vendor ▼] [Date Range]  │
├──────────────────────────────────────────────────┤
│ Bill#    │ Vendor     │ VendorInv │Amount│ Status │
│ BILL-001 │ Office Co  │ VS-001   │$653  │ ● Paid │
│ BILL-002 │ Office Co  │          │$125  │ ● Void │
│ BILL-003 │ Tech Inc   │ TI-445   │$300  │ ● Due  │
└──────────────────────────────────────────────────┘
```

### Bill Detail Page
Use `statusInfo` to dynamically show/hide action buttons:
```typescript
// Action button visibility
const showEditBtn = bill.statusInfo.allowEdit;       // DRAFT only
const showDeleteBtn = bill.statusInfo.allowDelete;   // DRAFT only
const showReceiveBtn = bill.statusInfo.allowReceive;  // DRAFT only
const showVoidBtn = bill.statusInfo.allowVoid;       // RECEIVED, PARTIALLY_PAID
const showPaymentBtn = bill.statusInfo.allowPayment;  // RECEIVED, PARTIALLY_PAID
```

### Bill Form (Create/Edit)
1. **Vendor selector** — Required, from `/api/v1/vendors`
2. **Bill date** — Required date picker
3. **Vendor invoice number** — Text input for vendor's own reference number
4. **Payment terms dropdown** — DUE_ON_RECEIPT, NET_10/15/30/45/60/90, CUSTOM
5. **Discount** — Type (PERCENTAGE/FIXED) + Value
6. **Line items table** — Dynamic rows with:
   - Product selector (optional, from `/api/v1/products`)
   - Expense account selector (optional, from `/api/v1/accounts`)
   - Description (required)
   - Quantity (required)
   - Unit price (required)
   - Discount % (optional)
   - Tax % (optional)
   - Amount (auto-calculated, read-only)
7. **Totals section** — Subtotal, discount, tax, total (all auto-calculated)
8. **Notes** — External notes
9. **Memo** — Internal memo (not visible to vendor)

### Payment Dialog
```typescript
interface RecordPaymentForm {
  amount: number;           // pre-fill with amountDue
  paymentDate: string;      // default: today
  paymentMethod: string;    // dropdown: CASH, CHECK, BANK_TRANSFER, CREDIT_CARD, OTHER
  referenceNumber?: string;
  paymentAccountId?: string; // bank account selector
  notes?: string;
}
```

### Payment Terms Reference
| Code | Days |
|------|------|
| DUE_ON_RECEIPT | 0 |
| NET_10 | 10 |
| NET_15 | 15 |
| NET_30 | 30 |
| NET_45 | 45 |
| NET_60 | 60 |
| NET_90 | 90 |
| CUSTOM | null (use manual dueDate) |

### Required Permissions
| Permission | Actions |
|------------|---------|
| bill:view | View bills list, detail, summary, statuses |
| bill:create | Create new bills, get next number |
| bill:edit | Update draft bills, receive bills |
| bill:delete | Delete draft bills |
| bill:void | Void received/partially paid bills |
| bill:pay | Record payments against bills |

## Error Responses
All errors follow the standard format:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human-readable error message"
}
```

Common errors:
- `400` — Validation error, status restriction, overpayment
- `404` — Bill/vendor/product/account not found
- `409` — Duplicate bill number
