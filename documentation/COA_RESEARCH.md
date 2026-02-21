# Chart of Accounts (COA) - Research & Implementation Plan

## Research Sources
- [QuickBooks Community - Account Types & Detail Types](https://quickbooks.intuit.com/learn-support/en-us/reports-and-accounting/where-can-i-see-a-complete-list-of-the-account-type-and-detail/00/779890)
- [QBK Accounting - Standard Chart of Accounts](https://qbkaccounting.com/standard-chart-accounts-account-types/)
- [Fourlane - QuickBooks Account Types Guide](https://www.fourlane.com/blog/quickbooks-account-types/)
- [Royalwise - Chart of Accounts in QBO](https://royalwise.com/chart-of-accounts/)
- [QuickBooks - Account Types & Detail Types (PDF)](https://quickbooks.intuit.com/learn-support/s/ooxbu36397/attachments/ooxbu36397/reports-and-accounting/226910/1/QuickBooks%20Default%20Account%20Types%20&%20Detail%20Types.pdf)

---

## 1. Account Types (15 in QuickBooks Online)

QuickBooks has **15 account types** grouped into **2 categories**:

### Balance Sheet Accounts (5 types under 3 groups)

| Group | Account Type | Normal Balance | Number Range |
|-------|-------------|---------------|-------------|
| **Assets** | Bank | Debit | 1000-1099 |
| **Assets** | Accounts Receivable (A/R) | Debit | 1100-1199 |
| **Assets** | Other Current Assets | Debit | 1200-1499 |
| **Assets** | Fixed Assets | Debit | 1500-1799 |
| **Assets** | Other Assets | Debit | 1800-1999 |
| **Liabilities** | Accounts Payable (A/P) | Credit | 2000-2099 |
| **Liabilities** | Credit Card | Credit | 2100-2199 |
| **Liabilities** | Other Current Liabilities | Credit | 2200-2499 |
| **Liabilities** | Long Term Liabilities | Credit | 2500-2999 |
| **Equity** | Equity | Credit | 3000-3999 |

### Income & Expense Accounts (5 types)

| Group | Account Type | Normal Balance | Number Range |
|-------|-------------|---------------|-------------|
| **Income** | Income | Credit | 4000-4499 |
| **Income** | Other Income | Credit | 4500-4999 |
| **Expense** | Cost of Goods Sold | Debit | 5000-5999 |
| **Expense** | Expenses | Debit | 6000-6999 |
| **Expense** | Other Expense | Debit | 7000-7999 |

---

## 2. Detail Types (Sub-Types) - Complete List

### BANK (Asset)
| Detail Type | Description |
|------------|-------------|
| Cash on Hand | Physical cash, petty cash |
| Checking | Business checking accounts |
| Money Market | Money market accounts |
| Savings | Business savings accounts |
| Trust Accounts | Money held in trust |
| Rents Held in Trust | Rental deposits held |

### ACCOUNTS RECEIVABLE (Asset)
| Detail Type | Description |
|------------|-------------|
| Accounts Receivable | Money owed by customers |

### OTHER CURRENT ASSETS (Asset)
| Detail Type | Description |
|------------|-------------|
| Allowance for Bad Debts | Estimated uncollectible receivables |
| Development Costs | Capitalized development costs |
| Employee Cash Advances | Advances to employees |
| Inventory | Products for resale |
| Investment - Mortgage/Real Estate Loans | Real estate investments |
| Investment - Tax-Exempt Securities | Tax-free investments |
| Investment - U.S. Government Obligations | Government bonds |
| Investments - Other | Other investments |
| Loans to Officers | Loans to company officers |
| Loans to Others | Loans to third parties |
| Loans to Stockholders | Loans to shareholders |
| Other Current Assets | Miscellaneous current assets |
| Prepaid Expenses | Expenses paid in advance |
| Retainage | Amounts withheld from contractors |
| Undeposited Funds | Received but not yet deposited |

### FIXED ASSETS (Asset)
| Detail Type | Description |
|------------|-------------|
| Accumulated Depreciation | Total depreciation on assets |
| Buildings | Owned buildings and structures |
| Depletable Assets | Natural resources |
| Furniture and Fixtures | Office furniture and fixtures |
| Intangible Assets | Patents, trademarks, goodwill |
| Land | Owned land |
| Leasehold Improvements | Improvements to leased property |
| Machinery and Equipment | Business machinery |
| Other Fixed Assets | Other long-term assets |
| Vehicles | Business vehicles |

### OTHER ASSETS (Asset)
| Detail Type | Description |
|------------|-------------|
| Accumulated Amortization of Other Assets | Amortization on intangible assets |
| Goodwill | Purchased goodwill |
| Lease Buyout | Cost to buy out a lease |
| Licenses | Business licenses |
| Organizational Costs | Company formation costs |
| Other Long-term Assets | Miscellaneous long-term assets |
| Security Deposits | Deposits paid for leases etc. |

### ACCOUNTS PAYABLE (Liability)
| Detail Type | Description |
|------------|-------------|
| Accounts Payable | Money owed to vendors |

### CREDIT CARD (Liability)
| Detail Type | Description |
|------------|-------------|
| Credit Card | Business credit card accounts |

### OTHER CURRENT LIABILITIES (Liability)
| Detail Type | Description |
|------------|-------------|
| Current Portion of Obligations under Finance Leases | Short-term lease obligations |
| Current Tax Liability | Taxes owed this period |
| Dividends Payable | Dividends declared but not paid |
| Income Tax Payable | Income taxes owed |
| Insurance Premium | Insurance premiums due |
| Line of Credit | Short-term credit facilities |
| Loan Payable | Short-term loans |
| Other Current Liabilities | Other short-term obligations |
| Payroll Clearing | Payroll clearing account |
| Payroll Tax Payable | Payroll taxes owed |
| Prepaid Revenue | Revenue received in advance |
| Sales Tax Payable | Collected sales tax owed |
| Trust Accounts - Liabilities | Money held in trust (liability) |

### LONG TERM LIABILITIES (Liability)
| Detail Type | Description |
|------------|-------------|
| Notes Payable | Long-term notes |
| Other Long-term Liabilities | Other long-term debt |
| Shareholder Notes Payable | Notes payable to shareholders |

### EQUITY
| Detail Type | Description |
|------------|-------------|
| Accumulated Adjustment | Prior period adjustments |
| Common Stock | Shares of common stock |
| Estimated Taxes | Estimated tax payments |
| Healthcare | Owner healthcare expenses |
| Opening Balance Equity | Opening balance offset account |
| Owner's Equity | General owner's equity |
| Paid-in Capital or Surplus | Capital above par value |
| Partner Contributions | Partner investments |
| Partner Distributions | Partner withdrawals |
| Partner's Equity | Partner's share of equity |
| Personal Expense | Owner personal expenses |
| Personal Income | Owner personal income |
| Preferred Stock | Shares of preferred stock |
| Retained Earnings | Cumulative net income |
| Treasury Stock | Repurchased company stock |

### INCOME
| Detail Type | Description |
|------------|-------------|
| Discounts/Refunds Given | Sales discounts and refunds |
| Non-Profit Income | Donations and grants |
| Other Primary Income | Other main business income |
| Sales of Product Income | Revenue from product sales |
| Service/Fee Income | Revenue from services |
| Unapplied Cash Payment Income | Unmatched customer payments |

### OTHER INCOME
| Detail Type | Description |
|------------|-------------|
| Dividend Income | Dividends received |
| Interest Earned | Interest income |
| Other Investment Income | Other investment returns |
| Other Miscellaneous Income | Miscellaneous income |
| Tax-Exempt Interest | Tax-free interest income |
| Unrealized Loss on Securities | Unrealized investment losses |

### COST OF GOODS SOLD (COGS)
| Detail Type | Description |
|------------|-------------|
| Cost of Labor - COGS | Direct labor costs |
| Equipment Rental - COGS | Equipment rental for production |
| Freight and Delivery - COGS | Shipping costs for goods |
| Other Costs of Services - COGS | Other service delivery costs |
| Supplies and Materials - COGS | Raw materials and supplies |

### EXPENSES
| Detail Type | Description |
|------------|-------------|
| Advertising/Promotional | Marketing and advertising |
| Auto | Vehicle expenses |
| Bad Debts | Written-off receivables |
| Bank Charges | Bank fees and charges |
| Charitable Contributions | Donations |
| Commissions and Fees | Sales commissions |
| Cost of Labor | Indirect labor |
| Dues and Subscriptions | Memberships and subscriptions |
| Entertainment | Client entertainment |
| Entertainment Meals | Business meals |
| Equipment Rental | Equipment leasing |
| Finance Costs | Interest and finance charges |
| Fuel | Fuel expenses |
| Insurance | Business insurance premiums |
| Interest Paid | Interest expenses |
| Legal and Professional Fees | Attorney and consultant fees |
| Office/General Administrative | Office expenses |
| Other Business Expenses | Miscellaneous expenses |
| Other Miscellaneous Service Cost | Other service costs |
| Payroll Expenses | Salaries and wages |
| Rent or Lease of Buildings | Building rent |
| Repair and Maintenance | Maintenance costs |
| Shipping, Freight and Delivery | Shipping expenses |
| Stationery and Printing | Office supplies |
| Supplies | General supplies |
| Taxes Paid | Business taxes |
| Travel | Business travel |
| Travel Meals | Meals during travel |
| Utilities | Electricity, water, internet |
| Unapplied Cash Bill Payment Expense | Unmatched vendor payments |

### OTHER EXPENSE
| Detail Type | Description |
|------------|-------------|
| Amortization | Amortization of intangibles |
| Depreciation | Depreciation of fixed assets |
| Exchange Gain or Loss | Currency exchange differences |
| Gas and Fuel | Fuel (non-auto) |
| Home Office | Home office expenses |
| Homeowner Rental Insurance | Rental property insurance |
| Mortgage Interest | Home/property mortgage interest |
| Other Home Office Expenses | Other home office costs |
| Other Miscellaneous Expense | Miscellaneous expenses |
| Other Vehicle Expenses | Other vehicle costs |
| Parking and Tolls | Parking fees and tolls |
| Penalties and Settlements | Fines and legal settlements |
| Taxes - Other | Other tax expenses |
| Vehicle | Vehicle costs |
| Vehicle Insurance | Auto insurance |
| Vehicle Lease | Auto lease payments |
| Vehicle Loan | Auto loan payments |
| Vehicle Loan Interest | Auto loan interest |
| Vehicle Registration | Registration fees |
| Vehicle Repairs | Auto repairs |
| Wash and Road Services | Carwash and roadside assistance |

---

## 3. Default Accounts (Auto-Created for New Companies)

When a new company registers, these accounts should be auto-created:

### Essential Default Accounts

| Account Name | Type | Sub-Type | Number | Why |
|-------------|------|----------|--------|-----|
| Cash on Hand | Bank | Cash on Hand | 1000 | Basic cash tracking |
| Business Checking | Bank | Checking | 1010 | Primary bank account |
| Business Savings | Bank | Savings | 1020 | Savings account |
| Accounts Receivable | Accounts Receivable | Accounts Receivable | 1100 | Customer invoicing |
| Inventory Asset | Other Current Assets | Inventory | 1200 | Track inventory |
| Prepaid Expenses | Other Current Assets | Prepaid Expenses | 1300 | Prepaid tracking |
| Undeposited Funds | Other Current Assets | Undeposited Funds | 1400 | Holding account |
| Furniture and Equipment | Fixed Assets | Furniture and Fixtures | 1500 | Track fixed assets |
| Accumulated Depreciation | Fixed Assets | Accumulated Depreciation | 1510 | Depreciation tracking |
| Accounts Payable | Accounts Payable | Accounts Payable | 2000 | Vendor bills |
| Sales Tax Payable | Other Current Liabilities | Sales Tax Payable | 2100 | Tax collection |
| Payroll Liabilities | Other Current Liabilities | Payroll Tax Payable | 2200 | Payroll taxes |
| Opening Balance Equity | Equity | Opening Balance Equity | 3000 | Opening balances |
| Owner's Equity | Equity | Owner's Equity | 3100 | Owner investment |
| Owner's Draw | Equity | Partner Distributions | 3200 | Owner withdrawals |
| Retained Earnings | Equity | Retained Earnings | 3300 | Accumulated profits |
| Sales Income | Income | Sales of Product Income | 4000 | Product revenue |
| Service Income | Income | Service/Fee Income | 4100 | Service revenue |
| Discounts Given | Income | Discounts/Refunds Given | 4200 | Sales discounts |
| Interest Income | Other Income | Interest Earned | 4500 | Bank interest |
| Other Income | Other Income | Other Miscellaneous Income | 4600 | Miscellaneous |
| Cost of Goods Sold | COGS | Supplies and Materials - COGS | 5000 | Product costs |
| Advertising & Marketing | Expenses | Advertising/Promotional | 6000 | Marketing |
| Bank Charges & Fees | Expenses | Bank Charges | 6010 | Bank fees |
| Insurance | Expenses | Insurance | 6020 | Insurance premiums |
| Office Supplies | Expenses | Supplies | 6030 | Office supplies |
| Payroll Expenses | Expenses | Payroll Expenses | 6040 | Salaries |
| Professional Fees | Expenses | Legal and Professional Fees | 6050 | Legal/consulting |
| Rent Expense | Expenses | Rent or Lease of Buildings | 6060 | Office rent |
| Repairs & Maintenance | Expenses | Repair and Maintenance | 6070 | Maintenance |
| Travel Expense | Expenses | Travel | 6080 | Business travel |
| Utilities | Expenses | Utilities | 6090 | Utility bills |
| Meals & Entertainment | Expenses | Entertainment Meals | 6100 | Business meals |
| Depreciation Expense | Other Expense | Depreciation | 7000 | Asset depreciation |
| Interest Expense | Other Expense | Other Miscellaneous Expense | 7010 | Loan interest |

---

## 4. Account Hierarchy (Parent-Child)

### How It Works
- An account can be a **sub-account** of another account of the **same type**
- Maximum depth: typically 3-4 levels
- Parent accounts show totals of all child accounts
- Child accounts must have the same account type as parent

### Example
```
6000 - Operating Expenses (Parent)
  ├── 6010 - Office Expenses (Sub-account)
  │     ├── 6011 - Office Supplies
  │     ├── 6012 - Printing & Postage
  │     └── 6013 - Software Subscriptions
  ├── 6020 - Insurance
  │     ├── 6021 - General Liability
  │     └── 6022 - Health Insurance
  └── 6030 - Utilities
        ├── 6031 - Electricity
        ├── 6032 - Internet
        └── 6033 - Phone
```

---

## 5. Account Number System

### Standard Ranges
```
1000 - 1999  →  Assets
2000 - 2999  →  Liabilities
3000 - 3999  →  Equity
4000 - 4999  →  Income (4000-4499 Primary, 4500-4999 Other)
5000 - 5999  →  Cost of Goods Sold
6000 - 6999  →  Expenses
7000 - 7999  →  Other Expenses
```

### Rules
- Account numbers are optional (QuickBooks makes them optional)
- They must be unique within a company
- Sub-accounts typically use parent number + sub-number
- Numbers help with sorting and organization

---

## 6. Account Properties (Database Fields)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| companyId | UUID | Yes | Company isolation |
| accountNumber | String | No | Optional account number |
| name | String | Yes | Account name |
| accountType | Enum | Yes | One of 15 account types |
| detailType | String | Yes | Sub-type/detail type |
| description | String | No | Account description |
| parentAccountId | UUID | No | Parent account (for hierarchy) |
| normalBalance | Enum | Yes | DEBIT or CREDIT |
| currentBalance | Decimal | Yes | Current balance (default 0) |
| isSystemAccount | Boolean | Yes | Can't be deleted |
| isActive | Boolean | Yes | Active/inactive |
| isSubAccount | Boolean | Yes | Is a sub-account? |
| depth | Integer | Yes | Hierarchy depth (0, 1, 2, 3) |
| displayOrder | Integer | No | Sort order |
| createdAt | DateTime | Yes | Creation timestamp |
| updatedAt | DateTime | Yes | Last update |

---

## 7. Business Rules & Validation

### Creation Rules
- Account name must be unique within the same company and type
- Account number (if used) must be unique within the company
- Sub-account must have the same account type as parent
- Maximum hierarchy depth: 4 levels
- Detail type must be valid for the selected account type

### Modification Rules
- Cannot change account type if account has transactions
- Cannot change to sub-account if account has sub-accounts
- Can rename an account at any time
- Can change detail type within the same account type

### Deletion Rules
- Cannot delete system/default accounts
- Cannot delete an account with transactions (must mark inactive)
- Cannot delete an account that has sub-accounts
- Can mark inactive instead of deleting

### Balance Rules
- Debit-normal accounts: Assets, Expenses, COGS, Other Expense
- Credit-normal accounts: Liabilities, Equity, Income, Other Income
- Balance Sheet accounts carry balances forward
- Income/Expense accounts reset each fiscal year

---

## 8. Reports Impact

### Balance Sheet
Groups accounts by type:
```
ASSETS
  Current Assets
    Bank
    Accounts Receivable
    Other Current Assets
  Fixed Assets
  Other Assets
TOTAL ASSETS

LIABILITIES
  Current Liabilities
    Accounts Payable
    Credit Card
    Other Current Liabilities
  Long Term Liabilities
TOTAL LIABILITIES

EQUITY
TOTAL EQUITY

TOTAL LIABILITIES + EQUITY
```

### Profit & Loss (Income Statement)
```
INCOME
  Income
  Other Income
TOTAL INCOME

COST OF GOODS SOLD
GROSS PROFIT

EXPENSES
  Expenses
  Other Expense
TOTAL EXPENSES

NET INCOME
```

### Trial Balance
Lists ALL accounts with debit/credit balances.
Total debits must equal total credits.

---

## 9. Multi-Company Isolation

- Each company has its own Chart of Accounts
- All accounts are scoped by `companyId`
- Default accounts are created per company on registration
- System account types and detail types are global (enums)
- Account numbers are unique per company (not globally)

---

## 10. Implementation Summary

### What We Need to Build

1. **Database Tables:**
   - `accounts` - Main chart of accounts table
   - Account type & detail type enums (in code, not DB tables)

2. **Seed Data:**
   - Default accounts created on company registration
   - System-defined account types and detail types

3. **API Endpoints (7):**
   - `GET /accounts` - List all accounts (with filtering)
   - `GET /accounts/:id` - Get account details
   - `POST /accounts` - Create new account
   - `PATCH /accounts/:id` - Update account
   - `DELETE /accounts/:id` - Delete/deactivate account
   - `GET /accounts/types` - Get all account types with detail types
   - `GET /accounts/tree` - Get accounts as hierarchy tree

4. **Service Layer:**
   - CRUD operations
   - Validation (type matching, hierarchy rules)
   - Balance calculations
   - Default account seeding
   - Hierarchy management

5. **Permissions:**
   - `account:view` - View chart of accounts
   - `account:create` - Create accounts
   - `account:update` - Edit accounts
   - `account:delete` - Delete/deactivate accounts