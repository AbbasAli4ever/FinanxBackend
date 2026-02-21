/**
 * Chart of Accounts - Account Types & Detail Types
 * Based on QuickBooks Online structure (15 types, ~120+ detail types)
 */

// =============================================================================
// ACCOUNT TYPES (15 types grouped into 5 categories)
// =============================================================================

export enum AccountTypeGroup {
  ASSETS = 'Assets',
  LIABILITIES = 'Liabilities',
  EQUITY = 'Equity',
  INCOME = 'Income',
  EXPENSES = 'Expenses',
}

export enum AccountType {
  // Assets (5)
  BANK = 'Bank',
  ACCOUNTS_RECEIVABLE = 'Accounts Receivable',
  OTHER_CURRENT_ASSETS = 'Other Current Assets',
  FIXED_ASSETS = 'Fixed Assets',
  OTHER_ASSETS = 'Other Assets',

  // Liabilities (4)
  ACCOUNTS_PAYABLE = 'Accounts Payable',
  CREDIT_CARD = 'Credit Card',
  OTHER_CURRENT_LIABILITIES = 'Other Current Liabilities',
  LONG_TERM_LIABILITIES = 'Long Term Liabilities',

  // Equity (1)
  EQUITY = 'Equity',

  // Income (2)
  INCOME = 'Income',
  OTHER_INCOME = 'Other Income',

  // Expenses (3)
  COST_OF_GOODS_SOLD = 'Cost of Goods Sold',
  EXPENSES = 'Expenses',
  OTHER_EXPENSE = 'Other Expense',
}

export enum NormalBalance {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

// =============================================================================
// ACCOUNT TYPE METADATA
// =============================================================================

export interface AccountTypeInfo {
  type: AccountType;
  group: AccountTypeGroup;
  normalBalance: NormalBalance;
  numberRangeStart: number;
  numberRangeEnd: number;
  isBalanceSheet: boolean;
  description: string;
}

export const ACCOUNT_TYPE_INFO: Record<AccountType, AccountTypeInfo> = {
  // ASSETS
  [AccountType.BANK]: {
    type: AccountType.BANK,
    group: AccountTypeGroup.ASSETS,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 1000,
    numberRangeEnd: 1099,
    isBalanceSheet: true,
    description: 'Bank and cash accounts',
  },
  [AccountType.ACCOUNTS_RECEIVABLE]: {
    type: AccountType.ACCOUNTS_RECEIVABLE,
    group: AccountTypeGroup.ASSETS,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 1100,
    numberRangeEnd: 1199,
    isBalanceSheet: true,
    description: 'Money owed by customers',
  },
  [AccountType.OTHER_CURRENT_ASSETS]: {
    type: AccountType.OTHER_CURRENT_ASSETS,
    group: AccountTypeGroup.ASSETS,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 1200,
    numberRangeEnd: 1499,
    isBalanceSheet: true,
    description: 'Short-term assets like inventory and prepaid expenses',
  },
  [AccountType.FIXED_ASSETS]: {
    type: AccountType.FIXED_ASSETS,
    group: AccountTypeGroup.ASSETS,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 1500,
    numberRangeEnd: 1799,
    isBalanceSheet: true,
    description: 'Long-term physical assets like equipment and buildings',
  },
  [AccountType.OTHER_ASSETS]: {
    type: AccountType.OTHER_ASSETS,
    group: AccountTypeGroup.ASSETS,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 1800,
    numberRangeEnd: 1999,
    isBalanceSheet: true,
    description: 'Long-term non-physical assets',
  },

  // LIABILITIES
  [AccountType.ACCOUNTS_PAYABLE]: {
    type: AccountType.ACCOUNTS_PAYABLE,
    group: AccountTypeGroup.LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 2000,
    numberRangeEnd: 2099,
    isBalanceSheet: true,
    description: 'Money owed to vendors',
  },
  [AccountType.CREDIT_CARD]: {
    type: AccountType.CREDIT_CARD,
    group: AccountTypeGroup.LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 2100,
    numberRangeEnd: 2199,
    isBalanceSheet: true,
    description: 'Credit card accounts',
  },
  [AccountType.OTHER_CURRENT_LIABILITIES]: {
    type: AccountType.OTHER_CURRENT_LIABILITIES,
    group: AccountTypeGroup.LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 2200,
    numberRangeEnd: 2499,
    isBalanceSheet: true,
    description: 'Short-term obligations like taxes and payroll',
  },
  [AccountType.LONG_TERM_LIABILITIES]: {
    type: AccountType.LONG_TERM_LIABILITIES,
    group: AccountTypeGroup.LIABILITIES,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 2500,
    numberRangeEnd: 2999,
    isBalanceSheet: true,
    description: 'Long-term debts like loans and mortgages',
  },

  // EQUITY
  [AccountType.EQUITY]: {
    type: AccountType.EQUITY,
    group: AccountTypeGroup.EQUITY,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 3000,
    numberRangeEnd: 3999,
    isBalanceSheet: true,
    description: 'Owner equity, retained earnings, and capital',
  },

  // INCOME
  [AccountType.INCOME]: {
    type: AccountType.INCOME,
    group: AccountTypeGroup.INCOME,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 4000,
    numberRangeEnd: 4499,
    isBalanceSheet: false,
    description: 'Primary business revenue',
  },
  [AccountType.OTHER_INCOME]: {
    type: AccountType.OTHER_INCOME,
    group: AccountTypeGroup.INCOME,
    normalBalance: NormalBalance.CREDIT,
    numberRangeStart: 4500,
    numberRangeEnd: 4999,
    isBalanceSheet: false,
    description: 'Non-primary income like interest and dividends',
  },

  // EXPENSES
  [AccountType.COST_OF_GOODS_SOLD]: {
    type: AccountType.COST_OF_GOODS_SOLD,
    group: AccountTypeGroup.EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 5000,
    numberRangeEnd: 5999,
    isBalanceSheet: false,
    description: 'Direct costs of products or services sold',
  },
  [AccountType.EXPENSES]: {
    type: AccountType.EXPENSES,
    group: AccountTypeGroup.EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 6000,
    numberRangeEnd: 6999,
    isBalanceSheet: false,
    description: 'Operating expenses',
  },
  [AccountType.OTHER_EXPENSE]: {
    type: AccountType.OTHER_EXPENSE,
    group: AccountTypeGroup.EXPENSES,
    normalBalance: NormalBalance.DEBIT,
    numberRangeStart: 7000,
    numberRangeEnd: 7999,
    isBalanceSheet: false,
    description: 'Non-operating expenses',
  },
};

// =============================================================================
// DETAIL TYPES (Sub-Types) mapped to Account Types
// =============================================================================

export const DETAIL_TYPES: Record<AccountType, string[]> = {
  // BANK
  [AccountType.BANK]: [
    'Cash on Hand',
    'Checking',
    'Money Market',
    'Savings',
    'Trust Accounts',
    'Rents Held in Trust',
  ],

  // ACCOUNTS RECEIVABLE
  [AccountType.ACCOUNTS_RECEIVABLE]: [
    'Accounts Receivable',
  ],

  // OTHER CURRENT ASSETS
  [AccountType.OTHER_CURRENT_ASSETS]: [
    'Allowance for Bad Debts',
    'Development Costs',
    'Employee Cash Advances',
    'Inventory',
    'Investment - Mortgage/Real Estate Loans',
    'Investment - Tax-Exempt Securities',
    'Investment - U.S. Government Obligations',
    'Investments - Other',
    'Loans to Officers',
    'Loans to Others',
    'Loans to Stockholders',
    'Other Current Assets',
    'Prepaid Expenses',
    'Retainage',
    'Undeposited Funds',
  ],

  // FIXED ASSETS
  [AccountType.FIXED_ASSETS]: [
    'Accumulated Depreciation',
    'Buildings',
    'Depletable Assets',
    'Furniture and Fixtures',
    'Intangible Assets',
    'Land',
    'Leasehold Improvements',
    'Machinery and Equipment',
    'Other Fixed Assets',
    'Vehicles',
  ],

  // OTHER ASSETS
  [AccountType.OTHER_ASSETS]: [
    'Accumulated Amortization of Other Assets',
    'Goodwill',
    'Lease Buyout',
    'Licenses',
    'Organizational Costs',
    'Other Long-term Assets',
    'Security Deposits',
  ],

  // ACCOUNTS PAYABLE
  [AccountType.ACCOUNTS_PAYABLE]: [
    'Accounts Payable',
  ],

  // CREDIT CARD
  [AccountType.CREDIT_CARD]: [
    'Credit Card',
  ],

  // OTHER CURRENT LIABILITIES
  [AccountType.OTHER_CURRENT_LIABILITIES]: [
    'Current Portion of Obligations under Finance Leases',
    'Current Tax Liability',
    'Dividends Payable',
    'Income Tax Payable',
    'Insurance Premium',
    'Line of Credit',
    'Loan Payable',
    'Other Current Liabilities',
    'Payroll Clearing',
    'Payroll Tax Payable',
    'Prepaid Revenue',
    'Sales Tax Payable',
    'Trust Accounts - Liabilities',
  ],

  // LONG TERM LIABILITIES
  [AccountType.LONG_TERM_LIABILITIES]: [
    'Notes Payable',
    'Other Long-term Liabilities',
    'Shareholder Notes Payable',
  ],

  // EQUITY
  [AccountType.EQUITY]: [
    'Accumulated Adjustment',
    'Common Stock',
    'Estimated Taxes',
    'Healthcare',
    'Opening Balance Equity',
    "Owner's Equity",
    'Paid-in Capital or Surplus',
    'Partner Contributions',
    'Partner Distributions',
    "Partner's Equity",
    'Personal Expense',
    'Personal Income',
    'Preferred Stock',
    'Retained Earnings',
    'Treasury Stock',
  ],

  // INCOME
  [AccountType.INCOME]: [
    'Discounts/Refunds Given',
    'Non-Profit Income',
    'Other Primary Income',
    'Sales of Product Income',
    'Service/Fee Income',
    'Unapplied Cash Payment Income',
  ],

  // OTHER INCOME
  [AccountType.OTHER_INCOME]: [
    'Dividend Income',
    'Interest Earned',
    'Other Investment Income',
    'Other Miscellaneous Income',
    'Tax-Exempt Interest',
    'Unrealized Loss on Securities',
  ],

  // COST OF GOODS SOLD
  [AccountType.COST_OF_GOODS_SOLD]: [
    'Cost of Labor - COGS',
    'Equipment Rental - COGS',
    'Freight and Delivery - COGS',
    'Other Costs of Services - COGS',
    'Supplies and Materials - COGS',
  ],

  // EXPENSES
  [AccountType.EXPENSES]: [
    'Advertising/Promotional',
    'Auto',
    'Bad Debts',
    'Bank Charges',
    'Charitable Contributions',
    'Commissions and Fees',
    'Cost of Labor',
    'Dues and Subscriptions',
    'Entertainment',
    'Entertainment Meals',
    'Equipment Rental',
    'Finance Costs',
    'Insurance',
    'Interest Paid',
    'Legal and Professional Fees',
    'Office/General Administrative',
    'Other Business Expenses',
    'Other Miscellaneous Service Cost',
    'Payroll Expenses',
    'Rent or Lease of Buildings',
    'Repair and Maintenance',
    'Shipping, Freight and Delivery',
    'Stationery and Printing',
    'Supplies',
    'Taxes Paid',
    'Travel',
    'Travel Meals',
    'Unapplied Cash Bill Payment Expense',
    'Utilities',
  ],

  // OTHER EXPENSE
  [AccountType.OTHER_EXPENSE]: [
    'Amortization',
    'Depreciation',
    'Exchange Gain or Loss',
    'Gas and Fuel',
    'Home Office',
    'Homeowner Rental Insurance',
    'Mortgage Interest',
    'Other Home Office Expenses',
    'Other Miscellaneous Expense',
    'Other Vehicle Expenses',
    'Parking and Tolls',
    'Penalties and Settlements',
    'Taxes - Other',
    'Vehicle',
    'Vehicle Insurance',
    'Vehicle Lease',
    'Vehicle Loan',
    'Vehicle Loan Interest',
    'Vehicle Registration',
    'Vehicle Repairs',
    'Wash and Road Services',
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all valid account types
 */
export function getAllAccountTypes(): AccountType[] {
  return Object.values(AccountType);
}

/**
 * Check if a detail type is valid for an account type
 */
export function isValidDetailType(accountType: AccountType, detailType: string): boolean {
  const validDetailTypes = DETAIL_TYPES[accountType];
  return validDetailTypes ? validDetailTypes.includes(detailType) : false;
}

/**
 * Get the normal balance for an account type
 */
export function getNormalBalance(accountType: AccountType): NormalBalance {
  return ACCOUNT_TYPE_INFO[accountType]?.normalBalance || NormalBalance.DEBIT;
}

/**
 * Get the group for an account type
 */
export function getAccountTypeGroup(accountType: AccountType): AccountTypeGroup {
  return ACCOUNT_TYPE_INFO[accountType]?.group || AccountTypeGroup.ASSETS;
}

/**
 * Get all account types in a group
 */
export function getAccountTypesByGroup(group: AccountTypeGroup): AccountType[] {
  return Object.values(ACCOUNT_TYPE_INFO)
    .filter((info) => info.group === group)
    .map((info) => info.type);
}