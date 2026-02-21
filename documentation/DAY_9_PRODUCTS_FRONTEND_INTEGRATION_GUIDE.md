# Day 9: Products & Services — Frontend Integration Guide

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All endpoints require JWT Bearer token in the Authorization header:
```
Authorization: Bearer <accessToken>
```

---

## 1. PRODUCT TYPES

### GET `/products/types`
Returns metadata for all product types. Use this to populate the type selector dropdown.

**Response:**
```json
{
  "success": true,
  "message": "Product types retrieved successfully",
  "data": [
    {
      "type": "INVENTORY",
      "label": "Inventory",
      "description": "Products you buy and/or sell and track quantities of",
      "trackInventory": true
    },
    {
      "type": "NON_INVENTORY",
      "label": "Non-Inventory",
      "description": "Products you buy and/or sell but do not need to track quantities of",
      "trackInventory": false
    },
    {
      "type": "SERVICE",
      "label": "Service",
      "description": "Services that you provide to customers",
      "trackInventory": false
    },
    {
      "type": "BUNDLE",
      "label": "Bundle",
      "description": "A collection of products and/or services sold together",
      "trackInventory": false
    }
  ]
}
```

**Frontend Usage:**
- Show product type selector as first step in "Add Product" flow
- Use `trackInventory` to conditionally show/hide inventory fields
- Use `label` for display, `type` for API calls

---

## 2. PRODUCTS

### POST `/products` — Create Product

**Request Body (Inventory Product):**
```json
{
  "type": "INVENTORY",
  "name": "iPhone 15 Pro",
  "sku": "IPHONE-15-PRO",
  "barcode": "1234567890123",
  "categoryId": "uuid-of-category",
  "salesDescription": "Latest iPhone with A17 Pro chip",
  "purchaseDescription": "iPhone 15 Pro wholesale",
  "salesPrice": 1199.99,
  "purchaseCost": 899.00,
  "unitOfMeasureId": "uuid-of-uom",
  "incomeAccountId": "uuid-of-income-account",
  "expenseAccountId": "uuid-of-expense-account",
  "inventoryAssetAccountId": "uuid-of-asset-account",
  "taxable": true,
  "taxRate": 8.25,
  "quantityOnHand": 50,
  "reorderPoint": 10,
  "reorderQuantity": 25,
  "preferredVendorId": "uuid-of-vendor",
  "imageUrl": "https://example.com/iphone.jpg"
}
```

**Request Body (Service):**
```json
{
  "type": "SERVICE",
  "name": "IT Consulting",
  "sku": "SRV-CONSULT",
  "salesDescription": "Professional IT consulting per hour",
  "salesPrice": 150.00,
  "unitOfMeasureId": "uuid-of-hour-uom",
  "taxable": false
}
```

**Request Body (Bundle):**
```json
{
  "type": "BUNDLE",
  "name": "iPhone Starter Kit",
  "sku": "BDL-IPHONE-KIT",
  "salesPrice": 1049.99,
  "salesDescription": "iPhone 15 + Case + Setup Service",
  "bundleItems": [
    { "productId": "uuid-of-iphone", "quantity": 1 },
    { "productId": "uuid-of-case", "quantity": 1 },
    { "productId": "uuid-of-setup-service", "quantity": 1 }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "id": "uuid",
    "type": "INVENTORY",
    "name": "iPhone 15 Pro",
    "sku": "IPHONE-15-PRO",
    "barcode": "1234567890123",
    "category": { "id": "uuid", "name": "Electronics", "fullPath": "Electronics > Phones" },
    "salesDescription": "Latest iPhone with A17 Pro chip",
    "purchaseDescription": "iPhone 15 Pro wholesale",
    "salesPrice": 1199.99,
    "purchaseCost": 899.00,
    "unitOfMeasure": { "id": "uuid", "name": "Each", "abbreviation": "ea" },
    "incomeAccount": { "id": "uuid", "name": "Sales Income", "accountNumber": "4000" },
    "expenseAccount": { "id": "uuid", "name": "Cost of Goods Sold", "accountNumber": "5000" },
    "inventoryAssetAccount": { "id": "uuid", "name": "Inventory Asset", "accountNumber": "1200" },
    "taxable": true,
    "taxRate": 8.25,
    "trackInventory": true,
    "quantityOnHand": 50,
    "reorderPoint": 10,
    "reorderQuantity": 25,
    "preferredVendor": { "id": "uuid", "displayName": "Apple Inc." },
    "imageUrl": "https://example.com/iphone.jpg",
    "isActive": true,
    "bundleItems": [],
    "createdAt": "2026-02-18T...",
    "updatedAt": "2026-02-18T..."
  }
}
```

**Auto-Defaults (if account fields not provided):**
| Product Type | incomeAccountId | expenseAccountId | inventoryAssetAccountId |
|-------------|-----------------|------------------|------------------------|
| INVENTORY | Sales Income (4000) | COGS (5000) | Inventory Asset (1200) |
| NON_INVENTORY | Sales Income (4000) | COGS (5000) | — |
| SERVICE | Service Income (4100) | — | — |
| BUNDLE | — | — | — |

**Error Responses:**
```json
// Duplicate name
{ "success": false, "statusCode": 409, "message": "A product named \"iPhone 15 Pro\" already exists" }

// Duplicate SKU
{ "success": false, "statusCode": 409, "message": "A product with SKU \"IPHONE-15-PRO\" already exists" }

// Invalid category
{ "success": false, "statusCode": 400, "message": "Category not found in your company" }

// Empty bundle
{ "success": false, "statusCode": 400, "message": "Bundle products must include at least one item. Provide bundleItems array." }

// Nested bundle
{ "success": false, "statusCode": 400, "message": "Cannot add bundle products as items inside another bundle: iPhone Starter Kit" }

// Validation error
{ "success": false, "statusCode": 400, "message": "Product type must be INVENTORY, NON_INVENTORY, SERVICE, or BUNDLE" }
```

---

### GET `/products` — List Products

**Query Parameters:**
| Param | Type | Description | Example |
|-------|------|-------------|---------|
| search | string | Search name, SKU, barcode, description | `?search=iphone` |
| type | enum | Filter by product type | `?type=INVENTORY` |
| categoryId | uuid | Filter by category | `?categoryId=uuid` |
| isActive | boolean | Filter active/inactive | `?isActive=true` |
| trackInventory | boolean | Filter inventory-tracked items | `?trackInventory=true` |
| sortBy | enum | Sort field | `?sortBy=salesPrice` |
| sortOrder | asc/desc | Sort direction | `?sortOrder=desc` |
| page | number | Page number (default: 1) | `?page=2` |
| limit | number | Items per page (default: 50) | `?limit=20` |

**sortBy options:** `name`, `sku`, `salesPrice`, `purchaseCost`, `quantityOnHand`, `createdAt`, `type`

**Response:**
```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": {
    "items": [
      {
        "id": "uuid",
        "type": "INVENTORY",
        "name": "iPhone 15",
        "sku": "IPHONE-15",
        "barcode": "1234567890123",
        "category": { "id": "uuid", "name": "Electronics" },
        "salesPrice": 999.99,
        "purchaseCost": 750.00,
        "unitOfMeasure": { "id": "uuid", "name": "Each", "abbreviation": "ea" },
        "taxable": true,
        "trackInventory": true,
        "quantityOnHand": 65,
        "reorderPoint": 10,
        "preferredVendor": { "id": "uuid", "displayName": "Apple Inc." },
        "isActive": true,
        "bundleItemsCount": 0,
        "createdAt": "2026-02-18T..."
      }
    ],
    "pagination": {
      "total": 4,
      "page": 1,
      "limit": 50,
      "totalPages": 1
    }
  }
}
```

---

### GET `/products/:id` — Product Detail
Returns full product with all relations including bundle items.

---

### PATCH `/products/:id` — Update Product
Send only the fields you want to change. Cannot change `type`.

```json
{
  "name": "iPhone 15 Pro Max",
  "salesPrice": 1299.99,
  "reorderPoint": 15
}
```

**For bundles, update items by sending full array:**
```json
{
  "salesPrice": 1099.99,
  "bundleItems": [
    { "productId": "uuid-1", "quantity": 1 },
    { "productId": "uuid-2", "quantity": 3 }
  ]
}
```

---

### DELETE `/products/:id` — Soft Delete
Sets `isActive = false`. Product remains in database.

---

### POST `/products/:id/adjust-stock` — Adjust Inventory

**Request:**
```json
{
  "adjustmentQuantity": 20,
  "reason": "RECEIVED",
  "notes": "New shipment from supplier"
}
```

**Reasons:** `RECEIVED`, `DAMAGED`, `LOST`, `RETURNED`, `CORRECTION`, `OTHER`

Use negative values to subtract: `"adjustmentQuantity": -5`

**Response (201):**
```json
{
  "success": true,
  "message": "Stock adjusted successfully",
  "data": {
    "id": "uuid",
    "name": "iPhone 15",
    "quantityOnHand": 85,
    "adjustment": {
      "previousQuantity": 65,
      "adjustmentQuantity": 20,
      "newQuantity": 85,
      "reason": "RECEIVED",
      "notes": "New shipment from supplier"
    }
  }
}
```

**Error:**
```json
// Non-inventory product
{ "success": false, "statusCode": 400, "message": "Stock adjustments can only be made on inventory-tracked products" }

// Below zero
{ "success": false, "statusCode": 400, "message": "Insufficient stock. Current quantity: 5. Cannot reduce by 10." }
```

---

### GET `/products/low-stock` — Low Stock Alert

Returns products where `quantityOnHand <= reorderPoint`.

**Response:**
```json
{
  "success": true,
  "message": "Found 2 product(s) below reorder point",
  "data": [
    {
      "id": "uuid",
      "name": "iPhone 15",
      "sku": "IPHONE-15",
      "type": "INVENTORY",
      "quantityOnHand": 5,
      "reorderPoint": 10,
      "reorderQuantity": 25,
      "deficit": 5,
      "salesPrice": 999.99,
      "purchaseCost": 750.00,
      "category": { "id": "uuid", "name": "Electronics" },
      "preferredVendor": { "id": "uuid", "displayName": "Apple Inc." }
    }
  ]
}
```

**Frontend Usage:**
- Show badge on sidebar: "2 items low stock"
- Dashboard widget showing low-stock items
- Link to preferred vendor for quick reorder

---

## 3. CATEGORIES

### GET `/categories` — Category Tree

**Response:**
```json
{
  "success": true,
  "message": "Categories retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "name": "Electronics",
      "description": "Electronic products",
      "depth": 0,
      "fullPath": "Electronics",
      "isActive": true,
      "productsCount": 3,
      "childrenCount": 1,
      "children": [
        {
          "id": "uuid",
          "name": "Phones",
          "depth": 1,
          "fullPath": "Electronics > Phones",
          "productsCount": 1,
          "childrenCount": 0,
          "children": []
        }
      ]
    },
    {
      "id": "uuid",
      "name": "Services",
      "depth": 0,
      "fullPath": "Services",
      "productsCount": 2,
      "childrenCount": 0,
      "children": []
    }
  ]
}
```

### POST `/categories` — Create Category

```json
{
  "name": "Phones",
  "description": "Mobile phones and smartphones",
  "parentId": "uuid-of-electronics"
}
```

**Max 3 levels:** Root (depth 0) → Child (depth 1) → Grandchild (depth 2)

**Error:**
```json
{ "success": false, "statusCode": 400, "message": "Categories can only be nested up to 3 levels deep" }
{ "success": false, "statusCode": 409, "message": "A category named \"Phones\" already exists under this parent" }
{ "success": false, "statusCode": 400, "message": "Cannot delete a category that has sub-categories. Remove sub-categories first." }
{ "success": false, "statusCode": 400, "message": "Cannot delete this category because 5 product(s) are assigned to it. Reassign products first." }
```

---

## 4. UNITS OF MEASURE

### GET `/units-of-measure` — List All UOMs

Returns 30 system defaults + any company-custom units.

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Each", "abbreviation": "ea", "isSystem": true, "productsCount": 5 },
    { "id": "uuid", "name": "Kilogram", "abbreviation": "kg", "isSystem": true, "productsCount": 0 },
    { "id": "uuid", "name": "Hour", "abbreviation": "hr", "isSystem": true, "productsCount": 2 },
    { "id": "uuid", "name": "Barrel", "abbreviation": "bbl", "isSystem": false, "productsCount": 0 }
  ]
}
```

### POST `/units-of-measure` — Create Custom UOM
```json
{ "name": "Barrel", "abbreviation": "bbl" }
```

### PATCH `/units-of-measure/:id` — Update Custom UOM
Only non-system UOMs can be updated.

### DELETE `/units-of-measure/:id` — Delete Custom UOM
Only non-system, unused UOMs can be deleted.

**Errors:**
```json
{ "success": false, "statusCode": 400, "message": "System units of measure cannot be deleted" }
{ "success": false, "statusCode": 400, "message": "Cannot delete this unit of measure because 3 product(s) are using it. Reassign products first." }
```

---

## 5. FRONTEND UI RECOMMENDATIONS

### Products List Page
```
┌──────────────────────────────────────────────────────────┐
│ Products & Services                    [+ Add Product]   │
│──────────────────────────────────────────────────────────│
│ [Search...]  Type: [All ▼]  Category: [All ▼]  [Active ▼]│
│──────────────────────────────────────────────────────────│
│ Name            │ SKU       │ Type      │ Price  │ Qty   │
│─────────────────┼───────────┼───────────┼────────┼───────│
│ iPhone 15       │ IPHONE-15 │ Inventory │ $999   │ 65 ⚠  │
│ IT Consulting   │ SRV-001   │ Service   │ $150   │ —     │
│ USB-C Cable     │ ACC-USB   │ Non-Inv   │ $12.99 │ —     │
│ Starter Kit     │ BDL-001   │ Bundle    │ $1049  │ — (3) │
└──────────────────────────────────────────────────────────┘
```

### Add Product Flow
1. **Step 1 — Select Type**: Show 4 cards from `/products/types`
2. **Step 2 — Basic Info**: Name, SKU, Barcode, Category (dropdown from `/categories`), Image
3. **Step 3 — Pricing**: Sales price, Purchase cost, UOM (dropdown from `/units-of-measure`)
4. **Step 4 — Conditional**:
   - If INVENTORY: Show quantity on hand, reorder point, reorder quantity, preferred vendor, inventory asset account
   - If BUNDLE: Show "Add Items" UI — search products, set quantities
5. **Step 5 — Tax & Accounts**: Taxable toggle, tax rate, income account, expense account
6. **Step 6 — Descriptions**: Sales description, purchase description

### Conditional Field Visibility
```typescript
const isInventory = type === 'INVENTORY';
const isBundle = type === 'BUNDLE';
const isService = type === 'SERVICE';

// Show/hide based on type
showInventoryFields = isInventory;           // qty, reorder, asset account
showPurchaseCost = !isService;               // services don't have COGS
showBundleItemsPicker = isBundle;            // bundle item composer
showPreferredVendor = isInventory;           // vendor for reordering
showBarcode = isInventory || !isService;     // physical products only
```

### Stock Adjustment Modal
```
┌──────────────────────────────────────┐
│ Adjust Stock: iPhone 15              │
│──────────────────────────────────────│
│ Current Qty: 65                      │
│                                      │
│ Adjustment: [+20        ]            │
│ Reason:     [RECEIVED     ▼]        │
│ Notes:      [New shipment...]        │
│                                      │
│ New Qty: 85                          │
│                                      │
│              [Cancel] [Save]         │
└──────────────────────────────────────┘
```

### Low Stock Dashboard Widget
```
┌──────────────────────────────────────┐
│ ⚠ Low Stock Alerts (2)              │
│──────────────────────────────────────│
│ iPhone 15      5/10   Deficit: 5    │
│   → Reorder 25 from Apple Inc.      │
│ USB Hub        2/5    Deficit: 3    │
│   → Reorder 10 from TechSupply     │
└──────────────────────────────────────┘
```

---

## 6. TYPESCRIPT INTERFACES

```typescript
// Product Types
type ProductType = 'INVENTORY' | 'NON_INVENTORY' | 'SERVICE' | 'BUNDLE';

interface Product {
  id: string;
  type: ProductType;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: { id: string; name: string; fullPath?: string } | null;
  salesDescription: string | null;
  purchaseDescription: string | null;
  salesPrice: number | null;
  purchaseCost: number | null;
  unitOfMeasure: { id: string; name: string; abbreviation: string } | null;
  incomeAccount: { id: string; name: string; accountNumber: string } | null;
  expenseAccount: { id: string; name: string; accountNumber: string } | null;
  inventoryAssetAccount: { id: string; name: string; accountNumber: string } | null;
  taxable: boolean;
  taxRate: number | null;
  trackInventory: boolean;
  quantityOnHand: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  preferredVendor: { id: string; displayName: string } | null;
  imageUrl: string | null;
  isActive: boolean;
  bundleItems: BundleItem[];
  createdAt: string;
  updatedAt: string;
}

interface BundleItem {
  id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    sku: string | null;
    type: ProductType;
    salesPrice: number | null;
    purchaseCost: number | null;
  };
}

interface ProductListItem {
  id: string;
  type: ProductType;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: { id: string; name: string } | null;
  salesPrice: number | null;
  purchaseCost: number | null;
  unitOfMeasure: { id: string; name: string; abbreviation: string } | null;
  taxable: boolean;
  trackInventory: boolean;
  quantityOnHand: number;
  reorderPoint: number | null;
  preferredVendor: { id: string; displayName: string } | null;
  isActive: boolean;
  bundleItemsCount: number;
  createdAt: string;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  type: ProductType;
  quantityOnHand: number;
  reorderPoint: number;
  reorderQuantity: number | null;
  deficit: number;
  salesPrice: number | null;
  purchaseCost: number | null;
  category: { id: string; name: string } | null;
  preferredVendor: { id: string; displayName: string } | null;
}

// Category
interface Category {
  id: string;
  name: string;
  description: string | null;
  depth: number;
  fullPath: string | null;
  isActive: boolean;
  parent: { id: string; name: string } | null;
  children: Category[];
  productsCount: number;
  childrenCount: number;
  createdAt: string;
  updatedAt: string;
}

// Unit of Measure
interface UnitOfMeasure {
  id: string;
  name: string;
  abbreviation: string;
  isSystem: boolean;
  productsCount: number;
  createdAt: string;
  updatedAt: string;
}

// Stock Adjustment
interface AdjustStockRequest {
  adjustmentQuantity: number; // positive=add, negative=subtract
  reason: 'RECEIVED' | 'DAMAGED' | 'LOST' | 'RETURNED' | 'CORRECTION' | 'OTHER';
  notes?: string;
}

// Pagination
interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 7. PERMISSIONS REFERENCE

| Permission | Description | Roles |
|-----------|-------------|-------|
| product:view | View products list & details | admin, standard, limited, reports_only |
| product:create | Create new products | admin, standard |
| product:edit | Edit products & adjust stock | admin, standard |
| product:delete | Deactivate products | admin |
| category:view | View categories | admin, standard, limited, reports_only |
| category:create | Create categories | admin, standard |
| category:edit | Edit categories | admin, standard |
| category:delete | Delete categories | admin |

---

## 8. API CALL EXAMPLES (Fetch)

```typescript
// List products with filters
const response = await fetch(
  `${BASE_URL}/products?type=INVENTORY&search=iphone&sortBy=salesPrice&sortOrder=desc&page=1&limit=20`,
  { headers: { Authorization: `Bearer ${token}` } }
);
const { data } = await response.json();
// data.items, data.pagination

// Create inventory product
const response = await fetch(`${BASE_URL}/products`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 'INVENTORY',
    name: 'Widget Pro',
    sku: 'WDG-PRO',
    salesPrice: 29.99,
    purchaseCost: 12.00,
    quantityOnHand: 100,
    reorderPoint: 20,
    reorderQuantity: 50,
  }),
});

// Adjust stock
const response = await fetch(`${BASE_URL}/products/${productId}/adjust-stock`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    adjustmentQuantity: -5,
    reason: 'DAMAGED',
    notes: 'Water damage from warehouse leak',
  }),
});

// Get low stock
const response = await fetch(`${BASE_URL}/products/low-stock`, {
  headers: { Authorization: `Bearer ${token}` },
});

// Get categories tree
const response = await fetch(`${BASE_URL}/categories`, {
  headers: { Authorization: `Bearer ${token}` },
});

// Get all units of measure
const response = await fetch(`${BASE_URL}/units-of-measure`, {
  headers: { Authorization: `Bearer ${token}` },
});
```
