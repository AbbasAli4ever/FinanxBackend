# RBAC Module (Role-Based Access Control) - QuickBooks Style

**Module:** RBAC (Users, Roles, Permissions)
**Version:** 2.0.0
**Last Updated:** 2026-01-28
**Status:** Redesigned to Follow QuickBooks Workflow

---

## Table of Contents

1. [Overview](#1-overview)
2. [Dependencies](#2-dependencies)
3. [Database Schema](#3-database-schema)
4. [Permission System Design](#4-permission-system-design)
5. [Data Flow](#5-data-flow)
6. [API Design](#6-api-design)
7. [Business Logic](#7-business-logic)
8. [Validation Rules](#8-validation-rules)
9. [Edge Cases](#9-edge-cases)
10. [Related Modules](#10-related-modules)

---

## 1. Overview

### 1.1 Purpose

The RBAC module provides **simple, QuickBooks-style access control** for individual company accounts. Each company manages its own users with predefined roles based on their subscription plan. No platform admin, no module licensing - just straightforward company-level user management.

### 1.2 Key Responsibilities

| Responsibility | Description |
|----------------|-------------|
| **Company Management** | Each company has its own isolated account |
| **Subscription-Based Access** | Features available based on subscription tier (Starter, Standard, Premium) |
| **User Management** | Company admins invite and manage users |
| **Simple Role System** | Predefined roles: Admin, Standard, Limited, Reports-only, Time-tracking |
| **Permission Enforcement** | Role-based permissions (no complex licensing) |
| **Session Management** | JWT-based authentication |
| **Audit Trail** | Track user actions |

### 1.3 QuickBooks-Style Access Model

```
┌─────────────────────────────────────────────────────────────────┐
│                  QUICKBOOKS-STYLE RBAC                           │
└─────────────────────────────────────────────────────────────────┘

Single Company Account
    │ Example: MuteTaxes LLC
    │ Subscription: Premium Plan
    │ Available Features: Based on plan tier
    │
    ▼
Company Administrator (Primary Admin)
    │ - Full access to everything
    │ - Manages company settings
    │ - Invites users
    │ - Assigns roles
    │ - Manages subscription
    │
    │ invites users with roles
    ▼
Company Users
    ├─ Standard User: Can create, edit transactions
    ├─ Limited User: Can create, edit some transactions
    ├─ Reports Only: View reports and lists
    ├─ Time Tracking Only: Enter time only
    └─ Custom Role: Company admin defines permissions

Authorization Flow:
┌──────────────────────┐       ┌──────────────────────┐
│  Company has feature │  AND  │  User's role allows  │
│  in subscription?    │───────│  this action?        │
└──────────────────────┘       └──────────────────────┘
           │                              │
           └──────────┬───────────────────┘
                      ▼
              ✅ Access Granted
              ❌ Access Denied (upgrade prompt)
```

### 1.4 Subscription Tiers (Like QuickBooks)

```
┌─────────────────────────────────────────────────────────────────┐
│                    SUBSCRIPTION TIERS                            │
└─────────────────────────────────────────────────────────────────┘

STARTER ($15/month)
    ├─ Income & Expenses tracking
    ├─ Invoicing
    ├─ Basic Reports
    ├─ 1 User
    └─ Sales Tax

STANDARD ($30/month)
    ├─ Everything in Starter
    ├─ Bills & Payments
    ├─ Time Tracking
    ├─ Manage 1099 contractors
    └─ Up to 3 Users

PREMIUM ($55/month)
    ├─ Everything in Standard
    ├─ Inventory Management
    ├─ Project Tracking
    ├─ Advanced Reports
    ├─ Custom Roles
    └─ Up to 5 Users

ENTERPRISE ($100/month)
    ├─ Everything in Premium
    ├─ Multi-Currency
    ├─ Advanced Inventory
    ├─ Workflow Automation
    ├─ Dedicated Support
    └─ Unlimited Users
```

### 1.5 Key Concepts

| Concept | Definition |
|---------|------------|
| **Company** | A business entity with its own QuickBooks account |
| **Subscription Plan** | Tier that determines available features (Starter, Standard, Premium, Enterprise) |
| **Primary Admin** | The company owner with full access and billing control |
| **Company Admin** | User with admin privileges (can manage users and settings) |
| **Standard User** | Can perform most accounting tasks |
| **Limited User** | Restricted access to specific areas |
| **Reports Only** | Can only view reports and lists |
| **Time Tracking Only** | Can only enter time |
| **Custom Role** | Available in Premium+ plans for specific permission sets |

### 1.6 Access Control Scenarios

| User Type | Can Do | Cannot Do |
|-----------|--------|-----------|
| **Primary Admin** | - Everything<br>- Manage subscription<br>- Close books<br>- Manage all users | - Nothing (full access) |
| **Company Admin** | - Everything except billing<br>- Manage users<br>- Close books | - Manage subscription<br>- Delete company |
| **Standard User** | - Create/edit transactions<br>- Reconcile accounts<br>- Run reports | - Manage users<br>- Change company settings<br>- Close books |
| **Limited User** | - Create/edit invoices<br>- Enter expenses<br>- View assigned reports | - Access payroll<br>- View full reports<br>- Change settings |
| **Reports Only** | - View all reports<br>- View customer/vendor lists<br>- Export data | - Create transactions<br>- Edit anything |

---

## 2. Dependencies

### 2.1 This Module Depends On

| Module | Relationship | Link |
|--------|--------------|------|
| Company | Users belong to a company | [COMPANY_MODULE.md](../company/COMPANY_MODULE.md) |
| Subscription | Feature access based on plan | [SUBSCRIPTION_MODULE.md](../subscription/SUBSCRIPTION_MODULE.md) |

### 2.2 Modules That Depend On This

| Module | Relationship |
|--------|--------------|
| All modules | Permission checks on all APIs |
| [Audit Log](../audit-log/AUDIT_LOG_MODULE.md) | User tracking |
| [Invoice](../invoice/INVOICE_MODULE.md) | `created_by`, `approved_by` |

### 2.3 Dependency Diagram

```
┌──────────────────┐
│     Company      │
│   (Single)       │
└────────┬─────────┘
         │
         ├──────────────┐
         │              │
         ▼              ▼
┌──────────────────┐  ┌──────────────────┐
│  Subscription    │  │      Users       │
│   (Plan Tier)    │  └────────┬─────────┘
└────────┬─────────┘           │
         │                     │
         │                     ▼
         │            ┌──────────────────┐
         │            │      Roles       │
         │            │   (Predefined)   │
         │            └────────┬─────────┘
         │                     │
         ▼                     ▼
┌──────────────────┐  ┌──────────────────┐
│  Plan Features   │  │   Permissions    │
│   (What you      │  │  (What role      │
│    paid for)     │  │   can do)        │
└──────────────────┘  └──────────────────┘
```

---

## 3. Database Schema

### 3.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                   RBAC SCHEMA (QUICKBOOKS STYLE)                                │
└─────────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   companies      │
                              │──────────────────│
                              │ id (PK)          │
                              │ name             │
                              │ subscription_id  │──┐
                              │ is_active        │  │
                              └────┬─────────────┘  │
                                   │                │
                                   │ 1:N            │
                                   ▼                │
                              ┌──────────────────┐  │
                              │      users       │  │
                              │──────────────────│  │
                              │ id (PK)          │  │
                              │ company_id (FK)  │  │
                              │ email            │  │
                              │ role_id (FK)     │  │
                              │ is_primary_admin │  │
                              │ is_active        │  │
                              └────────┬─────────┘  │
                                       │            │
                                       │ N:1        │
                                       ▼            │
                              ┌──────────────────┐  │
                              │      roles       │  │
                              │──────────────────│  │
                              │ id (PK)          │  │
                              │ code             │  │
                              │ name             │  │
                              │ is_system_role   │  │
                              │ required_plan    │◄─┼─ Roles require minimum plan
                              └────────┬─────────┘  │
                                       │            │
                                       │ 1:N        │
                                       ▼            │
                              ┌──────────────────┐  │
                              │ role_permissions │  │
                              │──────────────────│  │
                              │ role_id (FK)     │  │
                              │ permission_id    │  │
                              └────────┬─────────┘  │
                                       │            │
                                       │ N:1        │
                                       ▼            │
                              ┌──────────────────┐  │
                              │   permissions    │  │
                              │──────────────────│  │
                              │ id (PK)          │  │
                              │ code             │  │
                              │ name             │  │
                              │ category         │  │
                              └──────────────────┘  │
                                                     │
                              ┌──────────────────┐  │
                              │  subscriptions   │◄─┘
                              │──────────────────│
                              │ id (PK)          │
                              │ company_id (FK)  │
                              │ plan_code        │
                              │ status           │
                              │ max_users        │
                              │ features[]       │
                              └──────────────────┘
```

### 3.2 Companies Table

```sql
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    tax_id VARCHAR(50),
    
    -- Business Info
    industry VARCHAR(100),
    company_type VARCHAR(50),  -- LLC, Corporation, etc.
    
    -- Contact
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    
    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'US',
    
    -- Settings
    fiscal_year_end DATE,
    default_currency VARCHAR(3) DEFAULT 'USD',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    
    -- Books
    books_closed_through DATE,  -- Closed accounting periods
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Search
    search_vector TSVECTOR
);

CREATE INDEX idx_companies_active ON companies(is_active) WHERE is_active = true;
CREATE INDEX idx_companies_search ON companies USING GIN(search_vector);

-- Trigger for updated_at
CREATE TRIGGER trg_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3.3 Subscriptions Table

```sql
-- Subscription plans determine what features are available
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Plan
    plan_code VARCHAR(50) NOT NULL,  -- 'starter', 'standard', 'premium', 'enterprise'
    plan_name VARCHAR(100) NOT NULL,
    
    -- Pricing
    monthly_price DECIMAL(10,2),
    annual_price DECIMAL(10,2),
    billing_cycle VARCHAR(20),  -- 'monthly', 'annual'
    
    -- Limits
    max_users INTEGER DEFAULT 1,
    max_companies INTEGER DEFAULT 1,  -- For accountant edition
    
    -- Features (JSON array of feature codes)
    features JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active',  -- active, trial, suspended, cancelled
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    next_billing_date TIMESTAMP WITH TIME ZONE,
    
    -- Payment
    payment_method_id VARCHAR(255),  -- Stripe payment method
    last_payment_date TIMESTAMP WITH TIME ZONE,
    last_payment_amount DECIMAL(10,2),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CHECK (status IN ('active', 'trial', 'suspended', 'cancelled')),
    CHECK (billing_cycle IN ('monthly', 'annual')),
    UNIQUE(company_id)
);

CREATE INDEX idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_code);

-- Trigger for updated_at
CREATE TRIGGER trg_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Seed subscription plans
-- Features are stored as JSON array: ["invoicing", "expenses", "reports", "inventory", etc.]
INSERT INTO subscriptions (company_id, plan_code, plan_name, monthly_price, max_users, features, billing_cycle, status)
VALUES 
-- These are template plans, actual subscriptions created when company signs up
(NULL, 'starter', 'Starter', 15.00, 1, 
 '["invoicing", "expenses", "basic_reports", "sales_tax", "customers", "vendors"]'::jsonb,
 'monthly', 'template'),
 
(NULL, 'standard', 'Standard', 30.00, 3,
 '["invoicing", "expenses", "basic_reports", "sales_tax", "customers", "vendors", "bills", "time_tracking", "1099_contractors", "bank_reconciliation"]'::jsonb,
 'monthly', 'template'),
 
(NULL, 'premium', 'Premium', 55.00, 5,
 '["invoicing", "expenses", "basic_reports", "sales_tax", "customers", "vendors", "bills", "time_tracking", "1099_contractors", "bank_reconciliation", "inventory", "projects", "advanced_reports", "custom_roles", "budgets"]'::jsonb,
 'monthly', 'template'),
 
(NULL, 'enterprise', 'Enterprise', 100.00, 999,
 '["invoicing", "expenses", "basic_reports", "sales_tax", "customers", "vendors", "bills", "time_tracking", "1099_contractors", "bank_reconciliation", "inventory", "projects", "advanced_reports", "custom_roles", "budgets", "multi_currency", "advanced_inventory", "workflow_automation", "dedicated_support", "api_access"]'::jsonb,
 'monthly', 'template');
```

### 3.4 Roles Table (System-Defined)

```sql
-- Roles are predefined (like QuickBooks)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    code VARCHAR(50) UNIQUE NOT NULL,  -- 'admin', 'standard', 'limited', 'reports_only'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Requirements
    is_system_role BOOLEAN DEFAULT true,  -- System roles cannot be deleted
    required_plan VARCHAR(50),  -- Minimum plan needed (NULL = all plans)
    
    -- Display
    display_order INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed roles (QuickBooks style)
INSERT INTO roles (code, name, description, required_plan, display_order) VALUES
('company_admin', 'Company Administrator', 'Full access except billing. Can manage users and settings.', NULL, 1),
('standard', 'Standard User', 'Can create and edit most transactions, reconcile accounts, run reports.', NULL, 2),
('limited', 'Limited User', 'Restricted access to specific areas (invoices, expenses).', NULL, 3),
('reports_only', 'Reports Only', 'Can only view reports and lists. Cannot create or edit.', NULL, 4),
('time_tracking_only', 'Time Tracking Only', 'Can only enter time. No access to financial data.', 'standard', 5),
('custom', 'Custom Role', 'Define your own permission set.', 'premium', 6);

CREATE INDEX idx_roles_code ON roles(code);
CREATE INDEX idx_roles_system ON roles(is_system_role) WHERE is_system_role = true;

-- Trigger for updated_at
CREATE TRIGGER trg_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 3.5 Permissions Table (System-Defined)

```sql
-- Permissions define specific actions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    code VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'invoice:create', 'reports:view'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Category (for grouping in UI)
    category VARCHAR(50),  -- 'sales', 'expenses', 'banking', 'reports', 'settings'
    
    -- Required Feature
    required_feature VARCHAR(50),  -- Feature code from subscription.features
    
    -- Display
    display_order INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed permissions (QuickBooks style)
-- SALES & CUSTOMERS
INSERT INTO permissions (code, name, category, required_feature, display_order) VALUES
('customer:view', 'View Customers', 'sales', 'customers', 10),
('customer:create', 'Create Customers', 'sales', 'customers', 11),
('customer:edit', 'Edit Customers', 'sales', 'customers', 12),
('customer:delete', 'Delete Customers', 'sales', 'customers', 13),
('invoice:view', 'View Invoices', 'sales', 'invoicing', 20),
('invoice:create', 'Create Invoices', 'sales', 'invoicing', 21),
('invoice:edit', 'Edit Invoices', 'sales', 'invoicing', 22),
('invoice:delete', 'Delete Invoices', 'sales', 'invoicing', 23),
('invoice:send', 'Send Invoices', 'sales', 'invoicing', 24),
('invoice:void', 'Void Invoices', 'sales', 'invoicing', 25),

-- EXPENSES & VENDORS
('vendor:view', 'View Vendors', 'expenses', 'vendors', 30),
('vendor:create', 'Create Vendors', 'expenses', 'vendors', 31),
('vendor:edit', 'Edit Vendors', 'expenses', 'vendors', 32),
('vendor:delete', 'Delete Vendors', 'expenses', 'vendors', 33),
('expense:view', 'View Expenses', 'expenses', 'expenses', 40),
('expense:create', 'Create Expenses', 'expenses', 'expenses', 41),
('expense:edit', 'Edit Expenses', 'expenses', 'expenses', 42),
('expense:delete', 'Delete Expenses', 'expenses', 'expenses', 43),
('bill:view', 'View Bills', 'expenses', 'bills', 50),
('bill:create', 'Create Bills', 'expenses', 'bills', 51),
('bill:edit', 'Edit Bills', 'expenses', 'bills', 52),
('bill:pay', 'Pay Bills', 'expenses', 'bills', 53),

-- BANKING
('bank_account:view', 'View Bank Accounts', 'banking', NULL, 60),
('bank_account:reconcile', 'Reconcile Bank Accounts', 'banking', 'bank_reconciliation', 61),
('bank_transaction:categorize', 'Categorize Transactions', 'banking', NULL, 62),

-- REPORTS
('report:view_basic', 'View Basic Reports', 'reports', 'basic_reports', 70),
('report:view_advanced', 'View Advanced Reports', 'reports', 'advanced_reports', 71),
('report:export', 'Export Reports', 'reports', 'basic_reports', 72),
('report:customize', 'Customize Reports', 'reports', 'advanced_reports', 73),

-- SETTINGS & ADMIN
('company:view_settings', 'View Company Settings', 'settings', NULL, 80),
('company:edit_settings', 'Edit Company Settings', 'settings', NULL, 81),
('user:view', 'View Users', 'settings', NULL, 82),
('user:invite', 'Invite Users', 'settings', NULL, 83),
('user:edit', 'Edit Users', 'settings', NULL, 84),
('user:delete', 'Delete Users', 'settings', NULL, 85),
('books:close', 'Close Books', 'settings', NULL, 86),

-- INVENTORY (Premium+)
('inventory:view', 'View Inventory', 'inventory', 'inventory', 90),
('inventory:create', 'Create Inventory Items', 'inventory', 'inventory', 91),
('inventory:edit', 'Edit Inventory Items', 'inventory', 'inventory', 92),
('inventory:adjust', 'Adjust Inventory', 'inventory', 'inventory', 93),

-- TIME TRACKING (Standard+)
('time:view', 'View Time Entries', 'time', 'time_tracking', 100),
('time:create', 'Create Time Entries', 'time', 'time_tracking', 101),
('time:edit', 'Edit Time Entries', 'time', 'time_tracking', 102),
('time:approve', 'Approve Time Entries', 'time', 'time_tracking', 103),

-- PROJECTS (Premium+)
('project:view', 'View Projects', 'projects', 'projects', 110),
('project:create', 'Create Projects', 'projects', 'projects', 111),
('project:edit', 'Edit Projects', 'projects', 'projects', 112);

CREATE INDEX idx_permissions_code ON permissions(code);
CREATE INDEX idx_permissions_category ON permissions(category);
CREATE INDEX idx_permissions_feature ON permissions(required_feature);
```

### 3.6 Role Permissions (Many-to-Many)

```sql
-- Maps which permissions each role has
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- Seed role permissions (QuickBooks style)

-- COMPANY ADMIN: Almost everything except billing
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'company_admin'),
    id
FROM permissions
WHERE code != 'billing:manage';  -- Admin can't manage billing, only primary admin

-- STANDARD USER: Most operational tasks
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'standard'),
    id
FROM permissions
WHERE code IN (
    'customer:view', 'customer:create', 'customer:edit',
    'vendor:view', 'vendor:create', 'vendor:edit',
    'invoice:view', 'invoice:create', 'invoice:edit', 'invoice:send',
    'expense:view', 'expense:create', 'expense:edit',
    'bill:view', 'bill:create', 'bill:edit', 'bill:pay',
    'bank_account:view', 'bank_account:reconcile', 'bank_transaction:categorize',
    'report:view_basic', 'report:export',
    'time:view', 'time:create', 'time:edit',
    'inventory:view', 'inventory:adjust',
    'project:view'
);

-- LIMITED USER: Basic invoice and expense entry
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'limited'),
    id
FROM permissions
WHERE code IN (
    'customer:view',
    'invoice:view', 'invoice:create', 'invoice:edit',
    'expense:view', 'expense:create', 'expense:edit',
    'report:view_basic'
);

-- REPORTS ONLY: View only
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'reports_only'),
    id
FROM permissions
WHERE code IN (
    'customer:view', 'vendor:view',
    'invoice:view', 'expense:view', 'bill:view',
    'bank_account:view',
    'report:view_basic', 'report:view_advanced', 'report:export',
    'inventory:view', 'project:view', 'time:view'
);

-- TIME TRACKING ONLY: Only time entry
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE code = 'time_tracking_only'),
    id
FROM permissions
WHERE code IN (
    'time:view', 'time:create', 'time:edit'
);
```

### 3.7 Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Authentication
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    avatar_url VARCHAR(500),
    
    -- Role
    role_id UUID REFERENCES roles(id),
    
    -- Admin Flags
    is_primary_admin BOOLEAN DEFAULT false,  -- The company owner (billing access)
    
    -- Preferences
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    locale VARCHAR(10) DEFAULT 'en-US',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    invitation_accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Security
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE,
    must_change_password BOOLEAN DEFAULT false,
    
    -- Tracking
    last_login_at TIMESTAMP WITH TIME ZONE,
    last_login_ip INET,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID REFERENCES users(id),
    
    -- Constraints
    UNIQUE(company_id, email),
    CHECK (NOT (is_primary_admin = false AND role_id IS NULL))  -- Non-primary admin must have role
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(company_id, is_active) WHERE is_active = true;
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_users_primary_admin ON users(company_id, is_primary_admin) WHERE is_primary_admin = true;

-- Trigger for updated_at
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure only one primary admin per company
CREATE UNIQUE INDEX idx_users_one_primary_admin 
ON users(company_id) 
WHERE is_primary_admin = true;

-- Prevent deletion of primary admin
CREATE OR REPLACE FUNCTION prevent_primary_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_primary_admin THEN
        RAISE EXCEPTION 'Cannot delete the primary administrator. Transfer ownership first.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_primary_admin_deletion
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION prevent_primary_admin_deletion();
```

### 3.8 User Invitations Table

```sql
-- Track user invitations (QuickBooks sends email invites)
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Invitation
    email VARCHAR(255) NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    
    -- Inviter
    invited_by UUID NOT NULL REFERENCES users(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',  -- pending, accepted, expired, cancelled
    
    -- Validity
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- Personal message
    message TEXT,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'))
);

CREATE INDEX idx_invitations_company ON user_invitations(company_id);
CREATE INDEX idx_invitations_email ON user_invitations(email);
CREATE INDEX idx_invitations_token ON user_invitations(invitation_token);
CREATE INDEX idx_invitations_status ON user_invitations(status) WHERE status = 'pending';
```

### 3.9 Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    
    -- Device info
    device_name VARCHAR(100),
    device_type VARCHAR(50),  -- 'web', 'mobile', 'desktop'
    ip_address INET,
    user_agent TEXT,
    
    -- Validity
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    UNIQUE(token_hash)
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

---

## 4. Permission System Design

### 4.1 Permission Check Logic (QuickBooks Style)

```
Authorization Flow:
┌────────────────────────────────────────────────────────────┐
│ Step 1: Is user active?                                    │
│         ├─ No  → 401 Unauthorized                          │
│         └─ Yes → Continue                                  │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Step 2: Is user the primary admin?                         │
│         ├─ Yes → ✅ GRANT ACCESS (bypass all checks)       │
│         └─ No  → Continue                                  │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Step 3: Does company's subscription include this feature?  │
│         ├─ No  → 403 🔒 Upgrade Required                   │
│         └─ Yes → Continue                                  │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│ Step 4: Does user's role have this permission?             │
│         ├─ No  → 403 🔒 Access Denied                      │
│         └─ Yes → ✅ GRANT ACCESS                           │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Permission Code Format

```
Format: {resource}:{action}

Examples:
- invoice:view      - View invoices
- invoice:create    - Create invoices
- invoice:edit      - Edit invoices
- invoice:delete    - Delete invoices
- invoice:send      - Send invoices to customers
- invoice:void      - Void posted invoices
- report:view_basic - View basic reports
- user:invite       - Invite new users
```

### 4.3 Predefined Roles (Like QuickBooks)

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| **Primary Admin** | Company owner | Everything (hardcoded, not in role table) |
| **Company Admin** | Secondary admin | Everything except billing management |
| **Standard User** | Regular employee | Create/edit transactions, reconcile, reports |
| **Limited User** | Restricted access | Invoice/expense entry only |
| **Reports Only** | View-only user | View reports and lists |
| **Time Tracking Only** | Time entry only | Enter time (requires Standard+ plan) |
| **Custom Role** | User-defined | Any combination (Premium+ plans only) |

### 4.4 Role Comparison Matrix

| Permission | Primary Admin | Company Admin | Standard | Limited | Reports Only | Time Only |
|------------|---------------|---------------|----------|---------|--------------|-----------|
| Manage Billing | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Close Books | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create Invoices | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Edit Invoices | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete Invoices | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Expenses | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Reconcile Accounts | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Advanced Reports | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Enter Time | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Approve Time | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 5. Data Flow

### 5.1 User Invitation Flow (QuickBooks Style)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        USER INVITATION FLOW                              │
└─────────────────────────────────────────────────────────────────────────┘

    Admin                         Server                        Email Service
      │                             │                              │
      │  POST /users/invite         │                              │
      │  {email, role, message}     │                              │
      │───────────────────────────►│                              │
      │                             │                              │
      │                             │  Check subscription limits   │
      │                             │  (max_users not exceeded)    │
      │                             │                              │
      │                             │  Generate invitation token   │
      │                             │                              │
      │                             │  Store invitation            │
      │                             │                              │
      │                             │  Send invitation email       │
      │                             │─────────────────────────────►│
      │                             │                              │
      │  {success, invitation_id}   │                              │
      │◄────────────────────────────│                              │
      │                             │                              │
                                    │                              │
    New User                        │                              │
      │◄────────────────────────────┼──────────────────────────────│
      │  Email: "You've been invited to join MuteTaxes on QuickBooks"
      │                             │                              │
      │  Click invitation link      │                              │
      │  GET /accept-invite?token=X │                              │
      │───────────────────────────►│                              │
      │                             │                              │
      │                             │  Validate token              │
      │                             │  Show sign-up form           │
      │                             │                              │
      │  POST /users/complete-invite│                              │
      │  {token, password, name}    │                              │
      │───────────────────────────►│                              │
      │                             │                              │
      │                             │  Create user account         │
      │                             │  Assign role from invitation │
      │                             │  Mark invitation accepted    │
      │                             │                              │
      │  {access_token, user}       │                              │
      │◄────────────────────────────│                              │
      │                             │                              │
```

### 5.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

    Client                        Server                        Database
       │                            │                              │
       │  POST /auth/login          │                              │
       │  {email, password}         │                              │
       │───────────────────────────►│                              │
       │                            │  Find user by email          │
       │                            │─────────────────────────────►│
       │                            │◄─────────────────────────────│
       │                            │                              │
       │                            │  Check: user.is_active?      │
       │                            │  Check: company.is_active?   │
       │                            │  Check: subscription active? │
       │                            │                              │
       │                            │  Verify password (bcrypt)    │
       │                            │                              │
       │                            │  Load subscription features  │
       │                            │  Load role permissions       │
       │                            │                              │
       │                            │  Generate JWT (15min)        │
       │                            │  Generate refresh token      │
       │                            │                              │
       │  {access_token,            │                              │
       │   refresh_token,           │                              │
       │   user, company,           │                              │
       │   permissions,             │                              │
       │   subscription}            │                              │
       │◄───────────────────────────│                              │
       │                            │                              │
```

### 5.3 Permission Check Flow (Every Request)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                   PERMISSION CHECK FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

    Request with Bearer Token (e.g., POST /api/invoices)
              │
              ▼
    ┌─────────────────┐
    │ Extract JWT     │
    │ from header     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Verify JWT      │───────► 401 Unauthorized
    │ signature       │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Extract:        │
    │ - user_id       │
    │ - company_id    │
    │ - is_primary    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Load user       │───────► 401 User not found
    │ from database   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Check user      │───────► 403 Account inactive
    │ is_active?      │
    └────────┬────────┘
             │ YES
             ▼
    ┌─────────────────┐
    │ Is primary      │───YES──► ✅ PROCEED (full access)
    │ admin?          │
    └────────┬────────┘
             │ NO
             ▼
    ┌─────────────────┐
    │ Load company    │
    │ subscription    │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Subscription    │───INACTIVE─► 403 Subscription inactive
    │ status active?  │
    └────────┬────────┘
             │ ACTIVE
             ▼
    ┌─────────────────┐
    │ Get required    │  Example: "invoice:create"
    │ permission for  │  → requires feature: "invoicing"
    │ this endpoint   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Check if        │───NO───► 403 🔒 Subscription doesn't include
    │ subscription    │          "Upgrade to Standard to access invoicing"
    │ includes feature│
    └────────┬────────┘
             │ YES
             ▼
    ┌─────────────────┐
    │ Load user's     │
    │ role            │
    │ permissions     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │ Does role have  │───NO───► 403 🔒 Access Denied
    │ this permission?│          "Contact your admin for access"
    └────────┬────────┘
             │ YES
             ▼
         ✅ PROCEED
```

---

## 6. API Design

### 6.1 Authentication Endpoints

#### 6.1.1 Login

**Endpoint:** `POST /api/v1/auth/login`
**Permission:** Public

**Request Body:**
```json
{
    "email": "john@mutetaxes.com",
    "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
        "token_type": "Bearer",
        "expires_in": 900,
        "user": {
            "id": "uuid",
            "email": "john@mutetaxes.com",
            "first_name": "John",
            "last_name": "Doe",
            "role": {
                "code": "standard",
                "name": "Standard User"
            },
            "is_primary_admin": false
        },
        "company": {
            "id": "uuid",
            "name": "MuteTaxes LLC",
            "subscription": {
                "plan_code": "premium",
                "plan_name": "Premium",
                "status": "active",
                "features": ["invoicing", "expenses", "inventory", "projects"]
            }
        },
        "permissions": [
            "invoice:view", "invoice:create", "invoice:edit",
            "expense:view", "expense:create", "expense:edit",
            "customer:view", "customer:create",
            "report:view_basic"
        ]
    }
}
```

**Error Responses:**

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_LOCKED` | 403 | Too many failed attempts |
| `ACCOUNT_INACTIVE` | 403 | User is deactivated |
| `COMPANY_INACTIVE` | 403 | Company is deactivated |
| `SUBSCRIPTION_INACTIVE` | 403 | Subscription expired/cancelled |

#### 6.1.2 Logout

**Endpoint:** `POST /api/v1/auth/logout`
**Permission:** Authenticated

**Request Body:**
```json
{
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### 6.1.3 Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`
**Permission:** Public (valid refresh token)

**Request Body:**
```json
{
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

### 6.2 User Management Endpoints

#### 6.2.1 Invite User

**Endpoint:** `POST /api/v1/users/invite`
**Permission:** `user:invite` (Admin only)

**Request Body:**
```json
{
    "email": "newuser@mutetaxes.com",
    "role_id": "uuid",
    "first_name": "Jane",
    "last_name": "Smith",
    "message": "Welcome to the team! Looking forward to working with you."
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "invitation_id": "uuid",
        "email": "newuser@mutetaxes.com",
        "role": {
            "id": "uuid",
            "name": "Standard User"
        },
        "status": "pending",
        "expires_at": "2026-02-05T10:00:00Z",
        "invitation_url": "https://app.quickbooks.com/accept-invite?token=abc123"
    },
    "message": "Invitation sent to newuser@mutetaxes.com"
}
```

**Error Responses:**

| Code | Status | Description |
|------|--------|-------------|
| `USER_LIMIT_REACHED` | 403 | Subscription user limit reached. Upgrade plan. |
| `EMAIL_ALREADY_EXISTS` | 409 | User with this email already exists |
| `ROLE_REQUIRES_UPGRADE` | 403 | Selected role requires Premium plan |

#### 6.2.2 Accept Invitation

**Endpoint:** `POST /api/v1/users/accept-invite`
**Permission:** Public (valid token)

**Request Body:**
```json
{
    "invitation_token": "abc123xyz",
    "password": "SecurePassword123!",
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+1-555-123-4567"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIs...",
        "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
        "user": {
            "id": "uuid",
            "email": "newuser@mutetaxes.com",
            "first_name": "Jane",
            "last_name": "Smith",
            "role": {
                "code": "standard",
                "name": "Standard User"
            }
        }
    },
    "message": "Welcome to MuteTaxes LLC!"
}
```

#### 6.2.3 List Users

**Endpoint:** `GET /api/v1/users`
**Permission:** `user:view`

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer | Page number |
| `per_page` | integer | Items per page (max 100) |
| `search` | string | Search by name/email |
| `role_id` | uuid | Filter by role |
| `is_active` | boolean | Filter by status |

**Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "email": "john@mutetaxes.com",
            "first_name": "John",
            "last_name": "Doe",
            "role": {
                "id": "uuid",
                "code": "company_admin",
                "name": "Company Administrator"
            },
            "is_primary_admin": false,
            "is_active": true,
            "last_login_at": "2026-01-27T14:30:00Z",
            "created_at": "2025-12-01T10:00:00Z"
        }
    ],
    "pagination": {
        "page": 1,
        "per_page": 20,
        "total_items": 5,
        "total_pages": 1
    }
}
```

#### 6.2.4 Update User Role

**Endpoint:** `PUT /api/v1/users/{user_id}/role`
**Permission:** `user:edit`

**Request Body:**
```json
{
    "role_id": "uuid"
}
```

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "email": "jane@mutetaxes.com",
        "role": {
            "id": "uuid",
            "code": "company_admin",
            "name": "Company Administrator"
        }
    },
    "message": "User role updated successfully"
}
```

#### 6.2.5 Deactivate User

**Endpoint:** `DELETE /api/v1/users/{user_id}`
**Permission:** `user:delete`

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "is_active": false,
        "deactivated_at": "2026-01-28T10:00:00Z"
    },
    "message": "User deactivated successfully"
}
```

**Error Responses:**

| Code | Status | Description |
|------|--------|-------------|
| `CANNOT_DELETE_SELF` | 403 | Cannot deactivate yourself |
| `CANNOT_DELETE_PRIMARY` | 403 | Cannot deactivate primary admin |
| `CANNOT_DELETE_LAST_ADMIN` | 403 | Must have at least one admin |

#### 6.2.6 Resend Invitation

**Endpoint:** `POST /api/v1/users/invitations/{invitation_id}/resend`
**Permission:** `user:invite`

### 6.3 Role Endpoints

#### 6.3.1 List Available Roles

**Endpoint:** `GET /api/v1/roles`
**Permission:** `user:view`

**Response (200 OK):**
```json
{
    "success": true,
    "data": [
        {
            "id": "uuid",
            "code": "company_admin",
            "name": "Company Administrator",
            "description": "Full access except billing",
            "is_available": true,
            "required_plan": null,
            "user_count": 2
        },
        {
            "id": "uuid",
            "code": "standard",
            "name": "Standard User",
            "description": "Can create and edit most transactions",
            "is_available": true,
            "required_plan": null,
            "user_count": 3
        },
        {
            "id": "uuid",
            "code": "custom",
            "name": "Custom Role",
            "description": "Define your own permission set",
            "is_available": false,
            "required_plan": "premium",
            "upgrade_message": "Upgrade to Premium to create custom roles",
            "user_count": 0
        }
    ]
}
```

#### 6.3.2 Get Role Details with Permissions

**Endpoint:** `GET /api/v1/roles/{role_id}`
**Permission:** `user:view`

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "standard",
        "name": "Standard User",
        "description": "Can create and edit most transactions",
        "permissions": [
            {
                "id": "uuid",
                "code": "invoice:view",
                "name": "View Invoices",
                "category": "sales"
            },
            {
                "id": "uuid",
                "code": "invoice:create",
                "name": "Create Invoices",
                "category": "sales"
            }
        ],
        "permission_summary": {
            "sales": ["view", "create", "edit"],
            "expenses": ["view", "create", "edit"],
            "banking": ["view", "categorize"],
            "reports": ["view_basic", "export"],
            "settings": []
        }
    }
}
```

#### 6.3.3 Create Custom Role (Premium+)

**Endpoint:** `POST /api/v1/roles/custom`
**Permission:** `user:edit` + Premium subscription

**Request Body:**
```json
{
    "name": "Invoice Specialist",
    "description": "Can manage invoices and customers only",
    "permission_ids": [
        "uuid1", "uuid2", "uuid3"
    ]
}
```

**Response (201 Created):**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "code": "custom_invoice_specialist",
        "name": "Invoice Specialist",
        "description": "Can manage invoices and customers only",
        "permission_count": 8
    },
    "message": "Custom role created successfully"
}
```

**Error Responses:**

| Code | Status | Description |
|------|--------|-------------|
| `FEATURE_NOT_AVAILABLE` | 403 | Custom roles require Premium plan. Upgrade to create. |
| `CUSTOM_ROLE_LIMIT` | 403 | Maximum custom roles reached (5 per company) |

### 6.4 Permission Endpoints

#### 6.4.1 List All Permissions (Grouped)

**Endpoint:** `GET /api/v1/permissions`
**Permission:** `user:view`

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "sales": [
            {
                "id": "uuid",
                "code": "invoice:view",
                "name": "View Invoices",
                "description": "View invoice list and details",
                "required_feature": "invoicing",
                "is_available": true
            },
            {
                "id": "uuid",
                "code": "invoice:create",
                "name": "Create Invoices",
                "required_feature": "invoicing",
                "is_available": true
            }
        ],
        "expenses": [...],
        "banking": [...],
        "reports": [...],
        "inventory": [
            {
                "id": "uuid",
                "code": "inventory:view",
                "name": "View Inventory",
                "required_feature": "inventory",
                "is_available": false,
                "upgrade_message": "Upgrade to Premium to access inventory"
            }
        ],
        "settings": [...]
    }
}
```

#### 6.4.2 Get My Permissions

**Endpoint:** `GET /api/v1/auth/me/permissions`
**Permission:** Authenticated

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "user": {
            "id": "uuid",
            "email": "john@mutetaxes.com",
            "role": {
                "code": "standard",
                "name": "Standard User"
            },
            "is_primary_admin": false
        },
        "permissions": [
            "invoice:view",
            "invoice:create",
            "invoice:edit",
            "expense:view",
            "expense:create"
        ],
        "features_available": [
            "invoicing",
            "expenses",
            "basic_reports",
            "time_tracking"
        ],
        "features_locked": [
            {
                "code": "inventory",
                "name": "Inventory Management",
                "required_plan": "premium",
                "upgrade_url": "/settings/billing/upgrade"
            }
        ]
    }
}
```

### 6.5 Company & Subscription Endpoints

#### 6.5.1 Get Company Profile

**Endpoint:** `GET /api/v1/company`
**Permission:** Authenticated

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "id": "uuid",
        "name": "MuteTaxes LLC",
        "legal_name": "MuteTaxes Limited Liability Company",
        "tax_id": "12-3456789",
        "email": "info@mutetaxes.com",
        "phone": "+1-555-123-4567",
        "address": {
            "line1": "123 Main Street",
            "city": "New York",
            "state": "NY",
            "postal_code": "10001",
            "country": "US"
        },
        "fiscal_year_end": "12-31",
        "default_currency": "USD",
        "books_closed_through": "2025-12-31",
        "subscription": {
            "plan_code": "premium",
            "plan_name": "Premium",
            "status": "active",
            "billing_cycle": "monthly",
            "current_users": 5,
            "max_users": 5,
            "next_billing_date": "2026-02-01",
            "features": [
                "invoicing",
                "expenses",
                "inventory",
                "projects",
                "advanced_reports"
            ]
        }
    }
}
```

#### 6.5.2 Update Company Settings

**Endpoint:** `PUT /api/v1/company`
**Permission:** `company:edit_settings`

**Request Body:**
```json
{
    "name": "MuteTaxes LLC",
    "email": "accounting@mutetaxes.com",
    "phone": "+1-555-987-6543",
    "fiscal_year_end": "12-31",
    "default_currency": "USD"
}
```

#### 6.5.3 Get Subscription Details

**Endpoint:** `GET /api/v1/company/subscription`
**Permission:** Authenticated

**Response (200 OK):**
```json
{
    "success": true,
    "data": {
        "current_plan": {
            "code": "premium",
            "name": "Premium",
            "monthly_price": 55.00,
            "annual_price": 594.00,
            "billing_cycle": "monthly",
            "status": "active"
        },
        "usage": {
            "current_users": 5,
            "max_users": 5,
            "can_add_users": false
        },
        "features": [
            {
                "code": "invoicing",
                "name": "Invoicing",
                "is_enabled": true
            },
            {
                "code": "inventory",
                "name": "Inventory Management",
                "is_enabled": true
            },
            {
                "code": "multi_currency",
                "name": "Multi-Currency",
                "is_enabled": false,
                "available_in": "enterprise"
            }
        ],
        "billing": {
            "next_billing_date": "2026-02-01",
            "amount": 55.00,
            "payment_method": {
                "type": "card",
                "last4": "4242",
                "expires": "12/2027"
            }
        },
        "available_upgrades": [
            {
                "plan_code": "enterprise",
                "plan_name": "Enterprise",
                "monthly_price": 100.00,
                "additional_features": [
                    "multi_currency",
                    "advanced_inventory",
                    "workflow_automation",
                    "unlimited_users"
                ],
                "upgrade_url": "/settings/billing/upgrade/enterprise"
            }
        ]
    }
}
```

#### 6.5.4 Upgrade Subscription (Primary Admin Only)

**Endpoint:** `POST /api/v1/company/subscription/upgrade`
**Permission:** Primary Admin only

**Request Body:**
```json
{
    "plan_code": "enterprise",
    "billing_cycle": "annual"
}
```

---

## 7. Business Logic

### 7.1 Login Process

```pseudocode
FUNCTION login(email: String, password: String, device_info: DeviceInfo) -> AuthResult

    // 1. Find user by email
    user = UserRepository.find_by_email(email)
    IF user IS NULL THEN
        THROW AuthError("Invalid credentials")
    END IF

    // 2. Check account status
    IF NOT user.is_active THEN
        THROW AuthError("Account is deactivated")
    END IF

    IF user.locked_until IS NOT NULL AND user.locked_until > NOW() THEN
        THROW AuthError("Account locked. Try again later.")
    END IF

    // 3. Check company and subscription
    company = CompanyRepository.find(user.company_id)
    IF NOT company.is_active THEN
        THROW AuthError("Company is deactivated")
    END IF

    subscription = SubscriptionRepository.find_by_company(user.company_id)
    IF subscription.status NOT IN ['active', 'trial'] THEN
        THROW AuthError("Subscription inactive. Please contact billing.")
    END IF

    // 4. Verify password
    IF NOT bcrypt.compare(password, user.password_hash) THEN
        user.failed_login_attempts += 1
        IF user.failed_login_attempts >= 5 THEN
            user.locked_until = NOW() + 30 minutes
        END IF
        UserRepository.update(user)
        THROW AuthError("Invalid credentials")
    END IF

    // 5. Success - reset failed attempts
    user.failed_login_attempts = 0
    user.locked_until = NULL
    user.last_login_at = NOW()
    user.last_login_ip = device_info.ip
    UserRepository.update(user)

    // 6. Generate tokens
    access_token = JWT.sign({
        user_id: user.id,
        company_id: user.company_id,
        is_primary_admin: user.is_primary_admin
    }, SECRET, {expiresIn: '15m'})

    refresh_token = generate_uuid()
    RefreshTokenRepository.create({
        user_id: user.id,
        token_hash: hash(refresh_token),
        device_name: device_info.device_name,
        ip_address: device_info.ip,
        expires_at: NOW() + 7 days
    })

    // 7. Load permissions and features
    permissions = get_user_permissions(user)
    features = subscription.features

    RETURN {
        access_token: access_token,
        refresh_token: refresh_token,
        user: user,
        company: company,
        subscription: subscription,
        permissions: permissions
    }

END FUNCTION
```

### 7.2 Permission Check (QuickBooks Style)

```pseudocode
FUNCTION check_permission(user_id: UUID, required_permission: String) -> AccessResult

    // 1. Load user
    user = UserRepository.find(user_id)
    IF user IS NULL OR NOT user.is_active THEN
        RETURN {allowed: false, reason: 'USER_INACTIVE'}
    END IF

    // 2. Primary admin has full access
    IF user.is_primary_admin THEN
        RETURN {allowed: true, reason: 'PRIMARY_ADMIN'}
    END IF

    // 3. Load subscription
    subscription = SubscriptionRepository.find_by_company(user.company_id)
    IF subscription.status NOT IN ['active', 'trial'] THEN
        RETURN {
            allowed: false,
            reason: 'SUBSCRIPTION_INACTIVE',
            message: 'Your subscription is inactive. Please update billing.'
        }
    END IF

    // 4. Check if feature is included in subscription
    permission = PermissionRepository.find_by_code(required_permission)
    IF permission.required_feature IS NOT NULL THEN
        IF NOT subscription.features.includes(permission.required_feature) THEN
            // Feature not in plan
            required_plan = get_minimum_plan_for_feature(permission.required_feature)
            RETURN {
                allowed: false,
                reason: 'FEATURE_NOT_IN_PLAN',
                message: 'This feature requires {required_plan} plan',
                upgrade_url: '/settings/billing/upgrade',
                required_plan: required_plan
            }
        END IF
    END IF

    // 5. Check role permission
    role_permissions = get_role_permissions(user.role_id)
    IF role_permissions.includes(required_permission) THEN
        RETURN {allowed: true}
    END IF

    // 6. Permission denied
    RETURN {
        allowed: false,
        reason: 'NO_PERMISSION',
        message: 'You do not have permission to perform this action. Contact your administrator.'
    }

END FUNCTION
```

### 7.3 User Invitation Process

```pseudocode
FUNCTION invite_user(admin_user: User, email: String, role_id: UUID, message: String) -> Invitation

    // 1. Check admin has permission
    IF NOT has_permission(admin_user.id, 'user:invite') THEN
        THROW PermissionError("Insufficient permissions")
    END IF

    // 2. Check subscription limits
    subscription = SubscriptionRepository.find_by_company(admin_user.company_id)
    current_user_count = UserRepository.count_active(admin_user.company_id)
    
    IF current_user_count >= subscription.max_users THEN
        THROW BusinessError(
            "User limit reached. Upgrade to add more users.",
            error_code: "USER_LIMIT_REACHED"
        )
    END IF

    // 3. Check if email already exists
    existing = UserRepository.find_by_email_and_company(email, admin_user.company_id)
    IF existing IS NOT NULL THEN
        THROW BusinessError("User with this email already exists")
    END IF

    // 4. Check if role is available in current plan
    role = RoleRepository.find(role_id)
    IF role.required_plan IS NOT NULL THEN
        IF NOT meets_plan_requirement(subscription.plan_code, role.required_plan) THEN
            THROW BusinessError(
                "This role requires {role.required_plan} plan",
                error_code: "ROLE_REQUIRES_UPGRADE"
            )
        END IF
    END IF

    // 5. Create invitation
    invitation_token = generate_secure_token()
    invitation = InvitationRepository.create({
        company_id: admin_user.company_id,
        email: email,
        role_id: role_id,
        invitation_token: invitation_token,
        invited_by: admin_user.id,
        message: message,
        expires_at: NOW() + 7 days,
        status: 'pending'
    })

    // 6. Send invitation email
    EmailService.send_invitation({
        to: email,
        company_name: admin_user.company.name,
        inviter_name: admin_user.first_name + " " + admin_user.last_name,
        role_name: role.name,
        message: message,
        invitation_url: build_invitation_url(invitation_token)
    })

    RETURN invitation

END FUNCTION
```

### 7.4 Accept Invitation

```pseudocode
FUNCTION accept_invitation(token: String, password: String, user_info: UserInfo) -> AuthResult

    // 1. Find and validate invitation
    invitation = InvitationRepository.find_by_token(token)
    IF invitation IS NULL THEN
        THROW BusinessError("Invalid invitation token")
    END IF

    IF invitation.status != 'pending' THEN
        THROW BusinessError("Invitation has already been used")
    END IF

    IF invitation.expires_at < NOW() THEN
        THROW BusinessError("Invitation has expired")
    END IF

    // 2. Re-check subscription limits (in case they were reached after invitation)
    subscription = SubscriptionRepository.find_by_company(invitation.company_id)
    current_user_count = UserRepository.count_active(invitation.company_id)
    
    IF current_user_count >= subscription.max_users THEN
        THROW BusinessError("Company has reached user limit")
    END IF

    // 3. Create user
    BEGIN TRANSACTION
        password_hash = bcrypt.hash(password)
        
        user = UserRepository.create({
            company_id: invitation.company_id,
            email: invitation.email,
            password_hash: password_hash,
            first_name: user_info.first_name,
            last_name: user_info.last_name,
            phone: user_info.phone,
            role_id: invitation.role_id,
            is_primary_admin: false,
            is_active: true,
            email_verified_at: NOW(),
            invitation_accepted_at: NOW()
        })

        // Mark invitation as accepted
        InvitationRepository.update(invitation.id, {
            status: 'accepted',
            accepted_at: NOW()
        })
    COMMIT

    // 4. Generate tokens and return (like login)
    RETURN login(user.email, password, device_info)

END FUNCTION
```

### 7.5 Get User Permissions

```pseudocode
FUNCTION get_user_permissions(user: User) -> List<String>

    // Primary admin gets everything
    IF user.is_primary_admin THEN
        RETURN ['*:*']  // Wildcard = all permissions
    END IF

    // Check cache
    cache_key = "permissions:user:" + user.id
    cached = Cache.get(cache_key)
    IF cached IS NOT NULL THEN
        RETURN cached
    END IF

    // Load from database
    permissions = SQL """
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = $1
        ORDER BY p.code
    """ [user.role_id]

    // Cache for 5 minutes
    Cache.set(cache_key, permissions, TTL: 300)

    RETURN permissions

END FUNCTION
```

---

## 8. Validation Rules

### 8.1 User Validations

| Field | Rules | Error Message |
|-------|-------|---------------|
| `email` | Required, valid format, unique per company | Invalid email address |
| `password` | Min 8 chars, 1 uppercase, 1 lowercase, 1 number | Password must be at least 8 characters with uppercase, lowercase, and number |
| `first_name` | Required, max 100 chars | First name is required |
| `last_name` | Max 100 chars | Last name too long |
| `phone` | Valid format (optional) | Invalid phone number |

### 8.2 Password Policy

```
Minimum requirements:
- At least 8 characters
- At least 1 uppercase letter (A-Z)
- At least 1 lowercase letter (a-z)
- At least 1 number (0-9)
- Special characters recommended but not required

Regex: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$

Prohibited passwords:
- Common passwords (password123, qwerty, etc.)
- Company name
- User's name
```

### 8.3 Role Validations

| Rule | Error Message |
|------|---------------|
| Cannot delete system roles | System roles cannot be deleted |
| Cannot delete role with active users | Remove users from this role before deleting |
| Custom roles require Premium+ | Upgrade to Premium to create custom roles |
| Max 5 custom roles per company | Custom role limit reached |

### 8.4 Subscription Validations

| Rule | Error Message |
|------|---------------|
| Cannot exceed max users | User limit reached for {plan} plan. Upgrade to add more users. |
| Cannot use features not in plan | This feature requires {plan} plan. Upgrade to access. |
| Primary admin required | Company must have at least one primary administrator |

---

## 9. Edge Cases

### 9.1 User Deactivation

**Scenario:** Admin deactivates a user who is currently logged in

**Behavior:**
- User's refresh tokens are revoked
- Next API call with access token will fail (check user.is_active)
- Permission cache is cleared
- User sees "Account deactivated" message

```pseudocode
FUNCTION deactivate_user(user_id: UUID, admin_user: User)

    user = UserRepository.find(user_id)

    // Cannot deactivate yourself
    IF user_id == admin_user.id THEN
        THROW BusinessError("You cannot deactivate yourself")
    END IF

    // Cannot deactivate primary admin
    IF user.is_primary_admin THEN
        THROW BusinessError("Cannot deactivate primary admin. Transfer ownership first.")
    END IF

    // Cannot deactivate last admin
    IF user.role_id IN admin_roles THEN
        admin_count = UserRepository.count_admins(user.company_id, exclude: user_id)
        IF admin_count == 0 THEN
            THROW BusinessError("Cannot deactivate the last administrator")
        END IF
    END IF

    BEGIN TRANSACTION
        // Deactivate user
        UserRepository.update(user_id, {is_active: false})

        // Revoke all sessions
        RefreshTokenRepository.revoke_all(user_id)

        // Clear cache
        Cache.delete("permissions:user:" + user_id)

        // Audit log
        AuditLog.record({
            action: "USER_DEACTIVATED",
            user_id: admin_user.id,
            target_user_id: user_id
        })
    COMMIT

END FUNCTION
```

### 9.2 Subscription Downgrade with Active Users

**Scenario:** Company downgrades from Premium (5 users) to Standard (3 users) but has 5 active users

**Behavior:**
- Downgrade is blocked
- Admin must deactivate users first
- System suggests which users to deactivate (least active)

```pseudocode
FUNCTION downgrade_subscription(company_id: UUID, new_plan: String)

    current_users = UserRepository.count_active(company_id)
    new_plan_max = get_plan_max_users(new_plan)

    IF current_users > new_plan_max THEN
        excess = current_users - new_plan_max
        least_active = UserRepository.find_least_active(company_id, limit: excess)
        
        THROW BusinessError(
            "You have {current_users} users but {new_plan} allows only {new_plan_max}. " +
            "Please deactivate {excess} users before downgrading.",
            suggested_users: least_active
        )
    END IF

    // Proceed with downgrade...
    
END FUNCTION
```

### 9.3 Role Change with Active Session

**Scenario:** Admin changes a user's role while they're logged in

**Behavior:**
- Permission cache is cleared immediately
- User's next API call will load new permissions
- No need to re-login (access token still valid)

```pseudocode
FUNCTION change_user_role(user_id: UUID, new_role_id: UUID)

    // Update role
    UserRepository.update(user_id, {role_id: new_role_id})

    // Clear permission cache
    Cache.delete("permissions:user:" + user_id)

    // Log change
    AuditLog.record({
        action: "USER_ROLE_CHANGED",
        user_id: user_id,
        old_role_id: old_role_id,
        new_role_id: new_role_id
    })

    // Next API call will load new permissions automatically

END FUNCTION
```

### 9.4 Subscription Expired

**Scenario:** Company's subscription expires or payment fails

**Behavior:**
- Read-only mode: Users can view data but cannot create/edit
- Banner shown: "Subscription inactive. Update payment method."
- Primary admin can access billing settings

```pseudocode
FUNCTION check_subscription_status(company_id: UUID) -> SubscriptionStatus

    subscription = SubscriptionRepository.find_by_company(company_id)

    IF subscription.status == 'suspended' THEN
        // Payment failed, grace period
        RETURN {
            status: 'read_only',
            message: 'Payment failed. Update payment method within 7 days.',
            allowed_actions: ['read', 'export'],
            billing_url: '/settings/billing'
        }
    END IF

    IF subscription.status == 'cancelled' THEN
        // Subscription cancelled
        RETURN {
            status: 'read_only',
            message: 'Subscription cancelled. Reactivate to continue.',
            allowed_actions: ['read', 'export'],
            reactivate_url: '/settings/billing/reactivate'
        }
    END IF

    RETURN {status: 'active'}

END FUNCTION
```

### 9.5 Invitation Token Expiry

**Scenario:** User tries to accept invitation after 7 days

**Behavior:**
- Show "Invitation expired" message
- Provide "Request new invitation" button
- Admin can resend invitation

---

## 10. Related Modules

### 10.1 Integration Points

| Module | Integration | Description |
|--------|-------------|-------------|
| [Company](../company/COMPANY_MODULE.md) | `company_id` FK | Users belong to company |
| [Subscription](../subscription/SUBSCRIPTION_MODULE.md) | Feature access | Controls available features |
| [Invoice](../invoice/INVOICE_MODULE.md) | `created_by`, `approved_by` | User tracking |
| [Expense](../expense/EXPENSE_MODULE.md) | `created_by`, `approved_by` | User tracking |
| [Audit Log](../audit-log/AUDIT_LOG_MODULE.md) | `user_id` | Action tracking |
| All modules | Permission middleware | Access control |

### 10.2 JWT Token Structure

```json
{
    "header": {
        "alg": "HS256",
        "typ": "JWT"
    },
    "payload": {
        "user_id": "550e8400-e29b-41d4-a716-446655440000",
        "company_id": "660f9500-f39c-52e5-b827-557766551111",
        "is_primary_admin": false,
        "iat": 1738053600,
        "exp": 1738054500
    }
}
```

### 10.3 Permission Middleware Example

```javascript
// Express.js middleware
function requirePermission(permission) {
    return async (req, res, next) => {
        try {
            const user = req.user; // Set by auth middleware
            
            const result = await checkPermission(user.id, permission);
            
            if (!result.allowed) {
                return res.status(403).json({
                    error: result.reason,
                    message: result.message,
                    upgrade_url: result.upgrade_url,
                    required_plan: result.required_plan
                });
            }
            
            next();
        } catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };
}

// Usage
app.post('/api/invoices', 
    authenticate,
    requirePermission('invoice:create'),
    createInvoice
);
```

---

## Appendix A: QuickBooks Feature Comparison

### A.1 Role Comparison with QuickBooks

| QuickBooks Role | Our Equivalent | Notes |
|-----------------|----------------|-------|
| Primary Admin | Primary Admin (`is_primary_admin`) | Full access + billing |
| Company Admin | Company Admin | Full access except billing |
| Standard User | Standard User | Most operations |
| Custom User | Custom Role (Premium+) | User-defined permissions |
| Reports Only | Reports Only | View-only access |
| Time Tracking Only | Time Tracking Only | Time entry only |

### A.2 Subscription Tiers Comparison

| QuickBooks Plan | Our Equivalent | Price | Users | Key Features |
|-----------------|----------------|-------|-------|--------------|
| Simple Start | Starter | $15/mo | 1 | Basic invoicing & expenses |
| Essentials | Standard | $30/mo | 3 | + Bills, time tracking |
| Plus | Premium | $55/mo | 5 | + Inventory, projects, custom roles |
| Advanced | Enterprise | $100/mo | Unlimited | + Multi-currency, automation |

### A.3 Key Differences from QuickBooks

| Feature | QuickBooks | Our System |
|---------|------------|------------|
| **Multi-company** | Accountant edition only | Single company per account |
| **Custom roles** | Available in all paid plans | Premium+ only (by design) |
| **User limits** | Hard limits enforced | Hard limits enforced |
| **Billing management** | Primary admin only | Primary admin only |
| **Role granularity** | Less granular | More granular permissions |
| **Feature access** | Plan-based | Plan-based (same) |

---

## Appendix B: Security Best Practices

### B.1 Password Security
- Bcrypt with cost factor 12+
- Never store plain text passwords
- Never log passwords
- Enforce password complexity
- Optional 2FA (future enhancement)

### B.2 Token Security
- Access tokens: 15 minutes (short-lived)
- Refresh tokens: 7 days (stored hashed)
- Rotate refresh tokens on use
- Revoke on logout
- Device tracking

### B.3 Rate Limiting
- Login: 5 attempts per 15 minutes per IP
- API: 100 requests per minute per user
- Invitation: 10 per hour per company

### B.4 Audit Trail
- Log all user management actions
- Log all permission changes
- Log all subscription changes
- Log failed login attempts
- Log role assignments

---

## Appendix C: Migration Notes

### C.1 From Previous System

If migrating from the multi-tenant platform admin system:

1. **Remove platform admin concept:**
   - `is_platform_admin` becomes legacy field
   - Each organization becomes independent company

2. **Convert organization modules to subscriptions:**
   - Map organization_modules to subscription plans
   - Migrate to tiered pricing model

3. **Simplify roles:**
   - Map complex custom roles to predefined roles
   - Premium companies keep custom roles

4. **User migration:**
   - Users stay with their company
   - Roles mapped to new system
   - Primary admin designated

### C.2 Data Cleanup

```sql
-- Remove multi-tenant references
DROP TABLE IF EXISTS organization_modules;
DROP TABLE IF EXISTS access_requests;

-- Add subscription table (already defined above)
-- Migrate existing organizations to subscription plans based on their module access
```

---

**Document End**
