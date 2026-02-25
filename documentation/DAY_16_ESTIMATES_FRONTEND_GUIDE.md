# Estimates & Quotes — Frontend Integration Guide

## Base URL
```
/api/v1/estimates
```

## Authentication
All endpoints require JWT Bearer token.

---

## Endpoints

### 1. Get Statuses
```
GET /estimates/statuses
```
Returns all 8 statuses with labels, colors, descriptions, and allowed actions.

**Response:**
```json
[
  {
    "value": "DRAFT",
    "label": "Draft",
    "color": "#6B7280",
    "description": "Estimate is being prepared and has not been sent",
    "allowEdit": true,
    "allowDelete": true,
    "allowSend": true,
    "allowAccept": false,
    "allowReject": false,
    "allowConvert": false,
    "allowVoid": false
  }
]
```

### 2. Get Summary (Dashboard)
```
GET /estimates/summary
```
**Response:**
```json
{
  "draft": { "count": 2 },
  "sent": { "count": 3 },
  "viewed": { "count": 1 },
  "accepted": { "count": 2, "amount": 15000 },
  "rejected": { "count": 1 },
  "converted": { "count": 5, "amount": 45000 },
  "void": { "count": 0 },
  "expiring": { "count": 1, "amount": 5000 },
  "totals": {
    "totalEstimated": 65000,
    "totalPending": 20000,
    "conversionRate": 87.5
  }
}
```

### 3. Get Next Number
```
GET /estimates/next-number
```
**Response:** `{ "nextEstimateNumber": "EST-0001" }`

### 4. List Estimates
```
GET /estimates?status=SENT&customerId=uuid&dateFrom=2026-01-01&dateTo=2026-02-28&search=web&sortBy=createdAt&sortOrder=desc&page=1&limit=20
```

**Query Parameters:**
| Param | Type | Values |
|-------|------|--------|
| status | string | DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, CONVERTED, VOID |
| customerId | UUID | Filter by customer |
| dateFrom | date | YYYY-MM-DD |
| dateTo | date | YYYY-MM-DD |
| search | string | Searches estimate number, reference, customer name |
| sortBy | string | estimateNumber, estimateDate, expirationDate, totalAmount, status, createdAt |
| sortOrder | string | asc, desc |
| page | number | >= 1 |
| limit | number | >= 1 |

### 5. Get Estimate Detail
```
GET /estimates/:id
```
Returns full estimate with customer, line items (with products), deposit account, and converted invoice reference.

### 6. Create Estimate
```
POST /estimates
```
**Body:**
```json
{
  "customerId": "uuid",
  "estimateDate": "2026-02-25",
  "expirationDate": "2026-03-27",
  "paymentTerms": "NET_30",
  "discountType": "PERCENTAGE",
  "discountValue": 5,
  "depositAccountId": "uuid",
  "notes": "Internal notes",
  "termsAndConditions": "Payment terms text",
  "customerMessage": "Message shown to customer",
  "lineItems": [
    {
      "productId": "uuid",
      "description": "Website Design",
      "quantity": 1,
      "unitPrice": 5000,
      "discountPercent": 0,
      "taxPercent": 18,
      "sortOrder": 0
    }
  ]
}
```

### 7. Update Estimate (Draft Only)
```
PATCH /estimates/:id
```
Same body as create, all fields optional.

### 8. Delete Estimate (Draft Only)
```
DELETE /estimates/:id
```

### 9. Send Estimate
```
POST /estimates/:id/send
```
DRAFT → SENT. Sets default 30-day expiration if not set.

### 10. Mark as Viewed
```
POST /estimates/:id/mark-viewed
```
SENT → VIEWED. Track when customer opens the estimate.

### 11. Accept Estimate
```
POST /estimates/:id/accept
```
SENT/VIEWED → ACCEPTED. Rejects if estimate is expired.

### 12. Reject Estimate
```
POST /estimates/:id/reject
```
**Body:** `{ "reason": "Budget constraints" }` (optional)

### 13. Convert to Invoice
```
POST /estimates/:id/convert-to-invoice
```
ACCEPTED → CONVERTED. Creates a new draft invoice with all line items copied.

**Response includes:**
```json
{
  "convertedInvoice": {
    "id": "uuid",
    "invoiceNumber": "INV-0007"
  }
}
```

### 14. Duplicate Estimate
```
POST /estimates/:id/duplicate
```
Creates a new DRAFT estimate with all line items from any existing estimate.

### 15. Void Estimate
```
POST /estimates/:id/void
```
**Body:** `{ "reason": "Customer changed requirements" }` (optional)

### 16. Expire Overdue
```
POST /estimates/expire-overdue
```
Batch operation to mark all SENT/VIEWED estimates past expiration as EXPIRED.

---

## Lifecycle Flow
```
DRAFT → SENT → VIEWED → ACCEPTED → CONVERTED
                    ↓        ↓
                 REJECTED    VOID

SENT/VIEWED with expired date → EXPIRED (via expire-overdue)
DRAFT → DELETE (hard delete)
```

## Status Colors (for UI)
| Status | Color | Hex |
|--------|-------|-----|
| Draft | Gray | #6B7280 |
| Sent | Blue | #3B82F6 |
| Viewed | Purple | #8B5CF6 |
| Accepted | Green | #10B981 |
| Rejected | Red | #EF4444 |
| Expired | Amber | #F59E0B |
| Converted | Emerald | #059669 |
| Void | Gray | #9CA3AF |

## UI Recommendations
1. **Estimate List Page**: Show status badges with colors, total amount, customer, expiration date
2. **Detail Page**: Show estimate preview, action buttons based on `statusInfo.allow*` flags
3. **Dashboard Widget**: Show conversion rate, pending amount, expiring count as key metrics
4. **Convert Flow**: After converting, redirect to the new invoice detail page
5. **Expiration Warning**: Highlight estimates expiring in next 7 days with amber badge
