# Day 8 - Customers & Vendors - Completion Summary

## What Was Built

Full **Customer** and **Vendor** management modules with QuickBooks-style contact management, separate billing/shipping addresses for customers, 1099 tracking for vendors, payment terms, opening balances, and multi-tenant company isolation.

---

## Database Schema

### Customer Model (`customers` table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Company isolation |
| customer_type | VARCHAR(20) | "Business" or "Individual" |
| display_name | VARCHAR(255) | Primary display name (required, unique per company) |
| company_name | VARCHAR(255) | Business name |
| first_name, last_name, middle_name | VARCHAR(100) | Contact name |
| title, suffix | VARCHAR(20) | Mr./Mrs./Dr., Jr./Sr./III |
| email | VARCHAR(255) | Email (unique per company) |
| phone, mobile, fax | VARCHAR(50) | Phone numbers |
| website | VARCHAR(255) | Website URL |
| billing_address_* | Various | Full billing address (line1, line2, city, state, postal_code, country) |
| shipping_address_* | Various | Full shipping address (separate from billing) |
| tax_number | VARCHAR(50) | Tax ID |
| tax_exempt | BOOLEAN | Tax exempt flag |
| payment_terms | VARCHAR(50) | Net 30, Net 60, Due on Receipt, etc. |
| opening_balance | DECIMAL(20,4) | Starting balance |
| opening_balance_date | DATE | When opening balance was set |
| current_balance | DECIMAL(20,4) | Running balance |
| credit_limit | DECIMAL(20,4) | Optional credit limit |
| notes | TEXT | Internal notes |
| is_active | BOOLEAN | Soft delete flag |

### Vendor Model (`vendors` table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Company isolation |
| vendor_type | VARCHAR(20) | "Business" or "Individual" |
| display_name | VARCHAR(255) | Primary display name (required, unique per company) |
| company_name | VARCHAR(255) | Business name |
| first_name, last_name, middle_name | VARCHAR(100) | Contact name |
| title, suffix | VARCHAR(20) | Mr./Mrs./Dr., Jr./Sr./III |
| email | VARCHAR(255) | Email (unique per company) |
| phone, mobile, fax | VARCHAR(50) | Phone numbers |
| website | VARCHAR(255) | Website URL |
| address_* | Various | Full address (line1, line2, city, state, postal_code, country) |
| tax_number | VARCHAR(50) | Tax ID |
| business_id_no | VARCHAR(50) | EIN or Business ID |
| track_1099 | BOOLEAN | Track for 1099 reporting |
| payment_terms | VARCHAR(50) | Payment terms |
| account_number | VARCHAR(50) | Vendor's account number for us |
| opening_balance | DECIMAL(20,4) | Starting balance |
| opening_balance_date | DATE | When opening balance was set |
| current_balance | DECIMAL(20,4) | Running balance |
| notes | TEXT | Internal notes |
| is_active | BOOLEAN | Soft delete flag |

---

## API Endpoints

### Customers (5 endpoints)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/customers` | `customer:view` | List all with search/filter |
| GET | `/api/v1/customers/:id` | `customer:view` | Get single customer |
| POST | `/api/v1/customers` | `customer:create` | Create customer |
| PATCH | `/api/v1/customers/:id` | `customer:edit` | Update customer |
| DELETE | `/api/v1/customers/:id` | `customer:delete` | Deactivate customer |

**Query Parameters (GET /customers):**
- `search` - Search by name, email, phone
- `customerType` - Filter: "Business" or "Individual"
- `isActive` - Filter active/inactive
- `sortBy` - displayName, email, currentBalance, createdAt
- `sortOrder` - asc or desc

### Vendors (5 endpoints)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/api/v1/vendors` | `vendor:view` | List all with search/filter |
| GET | `/api/v1/vendors/:id` | `vendor:view` | Get single vendor |
| POST | `/api/v1/vendors` | `vendor:create` | Create vendor |
| PATCH | `/api/v1/vendors/:id` | `vendor:edit` | Update vendor |
| DELETE | `/api/v1/vendors/:id` | `vendor:delete` | Deactivate vendor |

**Query Parameters (GET /vendors):**
- `search` - Search by name, email, phone
- `vendorType` - Filter: "Business" or "Individual"
- `isActive` - Filter active/inactive
- `track1099` - Filter 1099-tracked vendors
- `sortBy` - displayName, email, currentBalance, createdAt
- `sortOrder` - asc or desc

---

## Permissions (Already Seeded)

| Code | Roles |
|------|-------|
| `customer:view` | Company Admin, Standard, Limited, Reports Only |
| `customer:create` | Company Admin, Standard |
| `customer:edit` | Company Admin, Standard |
| `customer:delete` | Company Admin |
| `vendor:view` | Company Admin, Standard, Reports Only |
| `vendor:create` | Company Admin, Standard |
| `vendor:edit` | Company Admin, Standard |
| `vendor:delete` | Company Admin |

---

## Key Features

1. **Multi-tenant isolation** - Each company has its own customers/vendors
2. **Business + Individual types** - Different contact layouts per type
3. **Separate billing/shipping addresses** (customers) - For invoicing vs delivery
4. **1099 tracking** (vendors) - Flag vendors for tax reporting
5. **Payment terms** - Net 30, Net 60, Due on Receipt, custom
6. **Opening balance** - Set initial balance when importing
7. **Credit limit** (customers) - Track credit exposure
8. **Vendor account number** - Track vendor's reference number for us
9. **Duplicate prevention** - Unique display name and email per company
10. **Soft delete** - Deactivate instead of permanent delete
11. **Search & filter** - By name, email, phone, type, active status
12. **Structured addresses** - Returned as nested objects in API response

---

## Files Created

### Customers Module
| File | Purpose |
|------|---------|
| `src/modules/customers/customers.module.ts` | NestJS module |
| `src/modules/customers/customers.controller.ts` | 5 REST endpoints |
| `src/modules/customers/customers.service.ts` | CRUD + validation |
| `src/modules/customers/dto/create-customer.dto.ts` | Create DTO with validation |
| `src/modules/customers/dto/update-customer.dto.ts` | Update DTO |
| `src/modules/customers/dto/query-customers.dto.ts` | Query/filter DTO |

### Vendors Module
| File | Purpose |
|------|---------|
| `src/modules/vendors/vendors.module.ts` | NestJS module |
| `src/modules/vendors/vendors.controller.ts` | 5 REST endpoints |
| `src/modules/vendors/vendors.service.ts` | CRUD + validation |
| `src/modules/vendors/dto/create-vendor.dto.ts` | Create DTO with validation |
| `src/modules/vendors/dto/update-vendor.dto.ts` | Update DTO |
| `src/modules/vendors/dto/query-vendors.dto.ts` | Query/filter DTO |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added Customer and Vendor models |
| `src/app.module.ts` | Registered CustomersModule and VendorsModule |

---

## Test Results

### Customers
- **POST /customers** - Created Business customer with full billing address
- **POST /customers** - Created Individual customer
- **GET /customers** - Returns 2 customers
- **GET /customers/:id** - Returns single customer with nested billing/shipping address
- **PATCH /customers/:id** - Updated phone and credit limit
- **GET /customers?search=acme** - Found 1 result
- **DELETE /customers/:id** - Deactivated successfully

### Vendors
- **POST /vendors** - Created Business vendor with 1099 tracking and account number
- **POST /vendors** - Created Individual vendor
- **GET /vendors** - Returns 2 vendors
- **GET /vendors/:id** - Returns single vendor with nested address
- **PATCH /vendors/:id** - Updated phone and notes
- **GET /vendors?track1099=true** - Found 2 tracked vendors
- **DELETE /vendors/:id** - Deactivated successfully
