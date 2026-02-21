# Day 7 - Chart of Accounts (COA) - Completion Summary

## What Was Built

Full-featured **Chart of Accounts** module following QuickBooks Online structure with 15 account types, ~120+ detail types, parent-child hierarchy (up to 4 levels), and automatic default account seeding on company registration.

---

## Database Schema

### Account Model (`accounts` table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| company_id | UUID | Company this account belongs to |
| account_number | VARCHAR(20) | Optional account number (e.g., "1000") |
| name | VARCHAR(255) | Account name |
| description | TEXT | Optional description |
| account_type | VARCHAR(50) | One of 15 account types (e.g., "Bank", "Expenses") |
| detail_type | VARCHAR(100) | Sub-type (e.g., "Checking", "Advertising/Promotional") |
| normal_balance | VARCHAR(10) | "DEBIT" or "CREDIT" |
| parent_account_id | UUID | Parent account (for hierarchy) |
| is_sub_account | BOOLEAN | Whether this is a sub-account |
| depth | INT | Nesting level (0 = root, max 3) |
| full_path | VARCHAR(500) | Full path (e.g., "Expenses > Office Expenses > Supplies") |
| current_balance | DECIMAL(20,4) | Current account balance |
| is_system_account | BOOLEAN | Protected from deletion |
| is_active | BOOLEAN | Soft delete flag |
| display_order | INT | Sort order |

### Indexes
- `unique_company_account_number` - Unique account number per company
- `unique_company_account_name` - Unique name per parent per company
- `idx_accounts_company` - Fast company lookups
- `idx_accounts_type` - Filter by account type
- `idx_accounts_active` - Active account queries
- `idx_accounts_parent` - Hierarchy traversal

---

## Account Types (15 Types in 5 Groups)

### Assets (5)
- Bank, Accounts Receivable, Other Current Assets, Fixed Assets, Other Assets

### Liabilities (4)
- Accounts Payable, Credit Card, Other Current Liabilities, Long Term Liabilities

### Equity (1)
- Equity

### Income (2)
- Income, Other Income

### Expenses (3)
- Cost of Goods Sold, Expenses, Other Expense

---

## API Endpoints

### 1. Get Account Types (for dropdowns)
```
GET /api/v1/accounts/types
Permission: account:view
```
Returns all 15 account types with their detail types, grouped by category.

### 2. Get Account Tree (hierarchical)
```
GET /api/v1/accounts/tree?accountType=Bank
Permission: account:view
```
Returns accounts in a nested tree structure grouped by type group (Assets, Liabilities, etc.).

### 3. List All Accounts (flat, with filtering)
```
GET /api/v1/accounts?accountType=Bank&search=cash&isActive=true&sortBy=name&sortOrder=asc
Permission: account:view
```
Query params: `accountType`, `detailType`, `search`, `isActive`, `isSubAccount`, `parentAccountId`, `sortBy`, `sortOrder`

### 4. Get Single Account
```
GET /api/v1/accounts/:id
Permission: account:view
```
Returns account details with sub-accounts.

### 5. Create Account
```
POST /api/v1/accounts
Permission: account:create
Body: { name, accountType, detailType, accountNumber?, description?, parentAccountId?, isSubAccount? }
```
Validates account type, detail type, unique name/number, hierarchy depth (max 4).

### 6. Update Account
```
PATCH /api/v1/accounts/:id
Permission: account:update
Body: { name?, accountNumber?, description?, detailType?, isActive? }
```
Account type cannot be changed after creation.

### 7. Delete Account
```
DELETE /api/v1/accounts/:id
Permission: account:delete
```
Blocked if: system account, has sub-accounts, has non-zero balance.

---

## Permissions Added (4)

| Code | Name | Roles |
|------|------|-------|
| `account:view` | View Accounts | Company Admin, Standard, Limited, Reports Only |
| `account:create` | Create Accounts | Company Admin, Standard |
| `account:update` | Edit Accounts | Company Admin, Standard |
| `account:delete` | Delete Accounts | Company Admin |

---

## Default Account Seeding

**33 default accounts** are automatically created when a new company registers:

- **Bank (3)**: Cash on Hand, Business Checking, Business Savings
- **Accounts Receivable (1)**: Accounts Receivable
- **Other Current Assets (3)**: Inventory Asset, Prepaid Expenses, Undeposited Funds
- **Fixed Assets (2)**: Furniture and Equipment, Accumulated Depreciation
- **Accounts Payable (1)**: Accounts Payable
- **Other Current Liabilities (3)**: Sales Tax Payable, Payroll Liabilities, Income Tax Payable
- **Equity (4)**: Opening Balance Equity, Owner's Equity, Owner's Draw, Retained Earnings
- **Income (3)**: Sales Income, Service Income, Discounts Given
- **Other Income (2)**: Interest Income, Other Income
- **COGS (3)**: Cost of Goods Sold, Cost of Labor, Shipping and Delivery
- **Expenses (13)**: Advertising, Bank Charges, Insurance, Office Supplies, Payroll, Professional Fees, Rent, Repairs, Travel, Utilities, Meals, Dues, Auto
- **Other Expense (2)**: Depreciation Expense, Penalties & Settlements

All default accounts are marked as `isSystemAccount: true` (cannot be deleted).

---

## Files Created/Modified

### New Files
| File | Purpose |
|------|---------|
| `src/modules/accounts/accounts.module.ts` | NestJS module |
| `src/modules/accounts/accounts.controller.ts` | 7 REST endpoints |
| `src/modules/accounts/accounts.service.ts` | CRUD, hierarchy, seeding, validation |
| `src/modules/accounts/dto/create-account.dto.ts` | Create account DTO |
| `src/modules/accounts/dto/update-account.dto.ts` | Update account DTO |
| `src/modules/accounts/dto/query-accounts.dto.ts` | Query/filter DTO |
| `src/modules/accounts/constants/account-types.constant.ts` | 15 types, ~120 detail types |
| `src/modules/accounts/constants/default-accounts.constant.ts` | 33 default accounts |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added Account model |
| `prisma/seed.ts` | Added 4 COA permissions + role mappings |
| `src/app.module.ts` | Registered AccountsModule |
| `src/modules/auth/auth.module.ts` | Imported AccountsModule |
| `src/modules/auth/auth.service.ts` | Seed default accounts on registration |

---

## Test Results

All endpoints tested and verified:
- **GET /accounts/types** - Returns 15 types with 5 groups
- **GET /accounts** - Returns all 33+ default accounts
- **GET /accounts?accountType=Bank** - Returns 3 bank accounts
- **GET /accounts/tree** - Returns hierarchical grouped tree
- **GET /accounts/:id** - Returns single account with sub-accounts
- **POST /accounts** - Creates new account with validation
- **PATCH /accounts/:id** - Updates account name, description, etc.
- **DELETE /accounts/:id** - Deletes non-system accounts
- **POST /accounts (sub-account)** - Creates sub-account with parent, depth=1, fullPath set
- **Registration** - Auto-seeds 33 default accounts for new company

---

## Key Features

1. **QuickBooks-style structure** - 15 account types, ~120+ detail types
2. **Multi-tenant isolation** - Each company has its own COA
3. **Account hierarchy** - Parent-child up to 4 levels deep
4. **Automatic seeding** - 33 default accounts on company registration
5. **Validation** - Account type → detail type validation, unique names/numbers
6. **Protection** - System accounts can't be deleted, accounts with balances can't be deleted
7. **Permission-based access** - 4 granular permissions (view, create, update, delete)
8. **Search & filter** - By type, detail type, name, active status
9. **Tree view** - Hierarchical display grouped by account type group
10. **Normal balance** - Auto-assigned based on account type (DEBIT/CREDIT)