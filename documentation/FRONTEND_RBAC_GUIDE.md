# Frontend RBAC Guide - Role-Based User Invitations

## 🎯 Overview

This guide shows you how to:
1. Fetch available roles from backend
2. Display role selection in invitation form
3. Send invitations with different roles
4. Show/hide UI elements based on user permissions

---

## 🔑 Available Roles in System

Your backend has 5 predefined roles (from Day 2 seed data):

| Role Code | Role Name | Description | Permissions |
|-----------|-----------|-------------|-------------|
| `company_admin` | Company Administrator | Full access except billing | All 47 permissions |
| `standard` | Standard User | Most operations | 35 permissions |
| `limited` | Limited User | Invoices & expenses only | 20 permissions |
| `reports_only` | Reports Only | View reports only | 4 permissions |
| `time_tracking_only` | Time Tracking Only | Time entry only | 4 permissions |

---

## Step 1: Create Roles API Service

First, we need to fetch roles from the backend. Let's add a roles endpoint to your API service.

**File: `src/services/roles.api.ts`**

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  requiredPlan: string | null;
  displayOrder: number;
}

export const rolesApi = {
  /**
   * Get all available roles
   * This will be implemented in Day 4, but for now we'll create it
   */
  async getAllRoles(token: string): Promise<Role[]> {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch roles');
    }

    const data = await response.json();
    return data.data;
  },

  /**
   * Temporary: Hardcoded roles until Day 4 roles endpoint is ready
   */
  getHardcodedRoles(): Role[] {
    return [
      {
        id: 'e1218957-7f4b-4d49-a2d5-465695a10803',
        code: 'company_admin',
        name: 'Company Administrator',
        description: 'Full access except billing. Can manage users and company settings.',
        isSystemRole: true,
        requiredPlan: null,
        displayOrder: 1,
      },
      {
        id: 'f2329068-8g5c-5e5a-b3e6-576806b21914',
        code: 'standard',
        name: 'Standard User',
        description: 'Can perform most operations including sales, expenses, and reporting.',
        isSystemRole: true,
        requiredPlan: null,
        displayOrder: 2,
      },
      {
        id: 'g3439179-9h6d-6f6b-c4f7-687917c32a25',
        code: 'limited',
        name: 'Limited User',
        description: 'Can only manage invoices and expenses.',
        isSystemRole: true,
        requiredPlan: null,
        displayOrder: 3,
      },
      {
        id: 'h454a28a-ai7e-7g7c-d5g8-798a28d43b36',
        code: 'reports_only',
        name: 'Reports Only',
        description: 'Can only view and export reports.',
        isSystemRole: true,
        requiredPlan: null,
        displayOrder: 4,
      },
      {
        id: 'i565b39b-bj8f-8h8d-e6h9-8a9b39e54c47',
        code: 'time_tracking_only',
        name: 'Time Tracking Only',
        description: 'Can only create and manage time entries.',
        isSystemRole: true,
        requiredPlan: null,
        displayOrder: 5,
      },
    ];
  },
};
```

**Note:** The first role ID (`e1218957-7f4b-4d49-a2d5-465695a10803`) is the real ID from your database. The others are placeholders - we'll get the real IDs when we implement the roles endpoint in Day 4.

---

## Step 2: Get Real Role IDs from Database

For now, let's get the real role IDs from your database:

**Quick Script to Get Role IDs:**

```bash
# Run this in your backend terminal
curl http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1769769052@test.com","password":"Pass1234"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4

# Then use this token to check if roles endpoint exists
# (It will be created in Day 4, but the IDs are in the database from Day 2 seed)
```

---

## Step 3: Invite User Form with Role Selection

**File: `src/pages/Users/InviteUser.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { usersApi } from '../../services/users.api';
import { rolesApi, Role } from '../../services/roles.api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const InviteUser: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    message: '',
  });

  // Roles state
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load roles on component mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      // Use hardcoded roles for now (Day 4 will have API endpoint)
      const rolesData = rolesApi.getHardcodedRoles();
      setRoles(rolesData);

      // Pre-select first role (company_admin)
      if (rolesData.length > 0) {
        setFormData(prev => ({ ...prev, roleId: rolesData[0].id }));
      }
    } catch (err: any) {
      console.error('Failed to load roles:', err);
      setError('Failed to load roles');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.roleId) {
      setError('Please select a role');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await usersApi.inviteUser(formData, token!);

      alert(`User invited successfully! Invitation sent to ${formData.email}`);
      navigate('/users');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = roles.find(r => r.id === formData.roleId);

  return (
    <div className="invite-user-page">
      <h1>Invite New Team Member</h1>

      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="invite-form">
        {/* Email */}
        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@company.com"
          />
        </div>

        {/* First Name */}
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            id="firstName"
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="John"
          />
        </div>

        {/* Last Name */}
        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            id="lastName"
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
          />
        </div>

        {/* Role Selection - THIS IS THE KEY PART */}
        <div className="form-group">
          <label htmlFor="roleId">Role *</label>
          <select
            id="roleId"
            required
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
          >
            <option value="">Select a role...</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          {/* Show role description */}
          {selectedRole && (
            <div className="role-description" style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              <strong>{selectedRole.name}</strong>
              <p style={{ margin: '0.5rem 0 0 0', color: '#666' }}>
                {selectedRole.description}
              </p>
            </div>
          )}
        </div>

        {/* Optional Welcome Message */}
        <div className="form-group">
          <label htmlFor="message">Welcome Message (Optional)</label>
          <textarea
            id="message"
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Welcome to our team! We're excited to have you."
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/users')}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ marginLeft: '1rem' }}
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
        </div>
      </form>

      {/* Role Permissions Preview */}
      <div className="role-permissions-info" style={{ marginTop: '2rem' }}>
        <h3>Role Permissions Guide</h3>
        <div className="roles-grid">
          {roles.map((role) => (
            <div
              key={role.id}
              className="role-card"
              style={{
                border: '1px solid #ddd',
                padding: '1rem',
                marginBottom: '1rem',
                borderRadius: '8px'
              }}
            >
              <h4>{role.name}</h4>
              <p style={{ color: '#666', fontSize: '0.875rem' }}>
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

---

## Step 4: Example - Inviting Different Users with Different Roles

### Example 1: Invite Accountant (Standard Role)

```typescript
const inviteAccountant = async () => {
  await usersApi.inviteUser({
    email: 'accountant@company.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    roleId: 'f2329068-8g5c-5e5a-b3e6-576806b21914', // Standard role
    message: 'Welcome! You will handle our accounting.'
  }, token);
};
```

### Example 2: Invite Sales Person (Limited Role)

```typescript
const inviteSales = async () => {
  await usersApi.inviteUser({
    email: 'sales@company.com',
    firstName: 'Mike',
    lastName: 'Davis',
    roleId: 'g3439179-9h6d-6f6b-c4f7-687917c32a25', // Limited role
    message: 'Welcome! You can create invoices and track expenses.'
  }, token);
};
```

### Example 3: Invite Manager (Company Admin)

```typescript
const inviteManager = async () => {
  await usersApi.inviteUser({
    email: 'manager@company.com',
    firstName: 'Emily',
    lastName: 'Brown',
    roleId: 'e1218957-7f4b-4d49-a2d5-465695a10803', // Company admin
    message: 'Welcome! You have full administrative access.'
  }, token);
};
```

---

## Step 5: Show/Hide UI Based on Permissions

**File: `src/hooks/usePermissions.ts`**

```typescript
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();
  const permissions = user?.permissions || [];

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(p => permissions.includes(p));
  };

  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(p => permissions.includes(p));
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
```

**Usage Example:**

```typescript
import { usePermissions } from '../../hooks/usePermissions';

export const DashboardPage = () => {
  const { hasPermission } = usePermissions();

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Show "Invite User" button only if user has permission */}
      {hasPermission('user:invite') && (
        <button onClick={() => navigate('/users/invite')}>
          Invite User
        </button>
      )}

      {/* Show "Create Invoice" only if user has permission */}
      {hasPermission('invoice:create') && (
        <button onClick={() => navigate('/invoices/new')}>
          Create Invoice
        </button>
      )}

      {/* Show "View Reports" only if user has permission */}
      {hasPermission('report:view_basic') && (
        <button onClick={() => navigate('/reports')}>
          View Reports
        </button>
      )}
    </div>
  );
};
```

---

## Step 6: Protected Component Wrapper

**File: `src/components/ProtectedContent.tsx`**

```typescript
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedContentProps {
  requiredPermission: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const ProtectedContent: React.FC<ProtectedContentProps> = ({
  requiredPermission,
  fallback = null,
  children,
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(requiredPermission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

**Usage:**

```typescript
import { ProtectedContent } from '../../components/ProtectedContent';

export const UsersPage = () => {
  return (
    <div>
      <h1>Team Members</h1>

      {/* Only show invite button if user has permission */}
      <ProtectedContent requiredPermission="user:invite">
        <button onClick={() => navigate('/users/invite')}>
          Invite User
        </button>
      </ProtectedContent>

      {/* User list visible to all with user:view permission */}
      <ProtectedContent
        requiredPermission="user:view"
        fallback={<p>You don't have permission to view users</p>}
      >
        <UsersList />
      </ProtectedContent>
    </div>
  );
};
```

---

## 🔐 Permission Codes Reference

### Sales Permissions
- `customer:view` - View customers
- `customer:create` - Create customers
- `customer:edit` - Edit customers
- `customer:delete` - Delete customers
- `invoice:view` - View invoices
- `invoice:create` - Create invoices
- `invoice:edit` - Edit invoices
- `invoice:delete` - Delete invoices
- `invoice:send` - Send invoices
- `invoice:void` - Void invoices

### Expense Permissions
- `vendor:view` - View vendors
- `vendor:create` - Create vendors
- `vendor:edit` - Edit vendors
- `vendor:delete` - Delete vendors
- `expense:view` - View expenses
- `expense:create` - Create expenses
- `expense:edit` - Edit expenses
- `expense:delete` - Delete expenses
- `bill:view` - View bills
- `bill:create` - Create bills
- `bill:edit` - Edit bills
- `bill:pay` - Pay bills

### Banking Permissions
- `bank_account:view` - View bank accounts
- `bank_account:reconcile` - Reconcile bank accounts
- `bank_transaction:categorize` - Categorize transactions

### Reports Permissions
- `report:view_basic` - View basic reports
- `report:view_advanced` - View advanced reports
- `report:export` - Export reports
- `report:customize` - Customize reports

### Settings Permissions
- `company:view_settings` - View company settings
- `company:edit_settings` - Edit company settings
- `user:view` - View users
- `user:invite` - Invite users
- `user:edit` - Edit users
- `user:delete` - Delete users
- `books:close` - Close books

### Inventory Permissions
- `inventory:view` - View inventory
- `inventory:create` - Create inventory items
- `inventory:edit` - Edit inventory
- `inventory:adjust` - Adjust inventory

### Time Tracking Permissions
- `time:view` - View time entries
- `time:create` - Create time entries
- `time:edit` - Edit time entries
- `time:approve` - Approve time entries

### Project Permissions
- `project:view` - View projects
- `project:create` - Create projects
- `project:edit` - Edit projects

---

## 📊 Role Permissions Matrix

| Permission | Company Admin | Standard | Limited | Reports Only | Time Only |
|------------|---------------|----------|---------|--------------|-----------|
| All Sales | ✅ | ✅ | ✅ | ❌ | ❌ |
| All Expenses | ✅ | ✅ | ✅ | ❌ | ❌ |
| Banking | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ✅ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company Settings | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ✅ | ❌ | ❌ | ❌ |
| Time Tracking | ✅ | ✅ | ❌ | ❌ | ✅ |
| Projects | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 🧪 Testing Different Roles

### Test 1: Invite User as Company Admin
```bash
curl -X POST 'http://localhost:3000/api/v1/users/invite' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin2@company.com",
    "firstName": "Jane",
    "lastName": "Admin",
    "roleId": "e1218957-7f4b-4d49-a2d5-465695a10803",
    "message": "You are now a company admin!"
  }'
```

### Test 2: Invite User as Standard User
```bash
curl -X POST 'http://localhost:3000/api/v1/users/invite' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@company.com",
    "firstName": "John",
    "lastName": "User",
    "roleId": "STANDARD_ROLE_ID_HERE",
    "message": "Welcome as a standard user!"
  }'
```

---

## 💡 Best Practices

1. **Always validate roleId on backend** - Frontend can be manipulated
2. **Load roles from API** - Don't hardcode in production
3. **Show role descriptions** - Help users understand what each role means
4. **Implement permission checks** - Hide features users can't access
5. **Handle permission errors gracefully** - Show friendly messages
6. **Log permission denials** - For security monitoring
7. **Update permissions on role change** - Re-fetch user data when role changes

---

## 🚀 Next Steps (Day 4)

1. Create `GET /api/v1/roles` endpoint to fetch roles dynamically
2. Implement permission guard on backend
3. Add role change functionality
4. Create custom role creation (advanced)

---

## 📞 Quick Reference

**Invite User API:**
```
POST /api/v1/users/invite
Body: { email, firstName, lastName, roleId, message? }
```

**Company Admin Role ID:**
```
e1218957-7f4b-4d49-a2d5-465695a10803
```

**Example Frontend Code:**
```typescript
// Invite with company_admin role
await usersApi.inviteUser({
  email: 'admin@company.com',
  firstName: 'Admin',
  lastName: 'User',
  roleId: 'e1218957-7f4b-4d49-a2d5-465695a10803'
}, token);
```

---

**Happy Coding!** 🚀
