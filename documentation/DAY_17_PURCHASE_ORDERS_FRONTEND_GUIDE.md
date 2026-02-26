# Purchase Orders — Frontend Integration Guide

## Base URL
```
/api/v1/purchase-orders
```

## Authentication
All endpoints require JWT Bearer token.

---

## Endpoints

### 1. Get Statuses
```
GET /purchase-orders/statuses
```
Returns all 6 statuses with labels, colors, descriptions, and allowed actions.

**Response:**
```json
[
  {
    "value": "DRAFT",
    "label": "Draft",
    "color": "#6B7280",
    "description": "Purchase order is being prepared and has not been sent to vendor",
    "allowEdit": true,
    "allowDelete": true,
    "allowSend": true,
    "allowReceive": false,
    "allowConvert": false,
    "allowClose": false,
    "allowVoid": false
  }
]
```

### 2. Get Summary (Dashboard)
```
GET /purchase-orders/summary
```
**Response:**
```json
{
  "draft": { "count": 1 },
  "sent": { "count": 2, "amount": 15000 },
  "partial": { "count": 1, "amount": 5000 },
  "received": { "count": 1, "amount": 8000 },
  "closed": { "count": 3, "amount": 25000 },
  "void": { "count": 1 },
  "overdueDelivery": { "count": 1, "amount": 5000 },
  "totals": {
    "totalPending": 20000,
    "totalReceived": 33000
  }
}
```

### 3. Get Next Number
```
GET /purchase-orders/next-number
```
**Response:** `{ "nextPONumber": "PO-0001" }`

### 4. List Purchase Orders
```
GET /purchase-orders?status=SENT&vendorId=uuid&dateFrom=2026-01-01&dateTo=2026-02-28&search=laptop&sortBy=poDate&sortOrder=desc&page=1&limit=20
```

**Query Parameters:**
| Param | Type | Values |
|-------|------|--------|
| status | string | DRAFT, SENT, PARTIAL, RECEIVED, CLOSED, VOID |
| vendorId | UUID | Filter by vendor |
| dateFrom | date | YYYY-MM-DD |
| dateTo | date | YYYY-MM-DD |
| search | string | Searches PO number, reference number, vendor display name |
| sortBy | string | poNumber, poDate, expectedDeliveryDate, totalAmount, status, createdAt |
| sortOrder | string | asc, desc |
| page | number | >= 1 |
| limit | number | >= 1 |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "poNumber": "PO-0001",
      "status": "SENT",
      "poDate": "2026-02-26",
      "expectedDeliveryDate": "2026-03-15",
      "totalAmount": "6608",
      "vendor": { "id": "uuid", "displayName": "Dell Technologies" },
      "lineItemCount": 2,
      "convertedBill": null,
      "createdAt": "2026-02-26T..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "totalPages": 1 }
}
```

### 5. Get Purchase Order Detail
```
GET /purchase-orders/:id
```
Returns full PO with vendor, line items (with products and expense accounts), and converted bill reference.

**Response:**
```json
{
  "id": "uuid",
  "poNumber": "PO-0001",
  "status": "SENT",
  "poDate": "2026-02-26",
  "expectedDeliveryDate": "2026-03-15",
  "paymentTerms": "Net 30",
  "subtotal": "5600",
  "discountType": null,
  "discountValue": "0",
  "discountAmount": "0",
  "taxAmount": "1008",
  "totalAmount": "6608",
  "shippingAddressLine1": "42, Tech Park",
  "shippingCity": "Noida",
  "shippingState": "Uttar Pradesh",
  "shippingPostalCode": "201301",
  "shippingCountry": "IN",
  "notes": "Internal notes",
  "memo": null,
  "vendorMessage": "Please expedite delivery",
  "vendor": { "id": "uuid", "displayName": "Dell Technologies" },
  "lineItems": [
    {
      "id": "uuid",
      "product": null,
      "expenseAccount": null,
      "description": "Cloud Hosting Services",
      "quantity": 1,
      "unitPrice": 5000,
      "discountPercent": 0,
      "taxPercent": 18,
      "amount": 5900,
      "quantityReceived": 0,
      "sortOrder": 0
    }
  ],
  "convertedBill": null,
  "sentAt": "2026-02-26T...",
  "receivedAt": null,
  "closedAt": null,
  "voidedAt": null,
  "voidReason": null,
  "createdAt": "2026-02-26T...",
  "updatedAt": "2026-02-26T..."
}
```

### 6. Create Purchase Order
```
POST /purchase-orders
```
**Body:**
```json
{
  "vendorId": "uuid",
  "poDate": "2026-02-26",
  "expectedDeliveryDate": "2026-03-15",
  "paymentTerms": "Net 30",
  "referenceNumber": "REF-001",
  "discountType": "PERCENTAGE",
  "discountValue": 5,
  "shippingAddressLine1": "42, Tech Park, Sector 62",
  "shippingAddressLine2": "Building B",
  "shippingCity": "Noida",
  "shippingState": "Uttar Pradesh",
  "shippingPostalCode": "201301",
  "shippingCountry": "IN",
  "notes": "Internal notes",
  "memo": "Memo text",
  "vendorMessage": "Message to vendor",
  "lineItems": [
    {
      "productId": "uuid",
      "expenseAccountId": "uuid",
      "description": "Cloud Hosting Services",
      "quantity": 1,
      "unitPrice": 5000,
      "discountPercent": 0,
      "taxPercent": 18,
      "sortOrder": 0
    }
  ]
}
```

**Required fields:** `vendorId`, `poDate`, `lineItems` (min 1 item with `description`, `quantity`, `unitPrice`)

### 7. Update Purchase Order (Draft Only)
```
PATCH /purchase-orders/:id
```
Same body as create, all fields optional. If `lineItems` provided, replaces all existing lines.

### 8. Delete Purchase Order (Draft Only)
```
DELETE /purchase-orders/:id
```

### 9. Send Purchase Order
```
POST /purchase-orders/:id/send
```
DRAFT → SENT. Sets `sentAt` timestamp. Defaults `expectedDeliveryDate` to `poDate + 30 days` if not set.

### 10. Receive Items
```
POST /purchase-orders/:id/receive
```
SENT/PARTIAL → PARTIAL or RECEIVED (auto-determined).

**Body:**
```json
{
  "receivedDate": "2026-03-10",
  "items": [
    {
      "lineItemId": "uuid",
      "quantityReceived": 3
    },
    {
      "lineItemId": "uuid",
      "quantityReceived": 12
    }
  ]
}
```

**Key Behavior:**
- `quantityReceived` is **additive** — it adds to the existing received count per line
- If ALL lines are fully received (quantityReceived >= quantity), status → RECEIVED
- If SOME lines have received items but not all, status → PARTIAL
- Server rejects if `existingReceived + newReceived > orderedQuantity`
- `receivedDate` is optional (for recording when the goods arrived)

### 11. Convert to Bill
```
POST /purchase-orders/:id/convert-to-bill
```
RECEIVED/PARTIAL → CLOSED. Creates a new DRAFT bill with received quantities.

**Key Behavior:**
- Bill line items use `quantityReceived` (not `quantity`) — amounts are recalculated proportionally
- Bill is created with `referenceNumber = poNumber` for traceability
- PO gets `convertedBillId` set, status → CLOSED

**Response:**
```json
{
  "id": "po-uuid",
  "status": "CLOSED",
  "convertedBill": {
    "id": "bill-uuid",
    "billNumber": "BILL-0006",
    "status": "DRAFT",
    "totalAmount": "6608"
  }
}
```

### 12. Duplicate Purchase Order
```
POST /purchase-orders/:id/duplicate
```
Creates a new DRAFT PO with all line items from any existing PO. `quantityReceived` is reset to 0.

### 13. Close Purchase Order
```
POST /purchase-orders/:id/close
```
RECEIVED/PARTIAL → CLOSED. Manual close without converting to bill (e.g., cancelled delivery, goods returned).

### 14. Void Purchase Order
```
POST /purchase-orders/:id/void
```
SENT/PARTIAL → VOID.

**Body:** `{ "reason": "Vendor changed pricing" }` (optional)

**Edge case responses:**
- DRAFT PO: "Draft purchase orders should be deleted rather than voided"
- CLOSED PO: "Closed purchase orders cannot be voided. Void the resulting bill instead."
- RECEIVED PO: "Fully received purchase orders cannot be voided. Close or convert to bill instead."

---

## Lifecycle Flow
```
DRAFT → SENT → PARTIAL → RECEIVED
         ↓       ↓  ↑       ↓
        VOID    VOID  receive  CLOSED (manual or convert-to-bill)
                  ↓
                CLOSED (manual or convert-to-bill)

DRAFT → DELETE (hard delete)
```

## Status Colors (for UI)
| Status | Label | Color | Hex |
|--------|-------|-------|-----|
| DRAFT | Draft | Gray | #6B7280 |
| SENT | Sent | Blue | #3B82F6 |
| PARTIAL | Partially Received | Amber | #F59E0B |
| RECEIVED | Received | Green | #10B981 |
| CLOSED | Closed | Emerald | #059669 |
| VOID | Void | Gray | #9CA3AF |

## Permissions (8)
| Permission | Usage |
|-----------|-------|
| `purchase-order:view` | View list, detail, statuses, summary |
| `purchase-order:create` | Create new PO, duplicate |
| `purchase-order:edit` | Update draft, close |
| `purchase-order:delete` | Delete draft |
| `purchase-order:send` | Send to vendor |
| `purchase-order:receive` | Record received items |
| `purchase-order:convert` | Convert to bill |
| `purchase-order:void` | Void PO |

## UI Recommendations

### Purchase Order List Page
- Show status badges with colors from the status metadata
- Display PO number, vendor name, PO date, expected delivery date, total amount
- Highlight overdue deliveries (SENT/PARTIAL past expected delivery date) with a warning indicator
- Action buttons based on `statusInfo.allow*` flags from the statuses endpoint

### Detail Page
- Header: PO number, status badge, vendor info, dates
- Shipping address block
- Line items table with columns: Description, Qty, Unit Price, Discount %, Tax %, Amount, Qty Received
- Show progress bar per line item (quantityReceived / quantity)
- Action buttons: Send, Receive Items, Convert to Bill, Close, Void, Duplicate
- If converted, show link to the resulting bill

### Receive Items Modal
- Show each line item with: Description, Ordered Qty, Already Received, Remaining
- Input field for "Qty to Receive" per line (max = remaining)
- Optional received date picker
- Submit sends array of `{ lineItemId, quantityReceived }` for changed items only

### Dashboard Widget
- Key metrics: Total Pending (SENT + PARTIAL amount), Overdue Deliveries count
- Status breakdown with counts
- Quick actions: "Create PO", "View Overdue"

### Convert to Bill Flow
- Show confirmation dialog explaining what will happen
- After conversion, offer to navigate to the new bill detail page
- Show the bill number in the success message
