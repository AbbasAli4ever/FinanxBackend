# Chart of Accounts - Frontend Integration Guide

## Overview

This guide covers how to implement the **Chart of Accounts (COA)** pages on the frontend. You'll need:

1. **Chart of Accounts List Page** - View all accounts in a table/tree
2. **Create Account Modal/Page** - Add new accounts
3. **Edit Account Modal/Page** - Update existing accounts
4. **Account Detail View** - View account with sub-accounts

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** All endpoints require `Authorization: Bearer <token>` header

---

## Page 1: Chart of Accounts List (`/chart-of-accounts`)

### Purpose
Display all accounts in a table with filtering, search, and tree view toggle.

### API Call - Flat List
```
GET /api/v1/accounts?accountType=Bank&search=cash&isActive=true
Authorization: Bearer <token>
```

**Query Parameters (all optional):**
| Param | Type | Example | Description |
|-------|------|---------|-------------|
| accountType | string | "Bank" | Filter by account type |
| detailType | string | "Checking" | Filter by detail type |
| search | string | "cash" | Search name, number, description |
| isActive | boolean | true | Filter active/inactive |
| isSubAccount | boolean | false | Filter root vs sub-accounts |
| parentAccountId | UUID | "abc-123" | Get children of specific parent |
| sortBy | string | "name" | Sort field: accountNumber, name, accountType, currentBalance, createdAt |
| sortOrder | string | "asc" | "asc" or "desc" |

**Response:**
```json
{
  "success": true,
  "message": "Accounts retrieved successfully",
  "data": [
    {
      "id": "uuid-here",
      "accountNumber": "1000",
      "name": "Cash on Hand",
      "description": "Physical cash and petty cash",
      "accountType": "Bank",
      "detailType": "Cash on Hand",
      "normalBalance": "DEBIT",
      "parentAccount": null,
      "isSubAccount": false,
      "depth": 0,
      "fullPath": "Cash on Hand",
      "currentBalance": 0,
      "isSystemAccount": true,
      "isActive": true,
      "displayOrder": 0,
      "subAccountsCount": 0,
      "createdAt": "2026-02-10T12:26:43.227Z",
      "updatedAt": "2026-02-10T12:26:43.227Z"
    }
  ]
}
```

### API Call - Tree View
```
GET /api/v1/accounts/tree?accountType=Bank
Authorization: Bearer <token>
```

**Response (grouped by type group):**
```json
{
  "success": true,
  "data": {
    "Assets": [
      {
        "id": "uuid",
        "accountNumber": "1000",
        "name": "Cash on Hand",
        "accountType": "Bank",
        "detailType": "Cash on Hand",
        "normalBalance": "DEBIT",
        "currentBalance": 0,
        "isSystemAccount": true,
        "depth": 0,
        "children": [
          {
            "id": "uuid",
            "accountNumber": "1001",
            "name": "Petty Cash",
            "depth": 1,
            "children": []
          }
        ]
      }
    ],
    "Liabilities": [...],
    "Equity": [...],
    "Income": [...],
    "Expenses": [...]
  }
}
```

### UI Layout

```
┌──────────────────────────────────────────────────────────┐
│  Chart of Accounts                      [+ New Account]  │
├──────────────────────────────────────────────────────────┤
│  [Search...] [Type: All ▼] [Status: Active ▼] [🌲/📋]  │
├──────────────────────────────────────────────────────────┤
│  # Number  │ Name              │ Type     │ Balance │ ⋯  │
│  ─────────────────────────────────────────────────────── │
│  ASSETS                                                  │
│  1000      │ Cash on Hand      │ Bank     │   0.00  │ ⋯  │
│  1010      │ Business Checking  │ Bank     │   0.00  │ ⋯  │
│  1100      │ Accounts Receivable│ A/R      │   0.00  │ ⋯  │
│  ─────────────────────────────────────────────────────── │
│  LIABILITIES                                             │
│  2000      │ Accounts Payable  │ A/P      │   0.00  │ ⋯  │
│  ...                                                     │
│  ─────────────────────────────────────────────────────── │
│  EQUITY                                                  │
│  3000      │ Opening Balance   │ Equity   │   0.00  │ ⋯  │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
```

### Example React Code

```jsx
const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [treeView, setTreeView] = useState(false);
  const [filters, setFilters] = useState({
    accountType: '',
    search: '',
    isActive: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, [filters, treeView]);

  const fetchAccounts = async () => {
    const params = new URLSearchParams();
    if (filters.accountType) params.append('accountType', filters.accountType);
    if (filters.search) params.append('search', filters.search);
    if (filters.isActive !== undefined) params.append('isActive', filters.isActive);

    const endpoint = treeView ? 'accounts/tree' : 'accounts';
    const response = await fetch(
      `http://localhost:3000/api/v1/${endpoint}?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    setAccounts(data.data);
  };

  return (
    <div>
      <header>
        <h1>Chart of Accounts</h1>
        <button onClick={() => openCreateModal()}>+ New Account</button>
      </header>

      <div className="filters">
        <input
          type="text"
          placeholder="Search accounts..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <select
          value={filters.accountType}
          onChange={(e) => setFilters({ ...filters, accountType: e.target.value })}
        >
          <option value="">All Types</option>
          {/* Populate from GET /accounts/types */}
        </select>
        <button onClick={() => setTreeView(!treeView)}>
          {treeView ? '📋 List' : '🌲 Tree'}
        </button>
      </div>

      {treeView ? (
        <TreeView data={accounts} />
      ) : (
        <AccountsTable accounts={accounts} />
      )}
    </div>
  );
};
```

---

## Page 2: Create Account Modal

### Step 1: Load Account Types (for dropdowns)
```
GET /api/v1/accounts/types
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "all": [
      {
        "value": "Bank",
        "label": "Bank",
        "group": "Assets",
        "normalBalance": "DEBIT",
        "numberRange": "1000-1099",
        "isBalanceSheet": true,
        "description": "Bank and cash accounts",
        "detailTypes": ["Cash on Hand", "Checking", "Money Market", "Savings", "Trust Accounts", "Rents Held in Trust"]
      },
      ...
    ],
    "grouped": {
      "Assets": [...],
      "Liabilities": [...],
      "Equity": [...],
      "Income": [...],
      "Expenses": [...]
    },
    "groups": ["Assets", "Liabilities", "Equity", "Income", "Expenses"]
  }
}
```

### Step 2: Create Account
```
POST /api/v1/accounts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Office Equipment",
  "accountType": "Fixed Assets",
  "detailType": "Furniture and Fixtures",
  "accountNumber": "1520",
  "description": "Office equipment and computers",
  "parentAccountId": null,
  "isSubAccount": false
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "new-uuid",
    "accountNumber": "1520",
    "name": "Office Equipment",
    "accountType": "Fixed Assets",
    "detailType": "Furniture and Fixtures",
    "normalBalance": "DEBIT",
    "parentAccount": null,
    "isSubAccount": false,
    "depth": 0,
    "fullPath": "Office Equipment",
    "currentBalance": 0,
    "isSystemAccount": false,
    "isActive": true
  }
}
```

**Error Responses:**
```json
// Invalid account type
{ "statusCode": 400, "message": "Invalid account type: \"InvalidType\"..." }

// Invalid detail type
{ "statusCode": 400, "message": "Invalid detail type \"Wrong\" for account type \"Bank\"..." }

// Duplicate account number
{ "statusCode": 409, "message": "Account number \"1000\" already exists" }

// Duplicate name
{ "statusCode": 409, "message": "Account name \"Cash on Hand\" already exists" }

// Max hierarchy depth
{ "statusCode": 400, "message": "Maximum account hierarchy depth of 4 levels exceeded" }
```

### Create Sub-Account
```json
POST /api/v1/accounts
{
  "name": "Google Ads",
  "accountType": "Expenses",
  "detailType": "Advertising/Promotional",
  "parentAccountId": "parent-uuid-here",
  "isSubAccount": true
}
```

Response includes:
```json
{
  "data": {
    "parentAccount": { "id": "parent-uuid", "name": "Advertising & Marketing", "accountNumber": "6000" },
    "isSubAccount": true,
    "depth": 1,
    "fullPath": "Advertising & Marketing > Google Ads"
  }
}
```

### UI Layout

```
┌────────────────────────────────────────────┐
│  Create New Account                    [X] │
├────────────────────────────────────────────┤
│                                            │
│  Account Type *          [Select type  ▼]  │
│  (Grouped: Assets, Liabilities, etc.)      │
│                                            │
│  Detail Type *           [Select type  ▼]  │
│  (Options change based on Account Type)    │
│                                            │
│  Account Name *          [_______________] │
│                                            │
│  Account Number          [_______________] │
│  (Suggested range: 1000-1099)              │
│                                            │
│  Description             [_______________] │
│                                            │
│  ☐ Make this a sub-account of:             │
│     Parent Account       [Select parent ▼] │
│                                            │
│           [Cancel]  [Save Account]         │
└────────────────────────────────────────────┘
```

### Example React Code

```jsx
const CreateAccountModal = ({ onClose, onCreated }) => {
  const [accountTypes, setAccountTypes] = useState(null);
  const [form, setForm] = useState({
    name: '',
    accountType: '',
    detailType: '',
    accountNumber: '',
    description: '',
    parentAccountId: '',
    isSubAccount: false,
  });
  const [error, setError] = useState('');

  // Load account types on mount
  useEffect(() => {
    const loadTypes = async () => {
      const response = await fetch('http://localhost:3000/api/v1/accounts/types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setAccountTypes(data.data);
    };
    loadTypes();
  }, []);

  // Get detail types for selected account type
  const getDetailTypes = () => {
    if (!accountTypes || !form.accountType) return [];
    const type = accountTypes.all.find((t) => t.value === form.accountType);
    return type?.detailTypes || [];
  };

  // Get suggested number range
  const getNumberRange = () => {
    if (!accountTypes || !form.accountType) return '';
    const type = accountTypes.all.find((t) => t.value === form.accountType);
    return type?.numberRange || '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const body = {
      name: form.name,
      accountType: form.accountType,
      detailType: form.detailType,
      ...(form.accountNumber && { accountNumber: form.accountNumber }),
      ...(form.description && { description: form.description }),
      ...(form.isSubAccount && form.parentAccountId && {
        parentAccountId: form.parentAccountId,
        isSubAccount: true,
      }),
    };

    const response = await fetch('http://localhost:3000/api/v1/accounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.success) {
      onCreated(data.data);
      onClose();
    } else {
      setError(data.message || 'Failed to create account');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create New Account</h2>

      {error && <div className="error">{error}</div>}

      {/* Account Type - Grouped dropdown */}
      <select
        value={form.accountType}
        onChange={(e) => setForm({ ...form, accountType: e.target.value, detailType: '' })}
        required
      >
        <option value="">Select Account Type</option>
        {accountTypes?.groups.map((group) => (
          <optgroup key={group} label={group}>
            {accountTypes.grouped[group].map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Detail Type - Depends on Account Type */}
      <select
        value={form.detailType}
        onChange={(e) => setForm({ ...form, detailType: e.target.value })}
        required
        disabled={!form.accountType}
      >
        <option value="">Select Detail Type</option>
        {getDetailTypes().map((dt) => (
          <option key={dt} value={dt}>{dt}</option>
        ))}
      </select>

      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        placeholder="Account Name"
        required
      />

      <input
        type="text"
        value={form.accountNumber}
        onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
        placeholder={`Account Number (Range: ${getNumberRange()})`}
      />

      <textarea
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Description (optional)"
      />

      <label>
        <input
          type="checkbox"
          checked={form.isSubAccount}
          onChange={(e) => setForm({ ...form, isSubAccount: e.target.checked })}
        />
        Make this a sub-account
      </label>

      {form.isSubAccount && (
        <select
          value={form.parentAccountId}
          onChange={(e) => setForm({ ...form, parentAccountId: e.target.value })}
          required
        >
          <option value="">Select Parent Account</option>
          {/* Fetch and show accounts of same type */}
        </select>
      )}

      <button type="submit">Save Account</button>
      <button type="button" onClick={onClose}>Cancel</button>
    </form>
  );
};
```

---

## Page 3: Edit Account

### API Call
```
PATCH /api/v1/accounts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "accountNumber": "1001",
  "description": "Updated description",
  "detailType": "Savings",
  "isActive": false
}
```

**Note:** `accountType` and `normalBalance` CANNOT be changed after creation.

**Response:**
```json
{
  "success": true,
  "message": "Account updated successfully",
  "data": { ... }
}
```

---

## Page 4: Delete Account

### API Call
```
DELETE /api/v1/accounts/:id
Authorization: Bearer <token>
```

**Success Response:**
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": null
}
```

**Error Responses:**
```json
// System account
{ "statusCode": 400, "message": "System accounts cannot be deleted" }

// Has sub-accounts
{ "statusCode": 400, "message": "Cannot delete account with 2 sub-account(s). Delete sub-accounts first." }

// Has balance
{ "statusCode": 400, "message": "Cannot delete account with a non-zero balance. Transfer the balance first." }
```

### UI: Confirm before delete
```jsx
const handleDelete = async (accountId, accountName, isSystemAccount) => {
  if (isSystemAccount) {
    alert('System accounts cannot be deleted');
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete "${accountName}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  const response = await fetch(`http://localhost:3000/api/v1/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json();
  if (data.success) {
    refreshAccounts();
  } else {
    alert(data.message);
  }
};
```

---

## Account Type → Detail Type Mapping

When the user selects an **Account Type**, the **Detail Type** dropdown must update. Here's the complete mapping:

### Assets
| Account Type | Detail Types |
|-------------|-------------|
| Bank | Cash on Hand, Checking, Money Market, Savings, Trust Accounts, Rents Held in Trust |
| Accounts Receivable | Accounts Receivable |
| Other Current Assets | Allowance for Bad Debts, Development Costs, Employee Cash Advances, Inventory, Investments (4 types), Loans (3 types), Other Current Assets, Prepaid Expenses, Retainage, Undeposited Funds |
| Fixed Assets | Accumulated Depreciation, Buildings, Depletable Assets, Furniture and Fixtures, Intangible Assets, Land, Leasehold Improvements, Machinery and Equipment, Other Fixed Assets, Vehicles |
| Other Assets | Accumulated Amortization, Goodwill, Lease Buyout, Licenses, Organizational Costs, Other Long-term Assets, Security Deposits |

### Liabilities
| Account Type | Detail Types |
|-------------|-------------|
| Accounts Payable | Accounts Payable |
| Credit Card | Credit Card |
| Other Current Liabilities | Current Portion of Finance Leases, Current Tax Liability, Dividends Payable, Income Tax Payable, Insurance Premium, Line of Credit, Loan Payable, Other Current Liabilities, Payroll Clearing, Payroll Tax Payable, Prepaid Revenue, Sales Tax Payable, Trust Accounts - Liabilities |
| Long Term Liabilities | Notes Payable, Other Long-term Liabilities, Shareholder Notes Payable |

### Equity
| Account Type | Detail Types |
|-------------|-------------|
| Equity | Accumulated Adjustment, Common Stock, Estimated Taxes, Healthcare, Opening Balance Equity, Owner's Equity, Paid-in Capital, Partner Contributions, Partner Distributions, Partner's Equity, Personal Expense, Personal Income, Preferred Stock, Retained Earnings, Treasury Stock |

### Income
| Account Type | Detail Types |
|-------------|-------------|
| Income | Discounts/Refunds Given, Non-Profit Income, Other Primary Income, Sales of Product Income, Service/Fee Income, Unapplied Cash Payment Income |
| Other Income | Dividend Income, Interest Earned, Other Investment Income, Other Miscellaneous Income, Tax-Exempt Interest, Unrealized Loss on Securities |

### Expenses
| Account Type | Detail Types |
|-------------|-------------|
| Cost of Goods Sold | Cost of Labor - COGS, Equipment Rental - COGS, Freight and Delivery - COGS, Other Costs of Services - COGS, Supplies and Materials - COGS |
| Expenses | Advertising/Promotional, Auto, Bad Debts, Bank Charges, Charitable Contributions, Commissions and Fees, Cost of Labor, Dues and Subscriptions, Entertainment, Entertainment Meals, Equipment Rental, Finance Costs, Insurance, Interest Paid, Legal and Professional Fees, Office/General Administrative, Other Business Expenses, Other Misc Service Cost, Payroll Expenses, Rent or Lease, Repair and Maintenance, Shipping/Freight, Stationery, Supplies, Taxes Paid, Travel, Travel Meals, Unapplied Cash Bill Payment, Utilities |
| Other Expense | Amortization, Depreciation, Exchange Gain/Loss, Gas and Fuel, Home Office, Homeowner Insurance, Mortgage Interest, Other Home Office, Other Misc Expense, Other Vehicle Expenses, Parking and Tolls, Penalties and Settlements, Taxes - Other, Vehicle (6 types), Wash and Road Services |

---

## Account Number Ranges

| Account Type | Number Range |
|-------------|-------------|
| Bank | 1000-1099 |
| Accounts Receivable | 1100-1199 |
| Other Current Assets | 1200-1499 |
| Fixed Assets | 1500-1799 |
| Other Assets | 1800-1999 |
| Accounts Payable | 2000-2099 |
| Credit Card | 2100-2199 |
| Other Current Liabilities | 2200-2499 |
| Long Term Liabilities | 2500-2999 |
| Equity | 3000-3999 |
| Income | 4000-4499 |
| Other Income | 4500-4999 |
| Cost of Goods Sold | 5000-5999 |
| Expenses | 6000-6999 |
| Other Expense | 7000-7999 |

Show these ranges as hints when the user selects an account type.

---

## Important Business Rules

1. **Account type cannot be changed** after creation
2. **Detail type must match** the selected account type
3. **Sub-accounts must be same type** as parent
4. **Max 4 levels deep** in hierarchy
5. **System accounts** (default 33) cannot be deleted
6. **Accounts with balance** cannot be deleted
7. **Accounts with sub-accounts** must have sub-accounts deleted first
8. **Account numbers** are optional but must be unique per company
9. **Account names** must be unique per parent level per company
10. **Normal balance** (DEBIT/CREDIT) is auto-assigned based on account type

---

## Checklist

- [ ] Create `/chart-of-accounts` page with table view
- [ ] Add tree view toggle (use GET /accounts/tree)
- [ ] Implement search and filter controls
- [ ] Create "New Account" modal with cascading dropdowns
- [ ] Show account number range hints per type
- [ ] Implement sub-account creation with parent selector
- [ ] Create edit account modal (restrict accountType change)
- [ ] Implement delete with confirmation dialog
- [ ] Handle error messages from API
- [ ] Disable delete button for system accounts
- [ ] Show sub-account count and expand/collapse in tree view
- [ ] Format balance as currency
- [ ] Add loading states
- [ ] Group accounts by type group in table view (Assets, Liabilities, etc.)