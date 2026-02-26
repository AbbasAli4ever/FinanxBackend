import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // ============================================================================
  // ROLES - QuickBooks Style
  // ============================================================================
  console.log('📋 Seeding roles...');

  const roles = [
    {
      code: 'company_admin',
      name: 'Company Administrator',
      description:
        'Full access except billing. Can manage users and company settings.',
      isSystemRole: true,
      requiredPlan: null,
      displayOrder: 1,
    },
    {
      code: 'standard',
      name: 'Standard User',
      description:
        'Can create and edit most transactions, reconcile accounts, run reports.',
      isSystemRole: true,
      requiredPlan: null,
      displayOrder: 2,
    },
    {
      code: 'limited',
      name: 'Limited User',
      description:
        'Restricted access to specific areas (invoices, expenses only).',
      isSystemRole: true,
      requiredPlan: null,
      displayOrder: 3,
    },
    {
      code: 'reports_only',
      name: 'Reports Only',
      description: 'Can only view reports and lists. Cannot create or edit.',
      isSystemRole: true,
      requiredPlan: null,
      displayOrder: 4,
    },
    {
      code: 'time_tracking_only',
      name: 'Time Tracking Only',
      description: 'Can only enter time. No access to financial data.',
      isSystemRole: true,
      requiredPlan: 'standard',
      displayOrder: 5,
    },
  ];

  for (const role of roles) {
    // Check if role exists
    const existing = await prisma.role.findFirst({
      where: {
        companyId: null,
        code: role.code,
      }
    });

    if (existing) {
      // Update existing system role
      await prisma.role.update({
        where: { id: existing.id },
        data: role,
      });
    } else {
      // Create new system role
      await prisma.role.create({
        data: {
          ...role,
          companyId: null, // System roles belong to no company (global)
        },
      });
    }
  }

  console.log(`✅ Created ${roles.length} roles`);

  // ============================================================================
  // PERMISSIONS - Granular Access Control
  // ============================================================================
  console.log('🔐 Seeding permissions...');

  const permissions = [
    // SALES & CUSTOMERS
    {
      code: 'customer:view',
      name: 'View Customers',
      description: 'View customer list and details',
      category: 'sales',
      requiredFeature: 'customers',
      displayOrder: 10,
    },
    {
      code: 'customer:create',
      name: 'Create Customers',
      description: 'Create new customers',
      category: 'sales',
      requiredFeature: 'customers',
      displayOrder: 11,
    },
    {
      code: 'customer:edit',
      name: 'Edit Customers',
      description: 'Edit customer information',
      category: 'sales',
      requiredFeature: 'customers',
      displayOrder: 12,
    },
    {
      code: 'customer:delete',
      name: 'Delete Customers',
      description: 'Delete customers',
      category: 'sales',
      requiredFeature: 'customers',
      displayOrder: 13,
    },

    // INVOICES
    {
      code: 'invoice:view',
      name: 'View Invoices',
      description: 'View invoice list and details',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 20,
    },
    {
      code: 'invoice:create',
      name: 'Create Invoices',
      description: 'Create new invoices',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 21,
    },
    {
      code: 'invoice:edit',
      name: 'Edit Invoices',
      description: 'Edit draft invoices',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 22,
    },
    {
      code: 'invoice:delete',
      name: 'Delete Invoices',
      description: 'Delete draft invoices',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 23,
    },
    {
      code: 'invoice:send',
      name: 'Send Invoices',
      description: 'Email invoices to customers',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 24,
    },
    {
      code: 'invoice:void',
      name: 'Void Invoices',
      description: 'Void posted invoices',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 25,
    },

    // CREDIT NOTES (Day 15)
    {
      code: 'credit-note:view',
      name: 'View Credit Notes',
      description: 'View credit note list and details',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 26,
    },
    {
      code: 'credit-note:create',
      name: 'Create Credit Notes',
      description: 'Create new credit notes for customers',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 27,
    },
    {
      code: 'credit-note:edit',
      name: 'Edit Credit Notes',
      description: 'Edit credit notes and apply/refund them',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 28,
    },
    {
      code: 'credit-note:delete',
      name: 'Delete Credit Notes',
      description: 'Delete or void credit notes',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 29,
    },

    // ESTIMATES (Day 16)
    {
      code: 'estimate:view',
      name: 'View Estimates',
      description: 'View estimate/quote list and details',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 14,
    },
    {
      code: 'estimate:create',
      name: 'Create Estimates',
      description: 'Create new estimates and quotes',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 15,
    },
    {
      code: 'estimate:edit',
      name: 'Edit Estimates',
      description: 'Edit draft estimates',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 16,
    },
    {
      code: 'estimate:delete',
      name: 'Delete Estimates',
      description: 'Delete draft estimates',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 17,
    },
    {
      code: 'estimate:send',
      name: 'Send Estimates',
      description: 'Send estimates to customers',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 18,
    },
    {
      code: 'estimate:convert',
      name: 'Convert Estimates',
      description: 'Convert accepted estimates to invoices',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 19,
    },
    {
      code: 'estimate:void',
      name: 'Void Estimates',
      description: 'Void sent or accepted estimates',
      category: 'sales',
      requiredFeature: 'invoicing',
      displayOrder: 19,
    },

    // PURCHASE ORDERS (Day 17)
    {
      code: 'purchase-order:view',
      name: 'View Purchase Orders',
      description: 'View purchase order list and details',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 60,
    },
    {
      code: 'purchase-order:create',
      name: 'Create Purchase Orders',
      description: 'Create new purchase orders',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 61,
    },
    {
      code: 'purchase-order:edit',
      name: 'Edit Purchase Orders',
      description: 'Edit draft purchase orders',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 62,
    },
    {
      code: 'purchase-order:delete',
      name: 'Delete Purchase Orders',
      description: 'Delete draft purchase orders',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 63,
    },
    {
      code: 'purchase-order:send',
      name: 'Send Purchase Orders',
      description: 'Send purchase orders to vendors',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 64,
    },
    {
      code: 'purchase-order:receive',
      name: 'Receive Purchase Orders',
      description: 'Record receipt of purchased items',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 65,
    },
    {
      code: 'purchase-order:convert',
      name: 'Convert Purchase Orders',
      description: 'Convert received purchase orders to bills',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 66,
    },
    {
      code: 'purchase-order:void',
      name: 'Void Purchase Orders',
      description: 'Void sent or partially received purchase orders',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 67,
    },

    // VENDORS
    {
      code: 'vendor:view',
      name: 'View Vendors',
      description: 'View vendor list and details',
      category: 'expenses',
      requiredFeature: 'vendors',
      displayOrder: 30,
    },
    {
      code: 'vendor:create',
      name: 'Create Vendors',
      description: 'Create new vendors',
      category: 'expenses',
      requiredFeature: 'vendors',
      displayOrder: 31,
    },
    {
      code: 'vendor:edit',
      name: 'Edit Vendors',
      description: 'Edit vendor information',
      category: 'expenses',
      requiredFeature: 'vendors',
      displayOrder: 32,
    },
    {
      code: 'vendor:delete',
      name: 'Delete Vendors',
      description: 'Delete vendors',
      category: 'expenses',
      requiredFeature: 'vendors',
      displayOrder: 33,
    },

    // EXPENSES
    {
      code: 'expense:view',
      name: 'View Expenses',
      description: 'View expense list and details',
      category: 'expenses',
      requiredFeature: 'expenses',
      displayOrder: 40,
    },
    {
      code: 'expense:create',
      name: 'Create Expenses',
      description: 'Create new expenses',
      category: 'expenses',
      requiredFeature: 'expenses',
      displayOrder: 41,
    },
    {
      code: 'expense:edit',
      name: 'Edit Expenses',
      description: 'Edit expenses',
      category: 'expenses',
      requiredFeature: 'expenses',
      displayOrder: 42,
    },
    {
      code: 'expense:delete',
      name: 'Delete Expenses',
      description: 'Delete expenses',
      category: 'expenses',
      requiredFeature: 'expenses',
      displayOrder: 43,
    },
    {
      code: 'expense:approve',
      name: 'Approve Expenses',
      description: 'Approve or reject submitted expenses',
      category: 'expenses',
      requiredFeature: 'expenses',
      displayOrder: 44,
    },
    {
      code: 'expense:void',
      name: 'Void Expenses',
      description: 'Void approved or paid expenses',
      category: 'expenses',
      requiredFeature: 'expenses',
      displayOrder: 45,
    },

    // BILLS
    {
      code: 'bill:view',
      name: 'View Bills',
      description: 'View bills list and details',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 50,
    },
    {
      code: 'bill:create',
      name: 'Create Bills',
      description: 'Create new bills',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 51,
    },
    {
      code: 'bill:edit',
      name: 'Edit Bills',
      description: 'Edit bills',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 52,
    },
    {
      code: 'bill:pay',
      name: 'Pay Bills',
      description: 'Record bill payments',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 53,
    },
    {
      code: 'bill:delete',
      name: 'Delete Bills',
      description: 'Delete draft bills',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 54,
    },
    {
      code: 'bill:void',
      name: 'Void Bills',
      description: 'Void received bills',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 55,
    },

    // DEBIT NOTES (Day 15)
    {
      code: 'debit-note:view',
      name: 'View Debit Notes',
      description: 'View debit note list and details',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 56,
    },
    {
      code: 'debit-note:create',
      name: 'Create Debit Notes',
      description: 'Create new debit notes for vendors',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 57,
    },
    {
      code: 'debit-note:edit',
      name: 'Edit Debit Notes',
      description: 'Edit debit notes and apply/refund them',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 58,
    },
    {
      code: 'debit-note:delete',
      name: 'Delete Debit Notes',
      description: 'Delete or void debit notes',
      category: 'expenses',
      requiredFeature: 'bills',
      displayOrder: 59,
    },

    // CHART OF ACCOUNTS
    {
      code: 'account:view',
      name: 'View Accounts',
      description: 'View chart of accounts and account details',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 55,
    },
    {
      code: 'account:create',
      name: 'Create Accounts',
      description: 'Create new accounts in chart of accounts',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 56,
    },
    {
      code: 'account:update',
      name: 'Edit Accounts',
      description: 'Edit account details',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 57,
    },
    {
      code: 'account:delete',
      name: 'Delete Accounts',
      description: 'Delete accounts from chart of accounts',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 58,
    },

    // JOURNAL ENTRIES
    {
      code: 'journal:view',
      name: 'View Journal Entries',
      description: 'View journal entries list and details',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 65,
    },
    {
      code: 'journal:create',
      name: 'Create Journal Entries',
      description: 'Create new journal entries',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 66,
    },
    {
      code: 'journal:edit',
      name: 'Edit Journal Entries',
      description: 'Edit draft journal entries',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 67,
    },
    {
      code: 'journal:post',
      name: 'Post Journal Entries',
      description: 'Post and void journal entries (updates account balances)',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 68,
    },
    {
      code: 'journal:delete',
      name: 'Delete Journal Entries',
      description: 'Delete draft journal entries',
      category: 'accounting',
      requiredFeature: null,
      displayOrder: 69,
    },

    // BANKING
    {
      code: 'bank_account:view',
      name: 'View Bank Accounts',
      description: 'View bank account list and balances',
      category: 'banking',
      requiredFeature: null,
      displayOrder: 60,
    },
    {
      code: 'bank_account:reconcile',
      name: 'Reconcile Bank Accounts',
      description: 'Perform bank reconciliation',
      category: 'banking',
      requiredFeature: 'bank_reconciliation',
      displayOrder: 61,
    },
    {
      code: 'bank_transaction:categorize',
      name: 'Categorize Transactions',
      description: 'Categorize bank transactions',
      category: 'banking',
      requiredFeature: null,
      displayOrder: 62,
    },

    // REPORTS
    {
      code: 'report:view_basic',
      name: 'View Basic Reports',
      description: 'View profit & loss, balance sheet, etc.',
      category: 'reports',
      requiredFeature: 'basic_reports',
      displayOrder: 70,
    },
    {
      code: 'report:view_advanced',
      name: 'View Advanced Reports',
      description: 'View advanced custom reports',
      category: 'reports',
      requiredFeature: 'advanced_reports',
      displayOrder: 71,
    },
    {
      code: 'report:export',
      name: 'Export Reports',
      description: 'Export reports to PDF/Excel',
      category: 'reports',
      requiredFeature: 'basic_reports',
      displayOrder: 72,
    },
    {
      code: 'report:customize',
      name: 'Customize Reports',
      description: 'Create custom report templates',
      category: 'reports',
      requiredFeature: 'advanced_reports',
      displayOrder: 73,
    },

    // SETTINGS & ADMIN
    {
      code: 'company:view_settings',
      name: 'View Company Settings',
      description: 'View company configuration',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 80,
    },
    {
      code: 'company:edit_settings',
      name: 'Edit Company Settings',
      description: 'Modify company configuration',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 81,
    },
    {
      code: 'user:view',
      name: 'View Users',
      description: 'View user list',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 82,
    },
    {
      code: 'user:invite',
      name: 'Invite Users',
      description: 'Send user invitations',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 83,
    },
    {
      code: 'user:edit',
      name: 'Edit Users',
      description: 'Edit user roles and details',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 84,
    },
    {
      code: 'user:delete',
      name: 'Delete Users',
      description: 'Deactivate users',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 85,
    },
    {
      code: 'books:close',
      name: 'Close Books',
      description: 'Close accounting periods',
      category: 'settings',
      requiredFeature: null,
      displayOrder: 86,
    },

    // INVENTORY (Premium+)
    {
      code: 'inventory:view',
      name: 'View Inventory',
      description: 'View inventory items and levels',
      category: 'inventory',
      requiredFeature: 'inventory',
      displayOrder: 90,
    },
    {
      code: 'inventory:create',
      name: 'Create Inventory Items',
      description: 'Add new inventory items',
      category: 'inventory',
      requiredFeature: 'inventory',
      displayOrder: 91,
    },
    {
      code: 'inventory:edit',
      name: 'Edit Inventory Items',
      description: 'Modify inventory items',
      category: 'inventory',
      requiredFeature: 'inventory',
      displayOrder: 92,
    },
    {
      code: 'inventory:adjust',
      name: 'Adjust Inventory',
      description: 'Adjust inventory quantities',
      category: 'inventory',
      requiredFeature: 'inventory',
      displayOrder: 93,
    },

    // PRODUCTS & SERVICES
    {
      code: 'product:view',
      name: 'View Products & Services',
      description: 'View product and service list and details',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 94,
    },
    {
      code: 'product:create',
      name: 'Create Products & Services',
      description: 'Create new products and services',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 95,
    },
    {
      code: 'product:edit',
      name: 'Edit Products & Services',
      description: 'Edit product and service information',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 96,
    },
    {
      code: 'product:delete',
      name: 'Delete Products & Services',
      description: 'Delete products and services',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 97,
    },

    // CATEGORIES
    {
      code: 'category:view',
      name: 'View Categories',
      description: 'View product category list',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 98,
    },
    {
      code: 'category:create',
      name: 'Create Categories',
      description: 'Create new product categories',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 99,
    },
    {
      code: 'category:edit',
      name: 'Edit Categories',
      description: 'Edit product categories',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 100,
    },
    {
      code: 'category:delete',
      name: 'Delete Categories',
      description: 'Delete product categories',
      category: 'inventory',
      requiredFeature: null,
      displayOrder: 101,
    },

    // TIME TRACKING (Standard+)
    {
      code: 'time:view',
      name: 'View Time Entries',
      description: 'View time tracking entries',
      category: 'time',
      requiredFeature: 'time_tracking',
      displayOrder: 100,
    },
    {
      code: 'time:create',
      name: 'Create Time Entries',
      description: 'Log time entries',
      category: 'time',
      requiredFeature: 'time_tracking',
      displayOrder: 101,
    },
    {
      code: 'time:edit',
      name: 'Edit Time Entries',
      description: 'Modify time entries',
      category: 'time',
      requiredFeature: 'time_tracking',
      displayOrder: 102,
    },
    {
      code: 'time:approve',
      name: 'Approve Time Entries',
      description: 'Approve time for billing',
      category: 'time',
      requiredFeature: 'time_tracking',
      displayOrder: 103,
    },

    // PROJECTS (Premium+)
    {
      code: 'project:view',
      name: 'View Projects',
      description: 'View project list and details',
      category: 'projects',
      requiredFeature: 'projects',
      displayOrder: 110,
    },
    {
      code: 'project:create',
      name: 'Create Projects',
      description: 'Create new projects',
      category: 'projects',
      requiredFeature: 'projects',
      displayOrder: 111,
    },
    {
      code: 'project:edit',
      name: 'Edit Projects',
      description: 'Modify project details',
      category: 'projects',
      requiredFeature: 'projects',
      displayOrder: 112,
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: permission,
      create: permission,
    });
  }

  console.log(`✅ Created ${permissions.length} permissions`);

  // ============================================================================
  // ROLE PERMISSIONS - Map permissions to roles
  // ============================================================================
  console.log('🔗 Mapping role permissions...');

  // Get all roles and permissions
  const companyAdmin = await prisma.role.findFirst({
    where: { companyId: null, code: 'company_admin' },
  });
  const standard = await prisma.role.findFirst({
    where: { companyId: null, code: 'standard' },
  });
  const limited = await prisma.role.findFirst({
    where: { companyId: null, code: 'limited' },
  });
  const reportsOnly = await prisma.role.findFirst({
    where: { companyId: null, code: 'reports_only' },
  });
  const timeTrackingOnly = await prisma.role.findFirst({
    where: { companyId: null, code: 'time_tracking_only' },
  });

  if (!companyAdmin || !standard || !limited || !reportsOnly || !timeTrackingOnly) {
    throw new Error('Failed to find all required roles');
  }

  // Company Admin: Almost everything
  const companyAdminPermissions = await prisma.permission.findMany({
    where: {
      code: {
        notIn: ['billing:manage'], // Reserved for primary admin
      },
    },
  });

  for (const permission of companyAdminPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          roleId: companyAdmin.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: companyAdmin.id,
        permissionId: permission.id,
      },
    });
  }

  // Standard User: Most operational tasks
  const standardPermissionCodes = [
    'account:view',
    'account:create',
    'account:update',
    'customer:view',
    'customer:create',
    'customer:edit',
    'vendor:view',
    'vendor:create',
    'vendor:edit',
    'invoice:view',
    'invoice:create',
    'invoice:edit',
    'invoice:send',
    'expense:view',
    'expense:create',
    'expense:edit',
    'expense:approve',
    'bill:view',
    'bill:create',
    'bill:edit',
    'bill:pay',
    'bank_account:view',
    'bank_account:reconcile',
    'bank_transaction:categorize',
    'report:view_basic',
    'report:export',
    'time:view',
    'time:create',
    'time:edit',
    'inventory:view',
    'inventory:adjust',
    'product:view',
    'product:create',
    'product:edit',
    'category:view',
    'category:create',
    'category:edit',
    'project:view',
    'credit-note:view',
    'credit-note:create',
    'credit-note:edit',
    'debit-note:view',
    'debit-note:create',
    'debit-note:edit',
    'estimate:view',
    'estimate:create',
    'estimate:edit',
    'estimate:send',
    'estimate:convert',
    'purchase-order:view',
    'purchase-order:create',
    'purchase-order:edit',
    'purchase-order:send',
    'purchase-order:receive',
    'purchase-order:convert',
  ];

  const standardPermissions = await prisma.permission.findMany({
    where: { code: { in: standardPermissionCodes } },
  });

  for (const permission of standardPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          roleId: standard.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: standard.id,
        permissionId: permission.id,
      },
    });
  }

  // Limited User: Basic invoice and expense entry
  const limitedPermissionCodes = [
    'account:view',
    'customer:view',
    'invoice:view',
    'invoice:create',
    'invoice:edit',
    'expense:view',
    'expense:create',
    'expense:edit',
    'product:view',
    'category:view',
    'report:view_basic',
    'credit-note:view',
    'estimate:view',
    'purchase-order:view',
  ];

  const limitedPermissions = await prisma.permission.findMany({
    where: { code: { in: limitedPermissionCodes } },
  });

  for (const permission of limitedPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          roleId: limited.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: limited.id,
        permissionId: permission.id,
      },
    });
  }

  // Reports Only: View only
  const reportsOnlyPermissionCodes = [
    'account:view',
    'customer:view',
    'vendor:view',
    'invoice:view',
    'expense:view',
    'bill:view',
    'bank_account:view',
    'report:view_basic',
    'report:view_advanced',
    'report:export',
    'inventory:view',
    'product:view',
    'category:view',
    'project:view',
    'time:view',
    'credit-note:view',
    'debit-note:view',
    'estimate:view',
    'purchase-order:view',
  ];

  const reportsOnlyPermissions = await prisma.permission.findMany({
    where: { code: { in: reportsOnlyPermissionCodes } },
  });

  for (const permission of reportsOnlyPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          roleId: reportsOnly.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: reportsOnly.id,
        permissionId: permission.id,
      },
    });
  }

  // Time Tracking Only: Only time entry
  const timeTrackingPermissionCodes = [
    'time:view',
    'time:create',
    'time:edit',
  ];

  const timeTrackingPermissions = await prisma.permission.findMany({
    where: { code: { in: timeTrackingPermissionCodes } },
  });

  for (const permission of timeTrackingPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        unique_role_permission: {
          roleId: timeTrackingOnly.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: timeTrackingOnly.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Role permissions mapped successfully');

  // ============================================================================
  // UNITS OF MEASURE - System Defaults
  // ============================================================================
  console.log('📏 Seeding default units of measure...');

  const defaultUnits = [
    { name: 'Each', abbreviation: 'ea' },
    { name: 'Box', abbreviation: 'box' },
    { name: 'Case', abbreviation: 'cs' },
    { name: 'Dozen', abbreviation: 'dz' },
    { name: 'Gram', abbreviation: 'g' },
    { name: 'Kilogram', abbreviation: 'kg' },
    { name: 'Pound', abbreviation: 'lb' },
    { name: 'Ounce', abbreviation: 'oz' },
    { name: 'Liter', abbreviation: 'L' },
    { name: 'Milliliter', abbreviation: 'mL' },
    { name: 'Gallon', abbreviation: 'gal' },
    { name: 'Meter', abbreviation: 'm' },
    { name: 'Centimeter', abbreviation: 'cm' },
    { name: 'Inch', abbreviation: 'in' },
    { name: 'Foot', abbreviation: 'ft' },
    { name: 'Yard', abbreviation: 'yd' },
    { name: 'Hour', abbreviation: 'hr' },
    { name: 'Day', abbreviation: 'day' },
    { name: 'Week', abbreviation: 'wk' },
    { name: 'Month', abbreviation: 'mo' },
    { name: 'Pair', abbreviation: 'pr' },
    { name: 'Set', abbreviation: 'set' },
    { name: 'Pack', abbreviation: 'pk' },
    { name: 'Roll', abbreviation: 'roll' },
    { name: 'Sheet', abbreviation: 'sht' },
    { name: 'Square Foot', abbreviation: 'sqft' },
    { name: 'Square Meter', abbreviation: 'sqm' },
    { name: 'Cubic Meter', abbreviation: 'cbm' },
    { name: 'Piece', abbreviation: 'pc' },
    { name: 'Unit', abbreviation: 'unit' },
  ];

  for (const unit of defaultUnits) {
    const existing = await prisma.unitOfMeasure.findFirst({
      where: { companyId: null, name: unit.name },
    });
    if (existing) {
      await prisma.unitOfMeasure.update({
        where: { id: existing.id },
        data: { abbreviation: unit.abbreviation },
      });
    } else {
      await prisma.unitOfMeasure.create({
        data: {
          name: unit.name,
          abbreviation: unit.abbreviation,
          companyId: null,
          isSystem: true,
        },
      });
    }
  }

  console.log(`✅ Created ${defaultUnits.length} default units of measure`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  const roleCount = await prisma.role.count();
  const permissionCount = await prisma.permission.count();
  const rolPermissionCount = await prisma.rolePermission.count();
  const uomCount = await prisma.unitOfMeasure.count();

  console.log('\n📊 Seed Summary:');
  console.log(`   - Roles: ${roleCount}`);
  console.log(`   - Permissions: ${permissionCount}`);
  console.log(`   - Role-Permission Mappings: ${rolPermissionCount}`);
  console.log(`   - Units of Measure: ${uomCount}`);
  console.log('\n✅ Database seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
