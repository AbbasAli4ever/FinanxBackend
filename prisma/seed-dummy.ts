import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// HELPERS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function d(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z');
}

function now(): Date {
  return new Date();
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('🌱 Starting dummy data seed...\n');

  // Idempotent check
  const existing = await prisma.user.findFirst({ where: { email: 'ceo@finanx.com' } });
  if (existing) {
    console.log('⚠️  Dummy data already seeded (ceo@finanx.com exists). Skipping.');
    return;
  }

  const passwordHash = await hashPassword('punjabi302');

  // ============================================================================
  // 1. COMPANY
  // ============================================================================
  console.log('🏢 Creating company...');

  const company = await prisma.company.create({
    data: {
      name: 'FinanX Technologies Pvt Ltd',
      legalName: 'FinanX Technologies Private Limited',
      email: 'info@finanxtech.com',
      phone: '+91-9876543210',
      website: 'https://finanxtech.com',
      industry: 'Information Technology',
      companyType: 'Private Limited',
      taxId: 'GSTIN27AABCF1234E1Z5',
      addressLine1: '42, Tech Park, Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      postalCode: '201301',
      country: 'IN',
      defaultCurrency: 'INR',
      timezone: 'Asia/Kolkata',
      dateFormat: 'DD/MM/YYYY',
      fiscalYearEnd: d('2026-03-31'),
    },
  });
  console.log(`   ✅ Company: ${company.name} (${company.id})`);

  // ============================================================================
  // 2. ROLES lookup
  // ============================================================================
  const adminRole = await prisma.role.findFirst({ where: { companyId: null, code: 'company_admin' } });
  const standardRole = await prisma.role.findFirst({ where: { companyId: null, code: 'standard' } });
  const limitedRole = await prisma.role.findFirst({ where: { companyId: null, code: 'limited' } });

  if (!adminRole || !standardRole || !limitedRole) {
    throw new Error('System roles not found. Run `npx prisma db seed` first.');
  }

  // ============================================================================
  // 3. USERS
  // ============================================================================
  console.log('👤 Creating users...');

  const ceo = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'ceo@finanx.com',
      passwordHash,
      firstName: 'Arjun',
      lastName: 'Singh',
      phone: '+91-9876543210',
      isPrimaryAdmin: true,
      roleId: adminRole.id,
      emailVerifiedAt: now(),
      lastLoginAt: now(),
    },
  });

  const cfo = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'cfo@finanx.com',
      passwordHash,
      firstName: 'Meera',
      lastName: 'Kapoor',
      phone: '+91-9876543211',
      isPrimaryAdmin: false,
      roleId: standardRole.id,
      emailVerifiedAt: now(),
    },
  });

  const accountant = await prisma.user.create({
    data: {
      companyId: company.id,
      email: 'accountant@finanx.com',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Patel',
      phone: '+91-9876543212',
      isPrimaryAdmin: false,
      roleId: limitedRole.id,
      emailVerifiedAt: now(),
    },
  });

  console.log(`   ✅ CEO: ${ceo.email}`);
  console.log(`   ✅ CFO: ${cfo.email}`);
  console.log(`   ✅ Accountant: ${accountant.email}`);

  // ============================================================================
  // 4. DEFAULT CHART OF ACCOUNTS (38 accounts)
  // ============================================================================
  console.log('📊 Seeding chart of accounts...');

  const defaultAccounts = [
    // ASSETS - Bank
    { accountNumber: '1000', name: 'Cash on Hand', accountType: 'Bank', detailType: 'Cash on Hand', normalBalance: 'DEBIT', description: 'Physical cash and petty cash' },
    { accountNumber: '1010', name: 'Business Checking', accountType: 'Bank', detailType: 'Checking', normalBalance: 'DEBIT', description: 'Primary business checking account' },
    { accountNumber: '1020', name: 'Business Savings', accountType: 'Bank', detailType: 'Savings', normalBalance: 'DEBIT', description: 'Business savings account' },
    // ASSETS - AR
    { accountNumber: '1100', name: 'Accounts Receivable', accountType: 'Accounts Receivable', detailType: 'Accounts Receivable', normalBalance: 'DEBIT', description: 'Money owed by customers' },
    // ASSETS - Other Current
    { accountNumber: '1200', name: 'Inventory Asset', accountType: 'Other Current Assets', detailType: 'Inventory', normalBalance: 'DEBIT', description: 'Value of products held for sale' },
    { accountNumber: '1300', name: 'Prepaid Expenses', accountType: 'Other Current Assets', detailType: 'Prepaid Expenses', normalBalance: 'DEBIT', description: 'Expenses paid in advance' },
    { accountNumber: '1400', name: 'Undeposited Funds', accountType: 'Other Current Assets', detailType: 'Undeposited Funds', normalBalance: 'DEBIT', description: 'Payments received but not yet deposited' },
    // ASSETS - Fixed
    { accountNumber: '1500', name: 'Furniture and Equipment', accountType: 'Fixed Assets', detailType: 'Furniture and Fixtures', normalBalance: 'DEBIT', description: 'Office furniture and equipment' },
    { accountNumber: '1510', name: 'Accumulated Depreciation', accountType: 'Fixed Assets', detailType: 'Accumulated Depreciation', normalBalance: 'CREDIT', description: 'Total depreciation on fixed assets' },
    // LIABILITIES - AP
    { accountNumber: '2000', name: 'Accounts Payable', accountType: 'Accounts Payable', detailType: 'Accounts Payable', normalBalance: 'CREDIT', description: 'Money owed to vendors and suppliers' },
    // LIABILITIES - Other Current
    { accountNumber: '2100', name: 'Sales Tax Payable', accountType: 'Other Current Liabilities', detailType: 'Sales Tax Payable', normalBalance: 'CREDIT', description: 'Sales tax collected and owed to government' },
    { accountNumber: '2200', name: 'Payroll Liabilities', accountType: 'Other Current Liabilities', detailType: 'Payroll Tax Payable', normalBalance: 'CREDIT', description: 'Payroll taxes and withholdings owed' },
    { accountNumber: '2300', name: 'Income Tax Payable', accountType: 'Other Current Liabilities', detailType: 'Income Tax Payable', normalBalance: 'CREDIT', description: 'Income taxes owed' },
    // EQUITY
    { accountNumber: '3000', name: 'Opening Balance Equity', accountType: 'Equity', detailType: 'Opening Balance Equity', normalBalance: 'CREDIT', description: 'Used to offset opening balance entries' },
    { accountNumber: '3100', name: "Owner's Equity", accountType: 'Equity', detailType: "Owner's Equity", normalBalance: 'CREDIT', description: "Owner's investment in the business" },
    { accountNumber: '3200', name: "Owner's Draw", accountType: 'Equity', detailType: 'Partner Distributions', normalBalance: 'DEBIT', description: "Owner's withdrawals from the business" },
    { accountNumber: '3300', name: 'Retained Earnings', accountType: 'Equity', detailType: 'Retained Earnings', normalBalance: 'CREDIT', description: 'Cumulative net income retained in the business' },
    // INCOME
    { accountNumber: '4000', name: 'Sales Income', accountType: 'Income', detailType: 'Sales of Product Income', normalBalance: 'CREDIT', description: 'Revenue from product sales' },
    { accountNumber: '4100', name: 'Service Income', accountType: 'Income', detailType: 'Service/Fee Income', normalBalance: 'CREDIT', description: 'Revenue from services rendered' },
    { accountNumber: '4200', name: 'Discounts Given', accountType: 'Income', detailType: 'Discounts/Refunds Given', normalBalance: 'DEBIT', description: 'Discounts and refunds given to customers' },
    // OTHER INCOME
    { accountNumber: '4500', name: 'Interest Income', accountType: 'Other Income', detailType: 'Interest Earned', normalBalance: 'CREDIT', description: 'Interest earned on bank accounts and investments' },
    { accountNumber: '4600', name: 'Other Income', accountType: 'Other Income', detailType: 'Other Miscellaneous Income', normalBalance: 'CREDIT', description: 'Miscellaneous non-operating income' },
    // COGS
    { accountNumber: '5000', name: 'Cost of Goods Sold', accountType: 'Cost of Goods Sold', detailType: 'Supplies and Materials - COGS', normalBalance: 'DEBIT', description: 'Direct cost of products sold' },
    { accountNumber: '5100', name: 'Cost of Labor', accountType: 'Cost of Goods Sold', detailType: 'Cost of Labor - COGS', normalBalance: 'DEBIT', description: 'Direct labor costs for products/services' },
    { accountNumber: '5200', name: 'Shipping and Delivery', accountType: 'Cost of Goods Sold', detailType: 'Freight and Delivery - COGS', normalBalance: 'DEBIT', description: 'Shipping costs for goods sold' },
    // EXPENSES
    { accountNumber: '6000', name: 'Advertising & Marketing', accountType: 'Expenses', detailType: 'Advertising/Promotional', normalBalance: 'DEBIT', description: 'Marketing and advertising expenses' },
    { accountNumber: '6010', name: 'Bank Charges & Fees', accountType: 'Expenses', detailType: 'Bank Charges', normalBalance: 'DEBIT', description: 'Bank service charges and fees' },
    { accountNumber: '6020', name: 'Insurance', accountType: 'Expenses', detailType: 'Insurance', normalBalance: 'DEBIT', description: 'Business insurance premiums' },
    { accountNumber: '6030', name: 'Office Supplies', accountType: 'Expenses', detailType: 'Supplies', normalBalance: 'DEBIT', description: 'Office supplies and consumables' },
    { accountNumber: '6040', name: 'Payroll Expenses', accountType: 'Expenses', detailType: 'Payroll Expenses', normalBalance: 'DEBIT', description: 'Salaries, wages, and payroll costs' },
    { accountNumber: '6050', name: 'Professional Fees', accountType: 'Expenses', detailType: 'Legal and Professional Fees', normalBalance: 'DEBIT', description: 'Legal, accounting, and consulting fees' },
    { accountNumber: '6060', name: 'Rent Expense', accountType: 'Expenses', detailType: 'Rent or Lease of Buildings', normalBalance: 'DEBIT', description: 'Office and building rent' },
    { accountNumber: '6070', name: 'Repairs & Maintenance', accountType: 'Expenses', detailType: 'Repair and Maintenance', normalBalance: 'DEBIT', description: 'Repairs and maintenance costs' },
    { accountNumber: '6080', name: 'Travel Expense', accountType: 'Expenses', detailType: 'Travel', normalBalance: 'DEBIT', description: 'Business travel expenses' },
    { accountNumber: '6090', name: 'Utilities', accountType: 'Expenses', detailType: 'Utilities', normalBalance: 'DEBIT', description: 'Electricity, water, internet, and phone' },
    { accountNumber: '6100', name: 'Meals & Entertainment', accountType: 'Expenses', detailType: 'Entertainment Meals', normalBalance: 'DEBIT', description: 'Business meals and entertainment' },
    { accountNumber: '6110', name: 'Dues & Subscriptions', accountType: 'Expenses', detailType: 'Dues and Subscriptions', normalBalance: 'DEBIT', description: 'Memberships and subscriptions' },
    { accountNumber: '6120', name: 'Auto Expense', accountType: 'Expenses', detailType: 'Auto', normalBalance: 'DEBIT', description: 'Vehicle expenses for business' },
    // OTHER EXPENSES
    { accountNumber: '7000', name: 'Depreciation Expense', accountType: 'Other Expense', detailType: 'Depreciation', normalBalance: 'DEBIT', description: 'Periodic depreciation of fixed assets' },
    { accountNumber: '7010', name: 'Penalties & Settlements', accountType: 'Other Expense', detailType: 'Penalties and Settlements', normalBalance: 'DEBIT', description: 'Fines, penalties, and legal settlements' },
  ];

  await prisma.account.createMany({
    data: defaultAccounts.map((acc, i) => ({
      companyId: company.id,
      ...acc,
      isSystemAccount: true,
      isSubAccount: false,
      depth: 0,
      fullPath: acc.name,
      displayOrder: i,
    })),
  });

  // Fetch all accounts for FK references
  const accounts = await prisma.account.findMany({ where: { companyId: company.id } });
  const acct = (name: string) => {
    const found = accounts.find(a => a.name === name);
    if (!found) throw new Error(`Account not found: ${name}`);
    return found;
  };

  console.log(`   ✅ ${accounts.length} accounts created`);

  // ============================================================================
  // 5. CUSTOMERS (5)
  // ============================================================================
  console.log('🧑‍💼 Creating customers...');

  const [cust1, cust2, cust3, cust4, cust5] = await Promise.all([
    prisma.customer.create({
      data: {
        companyId: company.id,
        displayName: 'Reliance Digital',
        companyName: 'Reliance Retail Ltd',
        customerType: 'Business',
        email: 'procurement@reliancedigital.com',
        phone: '+91-22-35553555',
        billingAddressLine1: 'Maker Chambers IV, Nariman Point',
        billingCity: 'Mumbai',
        billingState: 'Maharashtra',
        billingPostalCode: '400021',
        billingCountry: 'IN',
        paymentTerms: 'Net 30',
        taxNumber: 'GSTIN27AABCR1718E1ZP',
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        displayName: 'Tata Consultancy Services',
        companyName: 'TCS Ltd',
        customerType: 'Business',
        email: 'vendor.management@tcs.com',
        phone: '+91-22-67789999',
        billingAddressLine1: 'TCS House, Raveline Street',
        billingCity: 'Mumbai',
        billingState: 'Maharashtra',
        billingPostalCode: '400001',
        billingCountry: 'IN',
        paymentTerms: 'Net 45',
        taxNumber: 'GSTIN27AABCT4567E2ZQ',
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        displayName: 'Infosys Ltd',
        companyName: 'Infosys Limited',
        customerType: 'Business',
        email: 'procurement@infosys.com',
        phone: '+91-80-28520261',
        billingAddressLine1: '44 Electronics City, Hosur Road',
        billingCity: 'Bangalore',
        billingState: 'Karnataka',
        billingPostalCode: '560100',
        billingCountry: 'IN',
        paymentTerms: 'Net 30',
        taxNumber: 'GSTIN29AABCI3456E1ZR',
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        displayName: 'Rajesh Sharma',
        firstName: 'Rajesh',
        lastName: 'Sharma',
        customerType: 'Individual',
        email: 'rajesh.sharma@gmail.com',
        phone: '+91-9811234567',
        billingAddressLine1: '23-B, Green Park',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110016',
        billingCountry: 'IN',
        paymentTerms: 'Due on Receipt',
      },
    }),
    prisma.customer.create({
      data: {
        companyId: company.id,
        displayName: 'Priya Enterprises',
        companyName: 'Priya Enterprises Pvt Ltd',
        customerType: 'Business',
        email: 'accounts@priyaenterprises.in',
        phone: '+91-11-45671234',
        billingAddressLine1: '78, Connaught Place',
        billingCity: 'New Delhi',
        billingState: 'Delhi',
        billingPostalCode: '110001',
        billingCountry: 'IN',
        paymentTerms: 'Net 60',
        taxNumber: 'GSTIN07AABCP7890E1ZS',
      },
    }),
  ]);

  console.log(`   ✅ 5 customers created`);

  // ============================================================================
  // 6. VENDORS (5)
  // ============================================================================
  console.log('🏪 Creating vendors...');

  const [vend1, vend2, vend3, vend4, vend5] = await Promise.all([
    prisma.vendor.create({
      data: {
        companyId: company.id,
        displayName: 'AWS India',
        companyName: 'Amazon Web Services India Pvt Ltd',
        vendorType: 'Business',
        email: 'billing@aws.amazon.com',
        phone: '+91-80-46329000',
        addressLine1: 'World Trade Center, Brigade Gateway',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560055',
        country: 'IN',
        paymentTerms: 'Net 30',
      },
    }),
    prisma.vendor.create({
      data: {
        companyId: company.id,
        displayName: 'Dell Technologies',
        companyName: 'Dell International Services India Pvt Ltd',
        vendorType: 'Business',
        email: 'orders@dell.com',
        phone: '+91-80-25357000',
        addressLine1: 'Divyashree Greens, EPIP Zone',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560066',
        country: 'IN',
        paymentTerms: 'Net 45',
      },
    }),
    prisma.vendor.create({
      data: {
        companyId: company.id,
        displayName: 'WeWork India',
        companyName: 'WeWork India Management Pvt Ltd',
        vendorType: 'Business',
        email: 'billing@wework.co.in',
        phone: '+91-124-4561234',
        addressLine1: 'DLF Cyber City, Phase III',
        city: 'Gurugram',
        state: 'Haryana',
        postalCode: '122002',
        country: 'IN',
        paymentTerms: 'Net 30',
      },
    }),
    prisma.vendor.create({
      data: {
        companyId: company.id,
        displayName: 'Airtel Business',
        companyName: 'Bharti Airtel Ltd',
        vendorType: 'Business',
        email: 'business.billing@airtel.com',
        phone: '+91-11-42222222',
        addressLine1: 'Bharti Crescent, Nelson Mandela Road',
        city: 'New Delhi',
        state: 'Delhi',
        postalCode: '110070',
        country: 'IN',
        paymentTerms: 'Net 30',
      },
    }),
    prisma.vendor.create({
      data: {
        companyId: company.id,
        displayName: 'TechMart Supplies',
        companyName: 'TechMart Office Supplies Pvt Ltd',
        vendorType: 'Business',
        email: 'sales@techmart.in',
        phone: '+91-120-4567890',
        addressLine1: '15, Industrial Area, Sector 63',
        city: 'Noida',
        state: 'Uttar Pradesh',
        postalCode: '201301',
        country: 'IN',
        paymentTerms: 'Due on Receipt',
      },
    }),
  ]);

  console.log(`   ✅ 5 vendors created`);

  // ============================================================================
  // 7. CATEGORIES (4)
  // ============================================================================
  console.log('📂 Creating categories...');

  const [catSoftware, catHardware, catCloud, catOffice] = await Promise.all([
    prisma.category.create({ data: { companyId: company.id, name: 'Software Services', description: 'Custom software development and consulting' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Hardware', description: 'Computer hardware, laptops, servers' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Cloud Infrastructure', description: 'Cloud hosting, SaaS, and infrastructure services' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Office & Admin', description: 'Office supplies, rent, utilities, and administration' } }),
  ]);

  console.log(`   ✅ 4 categories created`);

  // ============================================================================
  // 8. PRODUCTS & SERVICES (8)
  // ============================================================================
  console.log('📦 Creating products & services...');

  const serviceIncomeAcct = acct('Service Income');
  const salesIncomeAcct = acct('Sales Income');
  const cogsAcct = acct('Cost of Goods Sold');

  const [prod1, prod2, prod3, prod4, prod5, prod6, prod7, prod8] = await Promise.all([
    prisma.product.create({
      data: {
        companyId: company.id, name: 'Web Development', type: 'SERVICE',
        categoryId: catSoftware.id, salesDescription: 'Full-stack web application development',
        salesPrice: new Prisma.Decimal(5000), incomeAccountId: serviceIncomeAcct.id, taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'Mobile App Development', type: 'SERVICE',
        categoryId: catSoftware.id, salesDescription: 'iOS and Android mobile app development',
        salesPrice: new Prisma.Decimal(8000), incomeAccountId: serviceIncomeAcct.id, taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'Cloud Consulting', type: 'SERVICE',
        categoryId: catCloud.id, salesDescription: 'AWS/Azure cloud architecture and migration consulting',
        salesPrice: new Prisma.Decimal(3000), incomeAccountId: serviceIncomeAcct.id, taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'UI/UX Design', type: 'SERVICE',
        categoryId: catSoftware.id, salesDescription: 'User interface and experience design services',
        salesPrice: new Prisma.Decimal(4000), incomeAccountId: serviceIncomeAcct.id, taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'Laptop - Dell XPS 15', type: 'NON_INVENTORY',
        sku: 'HW-DELL-XPS15', categoryId: catHardware.id,
        salesDescription: 'Dell XPS 15 laptop for client resale', purchaseDescription: 'Dell XPS 15 laptop procurement',
        salesPrice: new Prisma.Decimal(2500), purchaseCost: new Prisma.Decimal(1800),
        incomeAccountId: salesIncomeAcct.id, expenseAccountId: cogsAcct.id,
        preferredVendorId: vend2.id, taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'Server Rack Unit', type: 'NON_INVENTORY',
        sku: 'HW-SRV-RACK', categoryId: catHardware.id,
        salesDescription: '42U server rack unit', purchaseDescription: 'Server rack unit procurement',
        salesPrice: new Prisma.Decimal(5000), purchaseCost: new Prisma.Decimal(3500),
        incomeAccountId: salesIncomeAcct.id, expenseAccountId: cogsAcct.id,
        taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'Software License (Annual)', type: 'NON_INVENTORY',
        sku: 'SW-LIC-ANN', categoryId: catSoftware.id,
        salesDescription: 'Annual software license subscription', purchaseDescription: 'Software license bulk procurement',
        salesPrice: new Prisma.Decimal(1200), purchaseCost: new Prisma.Decimal(800),
        incomeAccountId: salesIncomeAcct.id, expenseAccountId: cogsAcct.id,
        taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
    prisma.product.create({
      data: {
        companyId: company.id, name: 'IT Support (Monthly)', type: 'SERVICE',
        categoryId: catCloud.id, salesDescription: 'Monthly IT infrastructure support and monitoring',
        salesPrice: new Prisma.Decimal(2000), incomeAccountId: serviceIncomeAcct.id, taxable: true, taxRate: new Prisma.Decimal(18),
      },
    }),
  ]);

  console.log(`   ✅ 8 products & services created`);

  // ============================================================================
  // 9. INVOICES (6) with Line Items + Payments
  // ============================================================================
  console.log('🧾 Creating invoices...');

  const bankAcct = acct('Business Checking');
  const arAcct = acct('Accounts Receivable');
  const apAcct = acct('Accounts Payable');
  let jeCounter = 0;

  // Helper: create a journal entry
  async function createJE(opts: {
    description: string;
    entryDate: Date;
    entryType?: string;
    status: string;
    sourceType?: string;
    sourceId?: string;
    lines: { accountId: string; debit: number; credit: number; description?: string }[];
  }) {
    jeCounter++;
    const entryNumber = `JE-${String(jeCounter).padStart(4, '0')}`;
    const je = await prisma.journalEntry.create({
      data: {
        companyId: company.id,
        entryNumber,
        entryDate: opts.entryDate,
        entryType: (opts.entryType || 'STANDARD') as any,
        status: opts.status as any,
        description: opts.description,
        totalDebit: new Prisma.Decimal(opts.lines.reduce((s, l) => s + l.debit, 0)),
        totalCredit: new Prisma.Decimal(opts.lines.reduce((s, l) => s + l.credit, 0)),
        createdById: ceo.id,
        postedAt: opts.status === 'POSTED' ? now() : null,
        postedById: opts.status === 'POSTED' ? ceo.id : null,
        sourceType: opts.sourceType || null,
        sourceId: opts.sourceId || null,
      },
    });

    await prisma.journalEntryLine.createMany({
      data: opts.lines.map((line, i) => ({
        journalEntryId: je.id,
        accountId: line.accountId,
        debit: new Prisma.Decimal(line.debit),
        credit: new Prisma.Decimal(line.credit),
        description: line.description || opts.description,
        sortOrder: i,
      })),
    });

    return je;
  }

  // Helper: update account balance
  async function updateBalance(accountId: string, amount: number) {
    const account = accounts.find(a => a.id === accountId)!;
    // DEBIT normalBalance: debit increases, credit decreases
    // For updateBalance, positive = increase in balance
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: { increment: amount } },
    });
  }

  // --- INV-0001: Reliance, PAID ($18,700) ---
  const inv1Total = 5000 * 2 * 1.18 + 4000 * 1 * 1.18; // 11800 + 4720 = 16520
  const inv1Subtotal = 5000 * 2 + 4000 * 1; // 14000
  const inv1Tax = inv1Subtotal * 0.18; // 2520
  const inv1 = await prisma.invoice.create({
    data: {
      companyId: company.id, customerId: cust1.id, invoiceNumber: 'INV-0001',
      invoiceDate: d('2026-01-15'), dueDate: d('2026-02-14'), paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(inv1Subtotal), taxAmount: new Prisma.Decimal(inv1Tax),
      totalAmount: new Prisma.Decimal(inv1Subtotal + inv1Tax),
      amountPaid: new Prisma.Decimal(inv1Subtotal + inv1Tax),
      amountDue: new Prisma.Decimal(0),
      depositAccountId: bankAcct.id,
      status: 'PAID', sentAt: d('2026-01-16'), paidAt: d('2026-02-10'),
      notes: 'Web development and UI/UX design for Reliance Digital e-commerce portal',
    },
  });
  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: inv1.id, productId: prod1.id, description: 'Web Development - E-commerce Portal', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(5000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(11800), sortOrder: 0 },
      { invoiceId: inv1.id, productId: prod4.id, description: 'UI/UX Design - Portal Redesign', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(4000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(4720), sortOrder: 1 },
    ],
  });
  await prisma.invoicePayment.create({
    data: { invoiceId: inv1.id, amount: new Prisma.Decimal(inv1Subtotal + inv1Tax), paymentDate: d('2026-02-10'), paymentMethod: 'BANK_TRANSFER', referenceNumber: 'NEFT-REL-001', depositAccountId: bankAcct.id },
  });
  // JE: Invoice sent (Debit AR, Credit Income)
  await createJE({
    description: 'INV-0001 - Reliance Digital invoice',
    entryDate: d('2026-01-16'), status: 'POSTED', sourceType: 'INVOICE', sourceId: inv1.id,
    lines: [
      { accountId: arAcct.id, debit: inv1Subtotal + inv1Tax, credit: 0, description: 'Accounts Receivable - Reliance Digital' },
      { accountId: serviceIncomeAcct.id, debit: 0, credit: inv1Subtotal, description: 'Service Income - Web Dev & UI/UX' },
      { accountId: acct('Sales Tax Payable').id, debit: 0, credit: inv1Tax, description: 'GST collected' },
    ],
  });
  // JE: Payment received (Debit Bank, Credit AR)
  await createJE({
    description: 'INV-0001 Payment received - Reliance Digital',
    entryDate: d('2026-02-10'), status: 'POSTED', sourceType: 'INVOICE_PAYMENT', sourceId: inv1.id,
    lines: [
      { accountId: bankAcct.id, debit: inv1Subtotal + inv1Tax, credit: 0 },
      { accountId: arAcct.id, debit: 0, credit: inv1Subtotal + inv1Tax },
    ],
  });

  // --- INV-0002: Tata, SENT ($29,680) ---
  const inv2Subtotal = 8000 * 2 + 3000 * 3; // 25000
  const inv2Tax = inv2Subtotal * 0.18; // 4500
  const inv2Total = inv2Subtotal + inv2Tax; // 29500
  const inv2 = await prisma.invoice.create({
    data: {
      companyId: company.id, customerId: cust2.id, invoiceNumber: 'INV-0002',
      invoiceDate: d('2026-02-01'), dueDate: d('2026-03-17'), paymentTerms: 'Net 45',
      subtotal: new Prisma.Decimal(inv2Subtotal), taxAmount: new Prisma.Decimal(inv2Tax),
      totalAmount: new Prisma.Decimal(inv2Total),
      amountPaid: new Prisma.Decimal(0), amountDue: new Prisma.Decimal(inv2Total),
      status: 'SENT', sentAt: d('2026-02-02'),
      notes: 'Mobile app development and cloud consulting for TCS internal tools',
    },
  });
  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: inv2.id, productId: prod2.id, description: 'Mobile App Development - Internal HR Tool', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(8000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(18880), sortOrder: 0 },
      { invoiceId: inv2.id, productId: prod3.id, description: 'Cloud Consulting - AWS Migration', quantity: new Prisma.Decimal(3), unitPrice: new Prisma.Decimal(3000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(10620), sortOrder: 1 },
    ],
  });
  await createJE({
    description: 'INV-0002 - TCS invoice',
    entryDate: d('2026-02-02'), status: 'POSTED', sourceType: 'INVOICE', sourceId: inv2.id,
    lines: [
      { accountId: arAcct.id, debit: inv2Total, credit: 0 },
      { accountId: serviceIncomeAcct.id, debit: 0, credit: inv2Subtotal },
      { accountId: acct('Sales Tax Payable').id, debit: 0, credit: inv2Tax },
    ],
  });

  // --- INV-0003: Infosys, PARTIALLY_PAID ($16,520) ---
  const inv3Subtotal = 5000 * 2 + 2000 * 2; // 14000
  const inv3Tax = inv3Subtotal * 0.18; // 2520
  const inv3Total = inv3Subtotal + inv3Tax; // 16520
  const inv3PartialPay = 8000;
  const inv3 = await prisma.invoice.create({
    data: {
      companyId: company.id, customerId: cust3.id, invoiceNumber: 'INV-0003',
      invoiceDate: d('2026-01-20'), dueDate: d('2026-02-19'), paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(inv3Subtotal), taxAmount: new Prisma.Decimal(inv3Tax),
      totalAmount: new Prisma.Decimal(inv3Total),
      amountPaid: new Prisma.Decimal(inv3PartialPay), amountDue: new Prisma.Decimal(inv3Total - inv3PartialPay),
      status: 'PARTIALLY_PAID', sentAt: d('2026-01-21'),
      notes: 'Web development and IT support for Infosys innovation lab',
    },
  });
  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: inv3.id, productId: prod1.id, description: 'Web Development - Innovation Lab Portal', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(5000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(11800), sortOrder: 0 },
      { invoiceId: inv3.id, productId: prod8.id, description: 'IT Support (Monthly) - 2 months', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(2000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(4720), sortOrder: 1 },
    ],
  });
  await prisma.invoicePayment.create({
    data: { invoiceId: inv3.id, amount: new Prisma.Decimal(inv3PartialPay), paymentDate: d('2026-02-05'), paymentMethod: 'BANK_TRANSFER', referenceNumber: 'NEFT-INF-001', depositAccountId: bankAcct.id },
  });
  await createJE({
    description: 'INV-0003 - Infosys invoice',
    entryDate: d('2026-01-21'), status: 'POSTED', sourceType: 'INVOICE', sourceId: inv3.id,
    lines: [
      { accountId: arAcct.id, debit: inv3Total, credit: 0 },
      { accountId: serviceIncomeAcct.id, debit: 0, credit: inv3Subtotal },
      { accountId: acct('Sales Tax Payable').id, debit: 0, credit: inv3Tax },
    ],
  });
  await createJE({
    description: 'INV-0003 Partial payment - Infosys',
    entryDate: d('2026-02-05'), status: 'POSTED', sourceType: 'INVOICE_PAYMENT', sourceId: inv3.id,
    lines: [
      { accountId: bankAcct.id, debit: inv3PartialPay, credit: 0 },
      { accountId: arAcct.id, debit: 0, credit: inv3PartialPay },
    ],
  });

  // --- INV-0004: Rajesh Sharma, DRAFT ($5,310) ---
  const inv4Subtotal = 3000 * 1.5; // 4500
  const inv4Tax = inv4Subtotal * 0.18; // 810
  const inv4 = await prisma.invoice.create({
    data: {
      companyId: company.id, customerId: cust4.id, invoiceNumber: 'INV-0004',
      invoiceDate: d('2026-02-20'), dueDate: d('2026-02-20'), paymentTerms: 'Due on Receipt',
      subtotal: new Prisma.Decimal(inv4Subtotal), taxAmount: new Prisma.Decimal(inv4Tax),
      totalAmount: new Prisma.Decimal(inv4Subtotal + inv4Tax),
      amountPaid: new Prisma.Decimal(0), amountDue: new Prisma.Decimal(inv4Subtotal + inv4Tax),
      status: 'DRAFT',
      notes: 'Cloud consulting for personal portfolio migration to AWS',
    },
  });
  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: inv4.id, productId: prod3.id, description: 'Cloud Consulting - Portfolio Migration', quantity: new Prisma.Decimal(1.5), unitPrice: new Prisma.Decimal(3000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(inv4Subtotal + inv4Tax), sortOrder: 0 },
    ],
  });

  // --- INV-0005: Priya Enterprises, SENT ($9,912) ---
  const inv5Subtotal = 1200 * 5 + 2000 * 1; // 8000
  const inv5Tax = inv5Subtotal * 0.18; // 1440
  const inv5Total = inv5Subtotal + inv5Tax; // 9440
  const inv5 = await prisma.invoice.create({
    data: {
      companyId: company.id, customerId: cust5.id, invoiceNumber: 'INV-0005',
      invoiceDate: d('2026-01-05'), dueDate: d('2026-03-06'), paymentTerms: 'Net 60',
      subtotal: new Prisma.Decimal(inv5Subtotal), taxAmount: new Prisma.Decimal(inv5Tax),
      totalAmount: new Prisma.Decimal(inv5Total),
      amountPaid: new Prisma.Decimal(0), amountDue: new Prisma.Decimal(inv5Total),
      status: 'SENT', sentAt: d('2026-01-06'),
      notes: 'Software licenses and IT support for Priya Enterprises',
    },
  });
  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: inv5.id, productId: prod7.id, description: 'Software License (Annual) x5', quantity: new Prisma.Decimal(5), unitPrice: new Prisma.Decimal(1200), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(7080), sortOrder: 0 },
      { invoiceId: inv5.id, productId: prod8.id, description: 'IT Support (Monthly) - 1 month', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(2000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(2360), sortOrder: 1 },
    ],
  });
  await createJE({
    description: 'INV-0005 - Priya Enterprises invoice',
    entryDate: d('2026-01-06'), status: 'POSTED', sourceType: 'INVOICE', sourceId: inv5.id,
    lines: [
      { accountId: arAcct.id, debit: inv5Total, credit: 0 },
      { accountId: salesIncomeAcct.id, debit: 0, credit: 6000 },
      { accountId: serviceIncomeAcct.id, debit: 0, credit: 2000 },
      { accountId: acct('Sales Tax Payable').id, debit: 0, credit: inv5Tax },
    ],
  });

  // --- INV-0006: Reliance, PAID ($18,880) ---
  const inv6Subtotal = 8000 * 2; // 16000
  const inv6Tax = inv6Subtotal * 0.18; // 2880
  const inv6Total = inv6Subtotal + inv6Tax; // 18880
  const inv6 = await prisma.invoice.create({
    data: {
      companyId: company.id, customerId: cust1.id, invoiceNumber: 'INV-0006',
      invoiceDate: d('2026-02-10'), dueDate: d('2026-03-12'), paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(inv6Subtotal), taxAmount: new Prisma.Decimal(inv6Tax),
      totalAmount: new Prisma.Decimal(inv6Total),
      amountPaid: new Prisma.Decimal(inv6Total), amountDue: new Prisma.Decimal(0),
      depositAccountId: bankAcct.id,
      status: 'PAID', sentAt: d('2026-02-11'), paidAt: d('2026-02-22'),
      notes: 'Mobile app development for Reliance Digital rewards program',
    },
  });
  await prisma.invoiceLineItem.createMany({
    data: [
      { invoiceId: inv6.id, productId: prod2.id, description: 'Mobile App Development - Rewards Program', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(8000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(18880), sortOrder: 0 },
    ],
  });
  await prisma.invoicePayment.create({
    data: { invoiceId: inv6.id, amount: new Prisma.Decimal(inv6Total), paymentDate: d('2026-02-22'), paymentMethod: 'BANK_TRANSFER', referenceNumber: 'NEFT-REL-002', depositAccountId: bankAcct.id },
  });
  await createJE({
    description: 'INV-0006 - Reliance Digital invoice',
    entryDate: d('2026-02-11'), status: 'POSTED', sourceType: 'INVOICE', sourceId: inv6.id,
    lines: [
      { accountId: arAcct.id, debit: inv6Total, credit: 0 },
      { accountId: serviceIncomeAcct.id, debit: 0, credit: inv6Subtotal },
      { accountId: acct('Sales Tax Payable').id, debit: 0, credit: inv6Tax },
    ],
  });
  await createJE({
    description: 'INV-0006 Payment received - Reliance Digital',
    entryDate: d('2026-02-22'), status: 'POSTED', sourceType: 'INVOICE_PAYMENT', sourceId: inv6.id,
    lines: [
      { accountId: bankAcct.id, debit: inv6Total, credit: 0 },
      { accountId: arAcct.id, debit: 0, credit: inv6Total },
    ],
  });

  console.log('   ✅ 6 invoices created (2 PAID, 1 PARTIALLY_PAID, 2 SENT, 1 DRAFT)');

  // ============================================================================
  // 10. BILLS (5) with Line Items + Payments
  // ============================================================================
  console.log('📋 Creating bills...');

  const rentExpAcct = acct('Rent Expense');
  const utilExpAcct = acct('Utilities');
  const officeExpAcct = acct('Office Supplies');
  const duesExpAcct = acct('Dues & Subscriptions');

  // --- BILL-0001: AWS, PAID ($5,310) ---
  const bill1Subtotal = 3500 + 1000; // 4500
  const bill1Tax = bill1Subtotal * 0.18; // 810
  const bill1Total = bill1Subtotal + bill1Tax; // 5310
  const bill1 = await prisma.bill.create({
    data: {
      companyId: company.id, vendorId: vend1.id, billNumber: 'BILL-0001',
      vendorInvoiceNumber: 'AWS-2026-JAN-001',
      billDate: d('2026-01-31'), dueDate: d('2026-03-02'), paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(bill1Subtotal), taxAmount: new Prisma.Decimal(bill1Tax),
      totalAmount: new Prisma.Decimal(bill1Total),
      amountPaid: new Prisma.Decimal(bill1Total), amountDue: new Prisma.Decimal(0),
      paymentAccountId: bankAcct.id,
      status: 'PAID', receivedAt: d('2026-02-01'), paidAt: d('2026-02-25'),
      notes: 'AWS hosting charges for January 2026',
    },
  });
  await prisma.billLineItem.createMany({
    data: [
      { billId: bill1.id, description: 'AWS EC2 & RDS Hosting - January', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(3500), expenseAccountId: duesExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(4130), sortOrder: 0 },
      { billId: bill1.id, description: 'AWS CloudWatch & Support Plan', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(1000), expenseAccountId: duesExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(1180), sortOrder: 1 },
    ],
  });
  await prisma.billPayment.create({
    data: { billId: bill1.id, amount: new Prisma.Decimal(bill1Total), paymentDate: d('2026-02-25'), paymentMethod: 'BANK_TRANSFER', referenceNumber: 'NEFT-AWS-001', paymentAccountId: bankAcct.id },
  });
  await createJE({
    description: 'BILL-0001 - AWS India bill received',
    entryDate: d('2026-02-01'), status: 'POSTED', sourceType: 'BILL', sourceId: bill1.id,
    lines: [
      { accountId: duesExpAcct.id, debit: bill1Subtotal, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: bill1Tax, credit: 0, description: 'GST input credit' },
      { accountId: apAcct.id, debit: 0, credit: bill1Total },
    ],
  });
  await createJE({
    description: 'BILL-0001 Payment - AWS India',
    entryDate: d('2026-02-25'), status: 'POSTED', sourceType: 'BILL_PAYMENT', sourceId: bill1.id,
    lines: [
      { accountId: apAcct.id, debit: bill1Total, credit: 0 },
      { accountId: bankAcct.id, debit: 0, credit: bill1Total },
    ],
  });

  // --- BILL-0002: Dell, RECEIVED ($9,558) ---
  const bill2Subtotal = 1800 * 4 + 500; // 7700
  const bill2Tax = bill2Subtotal * 0.18; // 1386
  const bill2Total = bill2Subtotal + bill2Tax; // 9086
  const bill2 = await prisma.bill.create({
    data: {
      companyId: company.id, vendorId: vend2.id, billNumber: 'BILL-0002',
      vendorInvoiceNumber: 'DELL-SO-2026-0045',
      billDate: d('2026-02-05'), dueDate: d('2026-03-22'), paymentTerms: 'Net 45',
      subtotal: new Prisma.Decimal(bill2Subtotal), taxAmount: new Prisma.Decimal(bill2Tax),
      totalAmount: new Prisma.Decimal(bill2Total),
      amountPaid: new Prisma.Decimal(0), amountDue: new Prisma.Decimal(bill2Total),
      status: 'RECEIVED', receivedAt: d('2026-02-06'),
      notes: '4x Dell XPS 15 laptops for developer team + extended warranty',
    },
  });
  await prisma.billLineItem.createMany({
    data: [
      { billId: bill2.id, productId: prod5.id, description: 'Dell XPS 15 Laptop x4', quantity: new Prisma.Decimal(4), unitPrice: new Prisma.Decimal(1800), expenseAccountId: cogsAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(8496), sortOrder: 0 },
      { billId: bill2.id, description: 'Extended Warranty (3yr) x4', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(500), expenseAccountId: cogsAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(590), sortOrder: 1 },
    ],
  });
  await createJE({
    description: 'BILL-0002 - Dell Technologies bill received',
    entryDate: d('2026-02-06'), status: 'POSTED', sourceType: 'BILL', sourceId: bill2.id,
    lines: [
      { accountId: cogsAcct.id, debit: bill2Subtotal, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: bill2Tax, credit: 0 },
      { accountId: apAcct.id, debit: 0, credit: bill2Total },
    ],
  });

  // --- BILL-0003: WeWork, PAID ($3,540) ---
  const bill3Subtotal = 3000; // rent
  const bill3Tax = bill3Subtotal * 0.18; // 540
  const bill3Total = bill3Subtotal + bill3Tax; // 3540
  const bill3 = await prisma.bill.create({
    data: {
      companyId: company.id, vendorId: vend3.id, billNumber: 'BILL-0003',
      vendorInvoiceNumber: 'WW-NOI-2026-FEB',
      billDate: d('2026-02-01'), dueDate: d('2026-03-03'), paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(bill3Subtotal), taxAmount: new Prisma.Decimal(bill3Tax),
      totalAmount: new Prisma.Decimal(bill3Total),
      amountPaid: new Prisma.Decimal(bill3Total), amountDue: new Prisma.Decimal(0),
      paymentAccountId: bankAcct.id,
      status: 'PAID', receivedAt: d('2026-02-01'), paidAt: d('2026-02-15'),
      notes: 'WeWork coworking space rent - February 2026',
    },
  });
  await prisma.billLineItem.createMany({
    data: [
      { billId: bill3.id, description: 'WeWork Hot Desk - 10 seats, February', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(3000), expenseAccountId: rentExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(bill3Total), sortOrder: 0 },
    ],
  });
  await prisma.billPayment.create({
    data: { billId: bill3.id, amount: new Prisma.Decimal(bill3Total), paymentDate: d('2026-02-15'), paymentMethod: 'BANK_TRANSFER', referenceNumber: 'NEFT-WW-FEB', paymentAccountId: bankAcct.id },
  });
  await createJE({
    description: 'BILL-0003 - WeWork rent',
    entryDate: d('2026-02-01'), status: 'POSTED', sourceType: 'BILL', sourceId: bill3.id,
    lines: [
      { accountId: rentExpAcct.id, debit: bill3Subtotal, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: bill3Tax, credit: 0 },
      { accountId: apAcct.id, debit: 0, credit: bill3Total },
    ],
  });
  await createJE({
    description: 'BILL-0003 Payment - WeWork',
    entryDate: d('2026-02-15'), status: 'POSTED', sourceType: 'BILL_PAYMENT', sourceId: bill3.id,
    lines: [
      { accountId: apAcct.id, debit: bill3Total, credit: 0 },
      { accountId: bankAcct.id, debit: 0, credit: bill3Total },
    ],
  });

  // --- BILL-0004: Airtel, RECEIVED ($1,180) ---
  const bill4Subtotal = 800 + 200; // 1000
  const bill4Tax = bill4Subtotal * 0.18; // 180
  const bill4Total = bill4Subtotal + bill4Tax; // 1180
  const bill4 = await prisma.bill.create({
    data: {
      companyId: company.id, vendorId: vend4.id, billNumber: 'BILL-0004',
      vendorInvoiceNumber: 'AIRTEL-BIZ-FEB26',
      billDate: d('2026-02-10'), dueDate: d('2026-03-12'), paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(bill4Subtotal), taxAmount: new Prisma.Decimal(bill4Tax),
      totalAmount: new Prisma.Decimal(bill4Total),
      amountPaid: new Prisma.Decimal(0), amountDue: new Prisma.Decimal(bill4Total),
      status: 'RECEIVED', receivedAt: d('2026-02-11'),
      notes: 'Airtel leased line internet and phone service - February',
    },
  });
  await prisma.billLineItem.createMany({
    data: [
      { billId: bill4.id, description: 'Airtel Leased Line - 100 Mbps', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(800), expenseAccountId: utilExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(944), sortOrder: 0 },
      { billId: bill4.id, description: 'Airtel Business Phone - 5 lines', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(200), expenseAccountId: utilExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(236), sortOrder: 1 },
    ],
  });
  await createJE({
    description: 'BILL-0004 - Airtel Business bill',
    entryDate: d('2026-02-11'), status: 'POSTED', sourceType: 'BILL', sourceId: bill4.id,
    lines: [
      { accountId: utilExpAcct.id, debit: bill4Subtotal, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: bill4Tax, credit: 0 },
      { accountId: apAcct.id, debit: 0, credit: bill4Total },
    ],
  });

  // --- BILL-0005: TechMart, DRAFT ($2,360) ---
  const bill5Subtotal = 1500 + 500; // 2000
  const bill5Tax = bill5Subtotal * 0.18; // 360
  const bill5Total = bill5Subtotal + bill5Tax;
  const bill5 = await prisma.bill.create({
    data: {
      companyId: company.id, vendorId: vend5.id, billNumber: 'BILL-0005',
      billDate: d('2026-02-18'), dueDate: d('2026-02-18'), paymentTerms: 'Due on Receipt',
      subtotal: new Prisma.Decimal(bill5Subtotal), taxAmount: new Prisma.Decimal(bill5Tax),
      totalAmount: new Prisma.Decimal(bill5Total),
      amountPaid: new Prisma.Decimal(0), amountDue: new Prisma.Decimal(bill5Total),
      status: 'DRAFT',
      notes: 'Office supplies and equipment from TechMart',
    },
  });
  await prisma.billLineItem.createMany({
    data: [
      { billId: bill5.id, description: 'Office Furniture - Standing Desks x3', quantity: new Prisma.Decimal(3), unitPrice: new Prisma.Decimal(500), expenseAccountId: officeExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(1770), sortOrder: 0 },
      { billId: bill5.id, description: 'Office Supplies Bundle', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(500), expenseAccountId: officeExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(590), sortOrder: 1 },
    ],
  });

  console.log('   ✅ 5 bills created (2 PAID, 2 RECEIVED, 1 DRAFT)');

  // ============================================================================
  // 11. EXPENSES (5)
  // ============================================================================
  console.log('💸 Creating expenses...');

  const travelExpAcct = acct('Travel Expense');
  const mealsExpAcct = acct('Meals & Entertainment');
  const adExpAcct = acct('Advertising & Marketing');

  // EXP-0001: Travel, PAID
  const exp1 = await prisma.expense.create({
    data: {
      companyId: company.id, expenseNumber: 'EXP-0001', expenseDate: d('2026-02-05'),
      expenseAccountId: travelExpAcct.id, createdById: cfo.id,
      vendorId: null, categoryId: null,
      paymentAccountId: bankAcct.id, paymentMethod: 'CREDIT_CARD',
      description: 'Client visit to Reliance Digital Mumbai office',
      amount: new Prisma.Decimal(1500), taxPercent: new Prisma.Decimal(0), taxAmount: new Prisma.Decimal(0), totalAmount: new Prisma.Decimal(1500),
      status: 'PAID', submittedAt: d('2026-02-06'), approvedAt: d('2026-02-06'), approvedById: ceo.id, paidAt: d('2026-02-06'),
      notes: 'Flight Delhi-Mumbai return + hotel 1 night',
    },
  });
  await createJE({
    description: 'EXP-0001 - Travel expense paid',
    entryDate: d('2026-02-06'), status: 'POSTED', sourceType: 'EXPENSE', sourceId: exp1.id,
    lines: [
      { accountId: travelExpAcct.id, debit: 1500, credit: 0 },
      { accountId: bankAcct.id, debit: 0, credit: 1500 },
    ],
  });

  // EXP-0002: Meals, APPROVED
  const exp2 = await prisma.expense.create({
    data: {
      companyId: company.id, expenseNumber: 'EXP-0002', expenseDate: d('2026-02-12'),
      expenseAccountId: mealsExpAcct.id, createdById: accountant.id,
      description: 'Team lunch - sprint completion celebration',
      amount: new Prisma.Decimal(350), taxPercent: new Prisma.Decimal(5), taxAmount: new Prisma.Decimal(17.5), totalAmount: new Prisma.Decimal(367.5),
      status: 'APPROVED', submittedAt: d('2026-02-12'), approvedAt: d('2026-02-13'), approvedById: cfo.id,
      notes: '7 team members, Haldirams Noida',
    },
  });

  // EXP-0003: Office Supplies, PAID
  const exp3 = await prisma.expense.create({
    data: {
      companyId: company.id, expenseNumber: 'EXP-0003', expenseDate: d('2026-02-08'),
      expenseAccountId: officeExpAcct.id, createdById: accountant.id,
      vendorId: vend5.id,
      paymentAccountId: bankAcct.id, paymentMethod: 'BANK_TRANSFER',
      description: 'Printer paper, toner cartridges, and stationery',
      amount: new Prisma.Decimal(800), taxPercent: new Prisma.Decimal(18), taxAmount: new Prisma.Decimal(144), totalAmount: new Prisma.Decimal(944),
      status: 'PAID', submittedAt: d('2026-02-08'), approvedAt: d('2026-02-08'), approvedById: cfo.id, paidAt: d('2026-02-09'),
      referenceNumber: 'TM-PO-0023',
    },
  });
  await createJE({
    description: 'EXP-0003 - Office supplies paid',
    entryDate: d('2026-02-09'), status: 'POSTED', sourceType: 'EXPENSE', sourceId: exp3.id,
    lines: [
      { accountId: officeExpAcct.id, debit: 800, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: 144, credit: 0 },
      { accountId: bankAcct.id, debit: 0, credit: 944 },
    ],
  });

  // EXP-0004: Software Subscriptions, PAID
  const exp4 = await prisma.expense.create({
    data: {
      companyId: company.id, expenseNumber: 'EXP-0004', expenseDate: d('2026-02-01'),
      expenseAccountId: duesExpAcct.id, createdById: ceo.id,
      paymentAccountId: bankAcct.id, paymentMethod: 'CREDIT_CARD',
      description: 'GitHub Team + Figma Pro + Slack Business - Monthly',
      amount: new Prisma.Decimal(500), taxPercent: new Prisma.Decimal(18), taxAmount: new Prisma.Decimal(90), totalAmount: new Prisma.Decimal(590),
      status: 'PAID', submittedAt: d('2026-02-01'), approvedAt: d('2026-02-01'), approvedById: ceo.id, paidAt: d('2026-02-01'),
      isRecurring: true, recurringFrequency: 'MONTHLY', nextRecurringDate: d('2026-03-01'),
      notes: 'Monthly SaaS subscriptions for dev team',
    },
  });
  await createJE({
    description: 'EXP-0004 - Software subscriptions paid',
    entryDate: d('2026-02-01'), status: 'POSTED', sourceType: 'EXPENSE', sourceId: exp4.id,
    lines: [
      { accountId: duesExpAcct.id, debit: 500, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: 90, credit: 0 },
      { accountId: bankAcct.id, debit: 0, credit: 590 },
    ],
  });

  // EXP-0005: Marketing, DRAFT
  const exp5 = await prisma.expense.create({
    data: {
      companyId: company.id, expenseNumber: 'EXP-0005', expenseDate: d('2026-02-20'),
      expenseAccountId: adExpAcct.id, createdById: cfo.id,
      description: 'Google Ads campaign - Q1 lead generation',
      amount: new Prisma.Decimal(2000), taxPercent: new Prisma.Decimal(18), taxAmount: new Prisma.Decimal(360), totalAmount: new Prisma.Decimal(2360),
      status: 'DRAFT',
      notes: 'Pending approval for Google Ads budget increase',
    },
  });

  console.log('   ✅ 5 expenses created (3 PAID, 1 APPROVED, 1 DRAFT)');

  // ============================================================================
  // 12. MANUAL JOURNAL ENTRIES (3)
  // ============================================================================
  console.log('📖 Creating manual journal entries...');

  // JE: Owner investment $50,000
  await createJE({
    description: "Owner's capital investment in FinanX Technologies",
    entryDate: d('2026-01-01'), status: 'POSTED',
    lines: [
      { accountId: bankAcct.id, debit: 50000, credit: 0, description: 'Capital deposit to Business Checking' },
      { accountId: acct("Owner's Equity").id, debit: 0, credit: 50000, description: "Owner's equity investment" },
    ],
  });

  // JE: Depreciation $2,000
  await createJE({
    description: 'Monthly depreciation - furniture and equipment',
    entryDate: d('2026-01-31'), entryType: 'ADJUSTING', status: 'POSTED',
    lines: [
      { accountId: acct('Depreciation Expense').id, debit: 2000, credit: 0 },
      { accountId: acct('Accumulated Depreciation').id, debit: 0, credit: 2000 },
    ],
  });

  // JE: Prepaid insurance (DRAFT) $1,200
  await createJE({
    description: 'Prepaid business insurance allocation - February',
    entryDate: d('2026-02-28'), status: 'DRAFT',
    lines: [
      { accountId: acct('Insurance').id, debit: 1200, credit: 0 },
      { accountId: acct('Prepaid Expenses').id, debit: 0, credit: 1200 },
    ],
  });

  console.log(`   ✅ ${jeCounter} journal entries created (including auto-JEs from invoices/bills/expenses)`);

  // ============================================================================
  // 13. CREDIT NOTES (3)
  // ============================================================================
  console.log('📝 Creating credit notes...');

  // CN-0001: Reliance, APPLIED ($2,360) - applied to INV-0001
  const cn1Subtotal = 2000;
  const cn1Tax = cn1Subtotal * 0.18; // 360
  const cn1Total = cn1Subtotal + cn1Tax; // 2360
  const cn1 = await prisma.creditNote.create({
    data: {
      companyId: company.id, customerId: cust1.id, invoiceId: inv1.id,
      creditNoteNumber: 'CN-0001', creditNoteDate: d('2026-02-12'),
      subtotal: new Prisma.Decimal(cn1Subtotal), taxAmount: new Prisma.Decimal(cn1Tax),
      totalAmount: new Prisma.Decimal(cn1Total),
      amountApplied: new Prisma.Decimal(cn1Total), amountRefunded: new Prisma.Decimal(0), remainingCredit: new Prisma.Decimal(0),
      refundAccountId: bankAcct.id,
      status: 'APPLIED', openedAt: d('2026-02-12'),
      reason: 'Partial refund for scope reduction on e-commerce portal',
      notes: 'Customer requested removal of payment gateway integration module',
    },
  });
  await prisma.creditNoteLineItem.createMany({
    data: [
      { creditNoteId: cn1.id, productId: prod1.id, accountId: serviceIncomeAcct.id, description: 'Web Development - Scope Reduction Credit', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(2000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(cn1Total), sortOrder: 0 },
    ],
  });
  await prisma.creditNoteApplication.create({
    data: { creditNoteId: cn1.id, invoiceId: inv1.id, amount: new Prisma.Decimal(cn1Total), appliedAt: d('2026-02-13') },
  });
  // JE for CN open (Debit Service Income, Credit AR)
  await createJE({
    description: 'CN-0001 - Credit note issued to Reliance Digital',
    entryDate: d('2026-02-12'), status: 'POSTED', sourceType: 'CREDIT_NOTE', sourceId: cn1.id,
    lines: [
      { accountId: serviceIncomeAcct.id, debit: cn1Subtotal, credit: 0, description: 'Reverse service income - scope reduction' },
      { accountId: acct('Sales Tax Payable').id, debit: cn1Tax, credit: 0, description: 'Reverse GST' },
      { accountId: arAcct.id, debit: 0, credit: cn1Total, description: 'Reduce AR - Reliance Digital' },
    ],
  });

  // CN-0002: Infosys, OPEN ($1,180) - available credit
  const cn2Subtotal = 1000;
  const cn2Tax = cn2Subtotal * 0.18; // 180
  const cn2Total = cn2Subtotal + cn2Tax; // 1180
  const cn2 = await prisma.creditNote.create({
    data: {
      companyId: company.id, customerId: cust3.id, invoiceId: inv3.id,
      creditNoteNumber: 'CN-0002', creditNoteDate: d('2026-02-15'),
      subtotal: new Prisma.Decimal(cn2Subtotal), taxAmount: new Prisma.Decimal(cn2Tax),
      totalAmount: new Prisma.Decimal(cn2Total),
      amountApplied: new Prisma.Decimal(0), amountRefunded: new Prisma.Decimal(0), remainingCredit: new Prisma.Decimal(cn2Total),
      status: 'OPEN', openedAt: d('2026-02-15'),
      reason: 'Service quality adjustment for delayed IT support delivery',
      notes: 'IT support was delivered 2 weeks late in January',
    },
  });
  await prisma.creditNoteLineItem.createMany({
    data: [
      { creditNoteId: cn2.id, productId: prod8.id, accountId: serviceIncomeAcct.id, description: 'IT Support - Late Delivery Penalty Credit', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(1000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(cn2Total), sortOrder: 0 },
    ],
  });
  await createJE({
    description: 'CN-0002 - Credit note issued to Infosys',
    entryDate: d('2026-02-15'), status: 'POSTED', sourceType: 'CREDIT_NOTE', sourceId: cn2.id,
    lines: [
      { accountId: serviceIncomeAcct.id, debit: cn2Subtotal, credit: 0 },
      { accountId: acct('Sales Tax Payable').id, debit: cn2Tax, credit: 0 },
      { accountId: arAcct.id, debit: 0, credit: cn2Total },
    ],
  });

  // CN-0003: Tata, DRAFT ($590)
  const cn3Subtotal = 500;
  const cn3Tax = cn3Subtotal * 0.18; // 90
  const cn3Total = cn3Subtotal + cn3Tax;
  const cn3 = await prisma.creditNote.create({
    data: {
      companyId: company.id, customerId: cust2.id,
      creditNoteNumber: 'CN-0003', creditNoteDate: d('2026-02-22'),
      subtotal: new Prisma.Decimal(cn3Subtotal), taxAmount: new Prisma.Decimal(cn3Tax),
      totalAmount: new Prisma.Decimal(cn3Total),
      amountApplied: new Prisma.Decimal(0), amountRefunded: new Prisma.Decimal(0), remainingCredit: new Prisma.Decimal(cn3Total),
      status: 'DRAFT',
      reason: 'Goodwill discount for TCS long-term partnership',
    },
  });
  await prisma.creditNoteLineItem.createMany({
    data: [
      { creditNoteId: cn3.id, accountId: serviceIncomeAcct.id, description: 'Partnership Goodwill Discount', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(500), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(cn3Total), sortOrder: 0 },
    ],
  });

  console.log('   ✅ 3 credit notes created (1 APPLIED, 1 OPEN, 1 DRAFT)');

  // ============================================================================
  // 14. DEBIT NOTES (2)
  // ============================================================================
  console.log('📝 Creating debit notes...');

  // DN-0001: Dell, OPEN ($2,124) - defective laptop
  const dn1Subtotal = 1800;
  const dn1Tax = dn1Subtotal * 0.18; // 324
  const dn1Total = dn1Subtotal + dn1Tax; // 2124
  const dn1 = await prisma.debitNote.create({
    data: {
      companyId: company.id, vendorId: vend2.id, billId: bill2.id,
      debitNoteNumber: 'DN-0001', debitNoteDate: d('2026-02-18'),
      subtotal: new Prisma.Decimal(dn1Subtotal), taxAmount: new Prisma.Decimal(dn1Tax),
      totalAmount: new Prisma.Decimal(dn1Total),
      amountApplied: new Prisma.Decimal(0), amountRefunded: new Prisma.Decimal(0), remainingCredit: new Prisma.Decimal(dn1Total),
      refundAccountId: bankAcct.id,
      status: 'OPEN', openedAt: d('2026-02-18'),
      reason: 'Defective Dell XPS 15 - screen flickering issue',
      notes: '1 out of 4 laptops received had a hardware defect. Returning for replacement/refund.',
    },
  });
  await prisma.debitNoteLineItem.createMany({
    data: [
      { debitNoteId: dn1.id, productId: prod5.id, expenseAccountId: cogsAcct.id, description: 'Dell XPS 15 - Defective Unit Return', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(1800), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(dn1Total), sortOrder: 0 },
    ],
  });
  await createJE({
    description: 'DN-0001 - Debit note issued to Dell Technologies',
    entryDate: d('2026-02-18'), status: 'POSTED', sourceType: 'DEBIT_NOTE', sourceId: dn1.id,
    lines: [
      { accountId: apAcct.id, debit: dn1Total, credit: 0, description: 'Reduce AP - Dell defective laptop' },
      { accountId: cogsAcct.id, debit: 0, credit: dn1Subtotal, description: 'Reverse COGS - defective unit' },
      { accountId: acct('Sales Tax Payable').id, debit: 0, credit: dn1Tax, description: 'Reverse GST input' },
    ],
  });

  // DN-0002: TechMart, DRAFT ($472)
  const dn2Subtotal = 400;
  const dn2Tax = dn2Subtotal * 0.18; // 72
  const dn2Total = dn2Subtotal + dn2Tax;
  const dn2 = await prisma.debitNote.create({
    data: {
      companyId: company.id, vendorId: vend5.id,
      debitNoteNumber: 'DN-0002', debitNoteDate: d('2026-02-22'),
      subtotal: new Prisma.Decimal(dn2Subtotal), taxAmount: new Prisma.Decimal(dn2Tax),
      totalAmount: new Prisma.Decimal(dn2Total),
      amountApplied: new Prisma.Decimal(0), amountRefunded: new Prisma.Decimal(0), remainingCredit: new Prisma.Decimal(dn2Total),
      status: 'DRAFT',
      reason: 'Wrong office supplies delivered',
      notes: 'Received wrong toner cartridges - need correct model',
    },
  });
  await prisma.debitNoteLineItem.createMany({
    data: [
      { debitNoteId: dn2.id, expenseAccountId: officeExpAcct.id, description: 'Toner Cartridges - Wrong Model Return', quantity: new Prisma.Decimal(4), unitPrice: new Prisma.Decimal(100), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(dn2Total), sortOrder: 0 },
    ],
  });

  console.log('   ✅ 2 debit notes created (1 OPEN, 1 DRAFT)');

  // ============================================================================
  // 15. ESTIMATES & QUOTES (5)
  // ============================================================================
  console.log('📋 Creating estimates...');

  // EST-0001: Tata Consultancy — SENT (proposal for a cloud migration project)
  const est1Sub = 8000 + 3000; // Web Dev + Cloud Consulting
  const est1Tax = est1Sub * 0.18;
  const est1Total = est1Sub + est1Tax;
  const est1 = await prisma.estimate.create({
    data: {
      companyId: company.id,
      customerId: cust2.id,
      estimateNumber: 'EST-0001',
      status: 'SENT',
      estimateDate: d('2026-02-10'),
      expirationDate: d('2026-03-12'),
      paymentTerms: 'NET_45',
      subtotal: new Prisma.Decimal(est1Sub),
      taxAmount: new Prisma.Decimal(est1Tax),
      totalAmount: new Prisma.Decimal(est1Total),
      depositAccountId: bankAcct.id,
      notes: 'Cloud migration and web modernization proposal for TCS',
      termsAndConditions: 'Valid for 30 days from date of issue. 50% advance required.',
      customerMessage: 'Thank you for considering FinanX Technologies for your digital transformation needs.',
      sentAt: new Date('2026-02-10T10:30:00Z'),
    },
  });
  await prisma.estimateLineItem.createMany({
    data: [
      { estimateId: est1.id, productId: prod1.id, description: 'Web Application Modernization', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(5000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(5000 * 1.18), sortOrder: 0 },
      { estimateId: est1.id, productId: prod3.id, description: 'Cloud Architecture & Migration Consulting', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(3000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(3000 * 1.18), sortOrder: 1 },
    ],
  });

  // EST-0002: Reliance Digital — ACCEPTED (UI/UX redesign)
  const est2Sub = 4000 + 2000 * 3; // UI/UX + 3 months IT support
  const est2Disc = est2Sub * 0.10; // 10% discount
  const est2AfterDisc = est2Sub - est2Disc;
  const est2Tax = est2AfterDisc * 0.18;
  const est2Total = est2AfterDisc + est2Tax;
  const est2 = await prisma.estimate.create({
    data: {
      companyId: company.id,
      customerId: cust1.id,
      estimateNumber: 'EST-0002',
      status: 'ACCEPTED',
      estimateDate: d('2026-02-05'),
      expirationDate: d('2026-03-07'),
      paymentTerms: 'NET_30',
      discountType: 'PERCENTAGE',
      discountValue: new Prisma.Decimal(10),
      subtotal: new Prisma.Decimal(est2Sub),
      discountAmount: new Prisma.Decimal(est2Disc),
      taxAmount: new Prisma.Decimal(est2Tax),
      totalAmount: new Prisma.Decimal(est2Total),
      depositAccountId: bankAcct.id,
      notes: 'UI/UX redesign and ongoing IT support for Reliance Digital portal',
      termsAndConditions: 'Valid for 30 days. 10% loyalty discount applied.',
      customerMessage: 'We appreciate your continued partnership with FinanX Technologies.',
      sentAt: new Date('2026-02-05T09:00:00Z'),
      viewedAt: new Date('2026-02-06T14:30:00Z'),
      acceptedAt: new Date('2026-02-08T11:00:00Z'),
    },
  });
  await prisma.estimateLineItem.createMany({
    data: [
      { estimateId: est2.id, productId: prod4.id, description: 'Portal UI/UX Redesign', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(4000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(4000 * 0.9 * 1.18), sortOrder: 0 },
      { estimateId: est2.id, productId: prod8.id, description: 'Monthly IT Support (3 months)', quantity: new Prisma.Decimal(3), unitPrice: new Prisma.Decimal(2000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(6000 * 0.9 * 1.18), sortOrder: 1 },
    ],
  });

  // EST-0003: Infosys — DRAFT (mobile app proposal)
  const est3Sub = 8000;
  const est3Tax = est3Sub * 0.18;
  const est3Total = est3Sub + est3Tax;
  const est3 = await prisma.estimate.create({
    data: {
      companyId: company.id,
      customerId: cust3.id,
      estimateNumber: 'EST-0003',
      status: 'DRAFT',
      estimateDate: d('2026-02-20'),
      paymentTerms: 'NET_30',
      subtotal: new Prisma.Decimal(est3Sub),
      taxAmount: new Prisma.Decimal(est3Tax),
      totalAmount: new Prisma.Decimal(est3Total),
      notes: 'Mobile app development proposal - pending internal review',
    },
  });
  await prisma.estimateLineItem.createMany({
    data: [
      { estimateId: est3.id, productId: prod2.id, description: 'iOS & Android Mobile App Development', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(8000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(8000 * 1.18), sortOrder: 0 },
    ],
  });

  // EST-0004: Rajesh Sharma — EXPIRED (personal website)
  const est4Sub = 5000 + 4000;
  const est4Tax = est4Sub * 0.18;
  const est4Total = est4Sub + est4Tax;
  const est4 = await prisma.estimate.create({
    data: {
      companyId: company.id,
      customerId: cust4.id,
      estimateNumber: 'EST-0004',
      status: 'EXPIRED',
      estimateDate: d('2026-01-10'),
      expirationDate: d('2026-02-09'),
      paymentTerms: 'DUE_ON_RECEIPT',
      subtotal: new Prisma.Decimal(est4Sub),
      taxAmount: new Prisma.Decimal(est4Tax),
      totalAmount: new Prisma.Decimal(est4Total),
      notes: 'Personal website and design services - expired without response',
      termsAndConditions: 'Valid for 30 days from date of issue.',
      customerMessage: 'We would love to bring your vision to life.',
      sentAt: new Date('2026-01-10T12:00:00Z'),
      expiredAt: new Date('2026-02-09T00:00:00Z'),
    },
  });
  await prisma.estimateLineItem.createMany({
    data: [
      { estimateId: est4.id, productId: prod1.id, description: 'Personal Website Development', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(5000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(5000 * 1.18), sortOrder: 0 },
      { estimateId: est4.id, productId: prod4.id, description: 'Custom UI/UX Design', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(4000), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(4000 * 1.18), sortOrder: 1 },
    ],
  });

  // EST-0005: Priya Enterprises — CONVERTED (hardware + software bundle, linked to inv5)
  const est5Sub = 2500 * 2 + 1200 * 5; // 2 laptops + 5 licenses
  const est5Disc = 500; // flat discount
  const est5AfterDisc = est5Sub - est5Disc;
  const est5Tax = est5AfterDisc * 0.18;
  const est5Total = est5AfterDisc + est5Tax;
  const est5 = await prisma.estimate.create({
    data: {
      companyId: company.id,
      customerId: cust5.id,
      estimateNumber: 'EST-0005',
      status: 'CONVERTED',
      estimateDate: d('2026-01-20'),
      expirationDate: d('2026-02-19'),
      paymentTerms: 'NET_60',
      discountType: 'FIXED',
      discountValue: new Prisma.Decimal(500),
      subtotal: new Prisma.Decimal(est5Sub),
      discountAmount: new Prisma.Decimal(est5Disc),
      taxAmount: new Prisma.Decimal(est5Tax),
      totalAmount: new Prisma.Decimal(est5Total),
      depositAccountId: bankAcct.id,
      notes: 'Hardware and software bundle for new office setup - converted to invoice',
      termsAndConditions: 'Valid for 30 days. Delivery within 2 weeks of acceptance.',
      customerMessage: 'Excited to support your new office with our IT solutions.',
      sentAt: new Date('2026-01-20T09:00:00Z'),
      viewedAt: new Date('2026-01-21T16:00:00Z'),
      acceptedAt: new Date('2026-01-25T10:00:00Z'),
      convertedAt: new Date('2026-01-26T11:00:00Z'),
    },
  });
  await prisma.estimateLineItem.createMany({
    data: [
      { estimateId: est5.id, productId: prod5.id, description: 'Dell XPS 15 Laptop', quantity: new Prisma.Decimal(2), unitPrice: new Prisma.Decimal(2500), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(5000 * 1.18), sortOrder: 0 },
      { estimateId: est5.id, productId: prod7.id, description: 'Annual Software License', quantity: new Prisma.Decimal(5), unitPrice: new Prisma.Decimal(1200), taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(6000 * 1.18), sortOrder: 1 },
    ],
  });

  console.log('   ✅ 5 estimates created (1 DRAFT, 1 SENT, 1 ACCEPTED, 1 EXPIRED, 1 CONVERTED)');

  // ============================================================================
  // 16. PURCHASE ORDERS (5)
  // ============================================================================
  console.log('📦 Creating purchase orders...');

  // PO-0001: Dell Technologies — CLOSED (4 laptops + warranty, linked to bill2)
  const po1Sub = 1800 * 4 + 500;
  const po1Tax = po1Sub * 0.18;
  const po1Total = po1Sub + po1Tax;
  const po1 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id, vendorId: vend2.id, poNumber: 'PO-0001',
      referenceNumber: 'REQ-2026-001', status: 'CLOSED',
      poDate: d('2026-01-20'), expectedDeliveryDate: d('2026-02-05'),
      paymentTerms: 'Net 45',
      subtotal: new Prisma.Decimal(po1Sub), taxAmount: new Prisma.Decimal(po1Tax),
      totalAmount: new Prisma.Decimal(po1Total),
      shippingAddressLine1: '42, Tech Park, Sector 62',
      shippingCity: 'Noida', shippingState: 'Uttar Pradesh',
      shippingPostalCode: '201301', shippingCountry: 'IN',
      notes: 'Urgent: Developer laptops needed for new hires',
      vendorMessage: 'Please deliver to reception desk, Tech Park building.',
      sentAt: new Date('2026-01-20T10:00:00Z'),
      receivedAt: new Date('2026-02-04T14:00:00Z'),
      closedAt: new Date('2026-02-05T09:00:00Z'),
      convertedBillId: bill2.id,
    },
  });
  await prisma.purchaseOrderLineItem.createMany({
    data: [
      { purchaseOrderId: po1.id, productId: prod5.id, description: 'Dell XPS 15 Laptop', quantity: new Prisma.Decimal(4), unitPrice: new Prisma.Decimal(1800), expenseAccountId: cogsAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(1800 * 4 * 1.18), quantityReceived: new Prisma.Decimal(4), sortOrder: 0 },
      { purchaseOrderId: po1.id, description: 'Extended Warranty (3yr) x4', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(500), expenseAccountId: cogsAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(500 * 1.18), quantityReceived: new Prisma.Decimal(1), sortOrder: 1 },
    ],
  });

  // PO-0002: AWS India — SENT (cloud services, awaiting delivery)
  const po2Sub = 4000 + 1500;
  const po2Tax = po2Sub * 0.18;
  const po2Total = po2Sub + po2Tax;
  const po2 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id, vendorId: vend1.id, poNumber: 'PO-0002',
      status: 'SENT',
      poDate: d('2026-02-15'), expectedDeliveryDate: d('2026-03-15'),
      paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(po2Sub), taxAmount: new Prisma.Decimal(po2Tax),
      totalAmount: new Prisma.Decimal(po2Total),
      notes: 'AWS cloud services for March 2026',
      sentAt: new Date('2026-02-15T11:00:00Z'),
    },
  });
  await prisma.purchaseOrderLineItem.createMany({
    data: [
      { purchaseOrderId: po2.id, description: 'AWS EC2 & RDS Hosting - March', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(4000), expenseAccountId: duesExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(4000 * 1.18), quantityReceived: new Prisma.Decimal(0), sortOrder: 0 },
      { purchaseOrderId: po2.id, description: 'AWS CloudWatch & Support Plan - March', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(1500), expenseAccountId: duesExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(1500 * 1.18), quantityReceived: new Prisma.Decimal(0), sortOrder: 1 },
    ],
  });

  // PO-0003: TechMart — PARTIAL (received 2 of 3 standing desks)
  const po3Sub = 500 * 3 + 800;
  const po3Tax = po3Sub * 0.18;
  const po3Total = po3Sub + po3Tax;
  const po3 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id, vendorId: vend5.id, poNumber: 'PO-0003',
      status: 'PARTIAL',
      poDate: d('2026-02-10'), expectedDeliveryDate: d('2026-02-25'),
      paymentTerms: 'Due on Receipt',
      subtotal: new Prisma.Decimal(po3Sub), taxAmount: new Prisma.Decimal(po3Tax),
      totalAmount: new Prisma.Decimal(po3Total),
      shippingAddressLine1: '42, Tech Park, Sector 62',
      shippingCity: 'Noida', shippingState: 'Uttar Pradesh',
      shippingPostalCode: '201301', shippingCountry: 'IN',
      notes: 'Office furniture and ergonomic equipment order',
      sentAt: new Date('2026-02-10T09:00:00Z'),
    },
  });
  await prisma.purchaseOrderLineItem.createMany({
    data: [
      { purchaseOrderId: po3.id, description: 'Ergonomic Standing Desk', quantity: new Prisma.Decimal(3), unitPrice: new Prisma.Decimal(500), expenseAccountId: officeExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(1500 * 1.18), quantityReceived: new Prisma.Decimal(2), sortOrder: 0 },
      { purchaseOrderId: po3.id, description: 'Herman Miller Office Chair', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(800), expenseAccountId: officeExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(800 * 1.18), quantityReceived: new Prisma.Decimal(0), sortOrder: 1 },
    ],
  });

  // PO-0004: Airtel — RECEIVED (all services delivered, ready to convert)
  const po4Sub = 900 + 300;
  const po4Tax = po4Sub * 0.18;
  const po4Total = po4Sub + po4Tax;
  const po4 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id, vendorId: vend4.id, poNumber: 'PO-0004',
      status: 'RECEIVED',
      poDate: d('2026-02-01'), expectedDeliveryDate: d('2026-02-28'),
      paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(po4Sub), taxAmount: new Prisma.Decimal(po4Tax),
      totalAmount: new Prisma.Decimal(po4Total),
      notes: 'Airtel business internet upgrade for March',
      sentAt: new Date('2026-02-01T10:00:00Z'),
      receivedAt: new Date('2026-02-20T16:00:00Z'),
    },
  });
  await prisma.purchaseOrderLineItem.createMany({
    data: [
      { purchaseOrderId: po4.id, description: 'Airtel Leased Line Upgrade - 200 Mbps', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(900), expenseAccountId: utilExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(900 * 1.18), quantityReceived: new Prisma.Decimal(1), sortOrder: 0 },
      { purchaseOrderId: po4.id, description: 'Airtel Business Phone - 8 lines', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(300), expenseAccountId: utilExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(300 * 1.18), quantityReceived: new Prisma.Decimal(1), sortOrder: 1 },
    ],
  });

  // PO-0005: WeWork — DRAFT (next month rent, pending approval)
  const po5Sub = 3200;
  const po5Tax = po5Sub * 0.18;
  const po5Total = po5Sub + po5Tax;
  const po5 = await prisma.purchaseOrder.create({
    data: {
      companyId: company.id, vendorId: vend3.id, poNumber: 'PO-0005',
      status: 'DRAFT',
      poDate: d('2026-02-25'), expectedDeliveryDate: d('2026-03-01'),
      paymentTerms: 'Net 30',
      subtotal: new Prisma.Decimal(po5Sub), taxAmount: new Prisma.Decimal(po5Tax),
      totalAmount: new Prisma.Decimal(po5Total),
      notes: 'March 2026 coworking space reservation - draft pending approval',
    },
  });
  await prisma.purchaseOrderLineItem.createMany({
    data: [
      { purchaseOrderId: po5.id, description: 'WeWork Hot Desk - 10 seats, March 2026', quantity: new Prisma.Decimal(1), unitPrice: new Prisma.Decimal(3200), expenseAccountId: rentExpAcct.id, taxPercent: new Prisma.Decimal(18), amount: new Prisma.Decimal(3200 * 1.18), quantityReceived: new Prisma.Decimal(0), sortOrder: 0 },
    ],
  });

  console.log('   ✅ 5 purchase orders created (1 DRAFT, 1 SENT, 1 PARTIAL, 1 RECEIVED, 1 CLOSED)');

  // ============================================================================
  // 17. UPDATE ACCOUNT BALANCES
  // ============================================================================
  console.log('💰 Updating account balances...');

  // Aggregate all POSTED journal entry lines to compute balances
  const postedJEs = await prisma.journalEntry.findMany({
    where: { companyId: company.id, status: 'POSTED' },
    include: { lines: true },
  });

  const balanceMap: Record<string, number> = {};
  for (const je of postedJEs) {
    for (const line of je.lines) {
      const acctId = line.accountId;
      if (!balanceMap[acctId]) balanceMap[acctId] = 0;
      const account = accounts.find(a => a.id === acctId)!;
      if (account.normalBalance === 'DEBIT') {
        balanceMap[acctId] += Number(line.debit) - Number(line.credit);
      } else {
        balanceMap[acctId] += Number(line.credit) - Number(line.debit);
      }
    }
  }

  for (const [accountId, balance] of Object.entries(balanceMap)) {
    await prisma.account.update({
      where: { id: accountId },
      data: { currentBalance: new Prisma.Decimal(balance) },
    });
  }

  // Update customer balances (AR)
  const customerBalances = [
    { id: cust1.id, balance: -(inv1Subtotal + inv1Tax) + (inv1Subtotal + inv1Tax) + inv6Total - inv6Total - cn1Total }, // paid both, credit note applied
    { id: cust2.id, balance: inv2Total }, // SENT, unpaid
    { id: cust3.id, balance: inv3Total - inv3PartialPay - cn2Total }, // partial pay + open CN
    { id: cust4.id, balance: 0 }, // DRAFT, no AR
    { id: cust5.id, balance: inv5Total }, // SENT, unpaid
  ];
  for (const cb of customerBalances) {
    await prisma.customer.update({
      where: { id: cb.id },
      data: { currentBalance: new Prisma.Decimal(cb.balance) },
    });
  }

  // Update vendor balances (AP)
  const vendorBalances = [
    { id: vend1.id, balance: 0 }, // PAID
    { id: vend2.id, balance: bill2Total - dn1Total }, // RECEIVED minus OPEN DN
    { id: vend3.id, balance: 0 }, // PAID
    { id: vend4.id, balance: bill4Total }, // RECEIVED, unpaid
    { id: vend5.id, balance: 0 }, // DRAFT bill
  ];
  for (const vb of vendorBalances) {
    await prisma.vendor.update({
      where: { id: vb.id },
      data: { currentBalance: new Prisma.Decimal(vb.balance) },
    });
  }

  console.log(`   ✅ ${Object.keys(balanceMap).length} account balances updated`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 DUMMY DATA SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`   Company:        ${company.name}`);
  console.log(`   Users:          3 (CEO, CFO, Accountant)`);
  console.log(`   Accounts:       ${accounts.length}`);
  console.log(`   Customers:      5`);
  console.log(`   Vendors:        5`);
  console.log(`   Categories:     4`);
  console.log(`   Products:       8`);
  console.log(`   Invoices:       6 (2 PAID, 1 PARTIAL, 2 SENT, 1 DRAFT)`);
  console.log(`   Bills:          5 (2 PAID, 2 RECEIVED, 1 DRAFT)`);
  console.log(`   Expenses:       5 (3 PAID, 1 APPROVED, 1 DRAFT)`);
  console.log(`   Journal Entries: ${jeCounter} (auto + manual)`);
  console.log(`   Credit Notes:   3 (1 APPLIED, 1 OPEN, 1 DRAFT)`);
  console.log(`   Debit Notes:    2 (1 OPEN, 1 DRAFT)`);
  console.log(`   Estimates:      5 (1 DRAFT, 1 SENT, 1 ACCEPTED, 1 EXPIRED, 1 CONVERTED)`);
  console.log(`   Purchase Orders: 5 (1 DRAFT, 1 SENT, 1 PARTIAL, 1 RECEIVED, 1 CLOSED)`);
  console.log('='.repeat(60));
  console.log(`\n🔐 Login: ceo@finanx.com / punjabi302`);
  console.log(`   Also:  cfo@finanx.com / punjabi302`);
  console.log(`   Also:  accountant@finanx.com / punjabi302`);
  console.log('\n✅ Dummy data seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during dummy data seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
