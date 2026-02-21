import { AccountType, NormalBalance } from './account-types.constant';

/**
 * Default accounts auto-created for every new company
 */

export interface DefaultAccountDef {
  accountNumber: string;
  name: string;
  accountType: AccountType;
  detailType: string;
  normalBalance: NormalBalance;
  description: string;
}

export const DEFAULT_ACCOUNTS: DefaultAccountDef[] = [
  // =========================================================================
  // ASSETS
  // =========================================================================

  // Bank
  {
    accountNumber: '1000',
    name: 'Cash on Hand',
    accountType: AccountType.BANK,
    detailType: 'Cash on Hand',
    normalBalance: NormalBalance.DEBIT,
    description: 'Physical cash and petty cash',
  },
  {
    accountNumber: '1010',
    name: 'Business Checking',
    accountType: AccountType.BANK,
    detailType: 'Checking',
    normalBalance: NormalBalance.DEBIT,
    description: 'Primary business checking account',
  },
  {
    accountNumber: '1020',
    name: 'Business Savings',
    accountType: AccountType.BANK,
    detailType: 'Savings',
    normalBalance: NormalBalance.DEBIT,
    description: 'Business savings account',
  },

  // Accounts Receivable
  {
    accountNumber: '1100',
    name: 'Accounts Receivable',
    accountType: AccountType.ACCOUNTS_RECEIVABLE,
    detailType: 'Accounts Receivable',
    normalBalance: NormalBalance.DEBIT,
    description: 'Money owed by customers',
  },

  // Other Current Assets
  {
    accountNumber: '1200',
    name: 'Inventory Asset',
    accountType: AccountType.OTHER_CURRENT_ASSETS,
    detailType: 'Inventory',
    normalBalance: NormalBalance.DEBIT,
    description: 'Value of products held for sale',
  },
  {
    accountNumber: '1300',
    name: 'Prepaid Expenses',
    accountType: AccountType.OTHER_CURRENT_ASSETS,
    detailType: 'Prepaid Expenses',
    normalBalance: NormalBalance.DEBIT,
    description: 'Expenses paid in advance',
  },
  {
    accountNumber: '1400',
    name: 'Undeposited Funds',
    accountType: AccountType.OTHER_CURRENT_ASSETS,
    detailType: 'Undeposited Funds',
    normalBalance: NormalBalance.DEBIT,
    description: 'Payments received but not yet deposited',
  },

  // Fixed Assets
  {
    accountNumber: '1500',
    name: 'Furniture and Equipment',
    accountType: AccountType.FIXED_ASSETS,
    detailType: 'Furniture and Fixtures',
    normalBalance: NormalBalance.DEBIT,
    description: 'Office furniture and equipment',
  },
  {
    accountNumber: '1510',
    name: 'Accumulated Depreciation',
    accountType: AccountType.FIXED_ASSETS,
    detailType: 'Accumulated Depreciation',
    normalBalance: NormalBalance.CREDIT,
    description: 'Total depreciation on fixed assets',
  },

  // =========================================================================
  // LIABILITIES
  // =========================================================================

  // Accounts Payable
  {
    accountNumber: '2000',
    name: 'Accounts Payable',
    accountType: AccountType.ACCOUNTS_PAYABLE,
    detailType: 'Accounts Payable',
    normalBalance: NormalBalance.CREDIT,
    description: 'Money owed to vendors and suppliers',
  },

  // Other Current Liabilities
  {
    accountNumber: '2100',
    name: 'Sales Tax Payable',
    accountType: AccountType.OTHER_CURRENT_LIABILITIES,
    detailType: 'Sales Tax Payable',
    normalBalance: NormalBalance.CREDIT,
    description: 'Sales tax collected and owed to government',
  },
  {
    accountNumber: '2200',
    name: 'Payroll Liabilities',
    accountType: AccountType.OTHER_CURRENT_LIABILITIES,
    detailType: 'Payroll Tax Payable',
    normalBalance: NormalBalance.CREDIT,
    description: 'Payroll taxes and withholdings owed',
  },
  {
    accountNumber: '2300',
    name: 'Income Tax Payable',
    accountType: AccountType.OTHER_CURRENT_LIABILITIES,
    detailType: 'Income Tax Payable',
    normalBalance: NormalBalance.CREDIT,
    description: 'Income taxes owed',
  },

  // =========================================================================
  // EQUITY
  // =========================================================================
  {
    accountNumber: '3000',
    name: 'Opening Balance Equity',
    accountType: AccountType.EQUITY,
    detailType: 'Opening Balance Equity',
    normalBalance: NormalBalance.CREDIT,
    description: 'Used to offset opening balance entries',
  },
  {
    accountNumber: '3100',
    name: "Owner's Equity",
    accountType: AccountType.EQUITY,
    detailType: "Owner's Equity",
    normalBalance: NormalBalance.CREDIT,
    description: "Owner's investment in the business",
  },
  {
    accountNumber: '3200',
    name: "Owner's Draw",
    accountType: AccountType.EQUITY,
    detailType: 'Partner Distributions',
    normalBalance: NormalBalance.DEBIT,
    description: "Owner's withdrawals from the business",
  },
  {
    accountNumber: '3300',
    name: 'Retained Earnings',
    accountType: AccountType.EQUITY,
    detailType: 'Retained Earnings',
    normalBalance: NormalBalance.CREDIT,
    description: 'Cumulative net income retained in the business',
  },

  // =========================================================================
  // INCOME
  // =========================================================================
  {
    accountNumber: '4000',
    name: 'Sales Income',
    accountType: AccountType.INCOME,
    detailType: 'Sales of Product Income',
    normalBalance: NormalBalance.CREDIT,
    description: 'Revenue from product sales',
  },
  {
    accountNumber: '4100',
    name: 'Service Income',
    accountType: AccountType.INCOME,
    detailType: 'Service/Fee Income',
    normalBalance: NormalBalance.CREDIT,
    description: 'Revenue from services rendered',
  },
  {
    accountNumber: '4200',
    name: 'Discounts Given',
    accountType: AccountType.INCOME,
    detailType: 'Discounts/Refunds Given',
    normalBalance: NormalBalance.DEBIT,
    description: 'Discounts and refunds given to customers',
  },

  // Other Income
  {
    accountNumber: '4500',
    name: 'Interest Income',
    accountType: AccountType.OTHER_INCOME,
    detailType: 'Interest Earned',
    normalBalance: NormalBalance.CREDIT,
    description: 'Interest earned on bank accounts and investments',
  },
  {
    accountNumber: '4600',
    name: 'Other Income',
    accountType: AccountType.OTHER_INCOME,
    detailType: 'Other Miscellaneous Income',
    normalBalance: NormalBalance.CREDIT,
    description: 'Miscellaneous non-operating income',
  },

  // =========================================================================
  // COST OF GOODS SOLD
  // =========================================================================
  {
    accountNumber: '5000',
    name: 'Cost of Goods Sold',
    accountType: AccountType.COST_OF_GOODS_SOLD,
    detailType: 'Supplies and Materials - COGS',
    normalBalance: NormalBalance.DEBIT,
    description: 'Direct cost of products sold',
  },
  {
    accountNumber: '5100',
    name: 'Cost of Labor',
    accountType: AccountType.COST_OF_GOODS_SOLD,
    detailType: 'Cost of Labor - COGS',
    normalBalance: NormalBalance.DEBIT,
    description: 'Direct labor costs for products/services',
  },
  {
    accountNumber: '5200',
    name: 'Shipping and Delivery',
    accountType: AccountType.COST_OF_GOODS_SOLD,
    detailType: 'Freight and Delivery - COGS',
    normalBalance: NormalBalance.DEBIT,
    description: 'Shipping costs for goods sold',
  },

  // =========================================================================
  // EXPENSES
  // =========================================================================
  {
    accountNumber: '6000',
    name: 'Advertising & Marketing',
    accountType: AccountType.EXPENSES,
    detailType: 'Advertising/Promotional',
    normalBalance: NormalBalance.DEBIT,
    description: 'Marketing and advertising expenses',
  },
  {
    accountNumber: '6010',
    name: 'Bank Charges & Fees',
    accountType: AccountType.EXPENSES,
    detailType: 'Bank Charges',
    normalBalance: NormalBalance.DEBIT,
    description: 'Bank service charges and fees',
  },
  {
    accountNumber: '6020',
    name: 'Insurance',
    accountType: AccountType.EXPENSES,
    detailType: 'Insurance',
    normalBalance: NormalBalance.DEBIT,
    description: 'Business insurance premiums',
  },
  {
    accountNumber: '6030',
    name: 'Office Supplies',
    accountType: AccountType.EXPENSES,
    detailType: 'Supplies',
    normalBalance: NormalBalance.DEBIT,
    description: 'Office supplies and consumables',
  },
  {
    accountNumber: '6040',
    name: 'Payroll Expenses',
    accountType: AccountType.EXPENSES,
    detailType: 'Payroll Expenses',
    normalBalance: NormalBalance.DEBIT,
    description: 'Salaries, wages, and payroll costs',
  },
  {
    accountNumber: '6050',
    name: 'Professional Fees',
    accountType: AccountType.EXPENSES,
    detailType: 'Legal and Professional Fees',
    normalBalance: NormalBalance.DEBIT,
    description: 'Legal, accounting, and consulting fees',
  },
  {
    accountNumber: '6060',
    name: 'Rent Expense',
    accountType: AccountType.EXPENSES,
    detailType: 'Rent or Lease of Buildings',
    normalBalance: NormalBalance.DEBIT,
    description: 'Office and building rent',
  },
  {
    accountNumber: '6070',
    name: 'Repairs & Maintenance',
    accountType: AccountType.EXPENSES,
    detailType: 'Repair and Maintenance',
    normalBalance: NormalBalance.DEBIT,
    description: 'Repairs and maintenance costs',
  },
  {
    accountNumber: '6080',
    name: 'Travel Expense',
    accountType: AccountType.EXPENSES,
    detailType: 'Travel',
    normalBalance: NormalBalance.DEBIT,
    description: 'Business travel expenses',
  },
  {
    accountNumber: '6090',
    name: 'Utilities',
    accountType: AccountType.EXPENSES,
    detailType: 'Utilities',
    normalBalance: NormalBalance.DEBIT,
    description: 'Electricity, water, internet, and phone',
  },
  {
    accountNumber: '6100',
    name: 'Meals & Entertainment',
    accountType: AccountType.EXPENSES,
    detailType: 'Entertainment Meals',
    normalBalance: NormalBalance.DEBIT,
    description: 'Business meals and entertainment',
  },
  {
    accountNumber: '6110',
    name: 'Dues & Subscriptions',
    accountType: AccountType.EXPENSES,
    detailType: 'Dues and Subscriptions',
    normalBalance: NormalBalance.DEBIT,
    description: 'Memberships and subscriptions',
  },
  {
    accountNumber: '6120',
    name: 'Auto Expense',
    accountType: AccountType.EXPENSES,
    detailType: 'Auto',
    normalBalance: NormalBalance.DEBIT,
    description: 'Vehicle expenses for business',
  },

  // =========================================================================
  // OTHER EXPENSES
  // =========================================================================
  {
    accountNumber: '7000',
    name: 'Depreciation Expense',
    accountType: AccountType.OTHER_EXPENSE,
    detailType: 'Depreciation',
    normalBalance: NormalBalance.DEBIT,
    description: 'Periodic depreciation of fixed assets',
  },
  {
    accountNumber: '7010',
    name: 'Penalties & Settlements',
    accountType: AccountType.OTHER_EXPENSE,
    detailType: 'Penalties and Settlements',
    normalBalance: NormalBalance.DEBIT,
    description: 'Fines, penalties, and legal settlements',
  },
];