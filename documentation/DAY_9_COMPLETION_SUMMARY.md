# Day 9: Products & Services Module - Completion Summary

## Overview
Full-featured, market-competitive Products & Services module rivaling QuickBooks, Xero, and Zoho Books. Supports 4 product types, bundles, inventory tracking, hierarchical categories, units of measure, stock adjustments, and low-stock alerts.

## Database Changes

### New Enum
- `ProductType` — INVENTORY, NON_INVENTORY, SERVICE, BUNDLE

### New Tables (4)

| Table | Description | Key Fields |
|-------|-------------|------------|
| `categories` | Hierarchical product categories (max 3 levels) | name, parent_id, depth, full_path |
| `units_of_measure` | System defaults (30) + company custom units | name, abbreviation, is_system |
| `products` | Main items table with full ERP features | type, name, sku, barcode, prices, inventory, tax, accounts |
| `bundle_items` | Bundle composition join table | bundle_id, product_id, quantity |

### Updated Tables
- `companies` — Added relations: categories[], unitsOfMeasure[], products[]
- `accounts` — Added 3 product relation arrays (income/expense/inventory asset)
- `vendors` — Added preferredByProducts[] relation

## API Endpoints (17 total)

### Products Controller — `/api/v1/products`
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/products/low-stock` | product:view | Items below reorder point |
| GET | `/products/types` | product:view | Returns 4 product types with metadata |
| GET | `/products` | product:view | List with filters, search, sort, pagination |
| GET | `/products/:id` | product:view | Full detail with all relations |
| POST | `/products` | product:create | Create product (any type) |
| PATCH | `/products/:id` | product:edit | Update product fields |
| DELETE | `/products/:id` | product:delete | Soft delete (isActive=false) |
| POST | `/products/:id/adjust-stock` | product:edit | Adjust inventory quantity |

### Categories Controller — `/api/v1/categories`
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/categories` | category:view | Tree view with nested children |
| GET | `/categories/:id` | category:view | Single category with children |
| POST | `/categories` | category:create | Create category (max 3 levels) |
| PATCH | `/categories/:id` | category:edit | Update name/description/active |
| DELETE | `/categories/:id` | category:delete | Delete (only if empty) |

### Units of Measure Controller — `/api/v1/units-of-measure`
| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/units-of-measure` | product:view | All system + company custom |
| POST | `/units-of-measure` | product:create | Create custom UOM |
| PATCH | `/units-of-measure/:id` | product:edit | Update custom UOM |
| DELETE | `/units-of-measure/:id` | product:delete | Delete custom UOM (if unused) |

## Product Types

| Type | Track Inventory | Default Income Account | Default Expense Account |
|------|----------------|----------------------|------------------------|
| INVENTORY | Yes (auto) | Sales Income (4000) | Cost of Goods Sold (5000) |
| NON_INVENTORY | No | Sales Income (4000) | Cost of Goods Sold (5000) |
| SERVICE | No | Service Income (4100) | — |
| BUNDLE | No | — | — |

## Business Rules

1. **INVENTORY** auto-enables trackInventory; other types cannot track inventory
2. **BUNDLE** must contain at least 1 item; no nested bundles; no self-reference
3. **Stock adjustments** require a reason (RECEIVED, DAMAGED, LOST, RETURNED, CORRECTION, OTHER); quantity cannot go below 0
4. **Low-stock** = products where quantityOnHand ≤ reorderPoint
5. **Categories** max 3 levels deep; cannot delete if products or sub-categories exist
6. **System UOMs** (30 defaults) cannot be edited or deleted
7. **Product type** cannot be changed after creation
8. **SKU** unique per company; optional but enforced if provided
9. **Default accounts** auto-assigned based on product type if not specified

## Seed Data Added

- **8 permissions**: product:view/create/edit/delete + category:view/create/edit/delete
- **30 system units of measure**: Each, Box, Kg, Lb, Hour, Meter, etc.
- **Role mappings**:
  - company_admin → all new permissions
  - standard → product:view/create/edit + category:view/create/edit
  - limited → product:view + category:view
  - reports_only → product:view + category:view

## Files Created (17 new)

### Categories Module
- `src/modules/categories/dto/create-category.dto.ts`
- `src/modules/categories/dto/update-category.dto.ts`
- `src/modules/categories/categories.service.ts`
- `src/modules/categories/categories.controller.ts`
- `src/modules/categories/categories.module.ts`

### Products Module
- `src/modules/products/constants/product-types.constant.ts`
- `src/modules/products/constants/default-units.constant.ts`
- `src/modules/products/dto/create-product.dto.ts`
- `src/modules/products/dto/update-product.dto.ts`
- `src/modules/products/dto/query-products.dto.ts`
- `src/modules/products/dto/adjust-stock.dto.ts`
- `src/modules/products/units-of-measure.service.ts`
- `src/modules/products/units-of-measure.controller.ts`
- `src/modules/products/products.service.ts`
- `src/modules/products/products.controller.ts`
- `src/modules/products/products.module.ts`

### Global
- `src/common/filters/http-exception.filter.ts` (added during error handling fix)

## Files Modified
- `prisma/schema.prisma` — Added enum + 4 models + relation updates
- `prisma/seed.ts` — Added 8 permissions + role mappings + 30 UOMs
- `src/app.module.ts` — Registered CategoriesModule + ProductsModule
- `src/main.ts` — Added global HttpExceptionFilter

## Test Results
All 17 endpoints tested and verified:
- Product CRUD (all 4 types) ✅
- Bundle creation with item validation ✅
- Bundle nesting prevention ✅
- Stock adjustment (add/subtract) ✅
- Stock below-zero prevention ✅
- Low-stock detection ✅
- Category hierarchy (3 levels) ✅
- Category deletion protection ✅
- UOM system protection ✅
- UOM custom CRUD ✅
- Search, filter, sort, pagination ✅
- Duplicate name/SKU prevention ✅
- Auto account linking ✅
- User-friendly validation messages ✅
- Permission enforcement ✅
