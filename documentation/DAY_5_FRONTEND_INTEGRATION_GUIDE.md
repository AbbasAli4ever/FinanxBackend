# Day 5: Permission Guards & Enforcement - Frontend Integration Guide

## Overview

Day 5 implements **permission enforcement** on all API endpoints. Now users can only access features they're authorized for based on their role's permissions.

## What Changed

### New Endpoint
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/auth/my-permissions` | Get current user's permissions | Yes |

### Protected Endpoints

All user and role management endpoints now require specific permissions:

#### User Management Endpoints
| Endpoint | Required Permission |
|----------|-------------------|
| GET `/api/v1/users` | `user:view` |
| GET `/api/v1/users/:id` | `user:view` |
| POST `/api/v1/users/invite` | `user:invite` |
| GET `/api/v1/users/invitations/pending` | `user:view` |
| PATCH `/api/v1/users/invitations/:id/cancel` | `user:delete` |
| PATCH `/api/v1/users/:id` | `user:edit` |
| PATCH `/api/v1/users/:id/deactivate` | `user:delete` |
| PATCH `/api/v1/users/:id/reactivate` | `user:edit` |
| POST `/api/v1/users/me/change-password` | No permission (own password) |

#### Role Management Endpoints
| Endpoint | Required Permission |
|----------|-------------------|
| GET `/api/v1/roles` | `company:edit_settings` |
| GET `/api/v1/roles/:id` | `company:edit_settings` |
| POST `/api/v1/roles` | `company:edit_settings` |
| PATCH `/api/v1/roles/:id` | `company:edit_settings` |
| DELETE `/api/v1/roles/:id` | `company:edit_settings` |
| GET `/api/v1/roles/permissions/all` | `company:edit_settings` |

---

## API Reference

### Get My Permissions

Retrieve the authenticated user's permissions.

**Request:**
```http
GET /api/v1/auth/my-permissions
Authorization: Bearer <access_token>
```

**Response (Primary Admin):**
```json
{
  "success": true,
  "message": "Permissions retrieved successfully",
  "data": {
    "permissions": [
      "customer:view", "customer:create", "customer:edit", "customer:delete",
      "invoice:view", "invoice:create", "invoice:edit", "invoice:delete",
      "user:view", "user:invite", "user:edit", "user:delete",
      "company:view_settings", "company:edit_settings",
      // ... all 47 permissions
    ],
    "isPrimaryAdmin": true,
    "role": null
  }
}
```

**Response (Regular User):**
```json
{
  "success": true,
  "message": "Permissions retrieved successfully",
  "data": {
    "permissions": [
      "customer:view", "invoice:view", "invoice:create",
      "expense:view", "expense:create", "report:view_basic"
    ],
    "isPrimaryAdmin": false,
    "role": {
      "id": "944b59e9-69e0-47f2-81d5-82f5d9218283",
      "code": "limited",
      "name": "Limited User"
    }
  }
}
```

### Error Response (403 Forbidden)

When a user lacks permission:

```json
{
  "statusCode": 403,
  "message": "You do not have permission to access this resource. Required: user:view",
  "error": "Forbidden"
}
```

---

## TypeScript Types

```typescript
// Permission response type
interface MyPermissionsResponse {
  permissions: string[];
  isPrimaryAdmin: boolean;
  role: {
    id: string;
    code: string;
    name: string;
  } | null;
}

// API response wrapper
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// Permission codes (all 47)
type PermissionCode =
  // Sales
  | 'customer:view' | 'customer:create' | 'customer:edit' | 'customer:delete'
  | 'invoice:view' | 'invoice:create' | 'invoice:edit' | 'invoice:delete' | 'invoice:send' | 'invoice:void'
  // Expenses
  | 'vendor:view' | 'vendor:create' | 'vendor:edit' | 'vendor:delete'
  | 'expense:view' | 'expense:create' | 'expense:edit' | 'expense:delete'
  | 'bill:view' | 'bill:create' | 'bill:edit' | 'bill:pay'
  // Banking
  | 'bank_account:view' | 'bank_account:reconcile' | 'bank_transaction:categorize'
  // Reports
  | 'report:view_basic' | 'report:view_advanced' | 'report:export' | 'report:customize'
  // Settings
  | 'company:view_settings' | 'company:edit_settings'
  | 'user:view' | 'user:invite' | 'user:edit' | 'user:delete'
  | 'books:close'
  // Inventory
  | 'inventory:view' | 'inventory:create' | 'inventory:edit' | 'inventory:adjust'
  // Time Tracking
  | 'time:view' | 'time:create' | 'time:edit' | 'time:approve'
  // Projects
  | 'project:view' | 'project:create' | 'project:edit';
```

---

## React Integration

### 1. Create Permissions Context

```typescript
// src/contexts/PermissionsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

interface PermissionsContextType {
  permissions: string[];
  isPrimaryAdmin: boolean;
  role: { id: string; code: string; name: string } | null;
  loading: boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [role, setRole] = useState<{ id: string; code: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authApi.getMyPermissions();
      setPermissions(response.data.permissions);
      setIsPrimaryAdmin(response.data.isPrimaryAdmin);
      setRole(response.data.role);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setPermissions([]);
      setIsPrimaryAdmin(false);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((permission: string): boolean => {
    if (isPrimaryAdmin) return true;
    return permissions.includes(permission);
  }, [permissions, isPrimaryAdmin]);

  const hasAnyPermission = useCallback((perms: string[]): boolean => {
    if (isPrimaryAdmin) return true;
    return perms.some(p => permissions.includes(p));
  }, [permissions, isPrimaryAdmin]);

  const hasAllPermissions = useCallback((perms: string[]): boolean => {
    if (isPrimaryAdmin) return true;
    return perms.every(p => permissions.includes(p));
  }, [permissions, isPrimaryAdmin]);

  return (
    <PermissionsContext.Provider value={{
      permissions,
      isPrimaryAdmin,
      role,
      loading,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      refreshPermissions: fetchPermissions,
    }}>
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
};
```

### 2. Create Protected Components

```typescript
// src/components/ProtectedContent.tsx
import React from 'react';
import { usePermissions } from '../contexts/PermissionsContext';

interface ProtectedContentProps {
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedContent: React.FC<ProtectedContentProps> = ({
  permission,
  anyOf,
  allOf,
  children,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions();

  if (loading) return null;

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyOf) {
    hasAccess = hasAnyPermission(anyOf);
  } else if (allOf) {
    hasAccess = hasAllPermissions(allOf);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
```

### 3. Create Permission-Gated Route

```typescript
// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';

interface ProtectedRouteProps {
  permission?: string;
  anyOf?: string[];
  children: React.ReactNode;
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  permission,
  anyOf,
  children,
  redirectTo = '/dashboard',
}) => {
  const { hasPermission, hasAnyPermission, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyOf) {
    hasAccess = hasAnyPermission(anyOf);
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
};
```

### 4. API Service Updates

```typescript
// src/services/authApi.ts
import axios from './axiosInstance';

export const authApi = {
  // ... existing methods

  getMyPermissions: async () => {
    const response = await axios.get('/auth/my-permissions');
    return response.data;
  },
};
```

### 5. Usage Examples

#### Hide UI Elements Based on Permission

```tsx
import { ProtectedContent } from '../components/ProtectedContent';

const UserManagement: React.FC = () => {
  return (
    <div>
      <h1>Users</h1>

      {/* Only show invite button if user has permission */}
      <ProtectedContent permission="user:invite">
        <button onClick={() => openInviteModal()}>
          Invite User
        </button>
      </ProtectedContent>

      {/* Show user list (requires user:view) */}
      <ProtectedContent permission="user:view">
        <UsersList />
      </ProtectedContent>

      {/* Show deactivate button only with user:delete */}
      <ProtectedContent permission="user:delete">
        <button onClick={() => deactivateUser(userId)}>
          Deactivate
        </button>
      </ProtectedContent>
    </div>
  );
};
```

#### Protect Routes

```tsx
import { ProtectedRoute } from '../components/ProtectedRoute';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Protect user management pages */}
      <Route
        path="/users"
        element={
          <ProtectedRoute permission="user:view">
            <UsersPage />
          </ProtectedRoute>
        }
      />

      {/* Protect settings pages */}
      <Route
        path="/settings/roles"
        element={
          <ProtectedRoute permission="company:edit_settings">
            <RolesPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};
```

#### Use Hook Directly

```tsx
import { usePermissions } from '../contexts/PermissionsContext';

const SomeComponent: React.FC = () => {
  const { hasPermission, isPrimaryAdmin, role } = usePermissions();

  const canEditUsers = hasPermission('user:edit');
  const canManageRoles = hasPermission('company:edit_settings');

  return (
    <div>
      {isPrimaryAdmin && <Badge>Primary Admin</Badge>}
      {role && <span>Role: {role.name}</span>}

      {canEditUsers && <EditUserForm />}
      {canManageRoles && <RoleManager />}
    </div>
  );
};
```

---

## Handling 403 Errors

Add global error handling for permission denied:

```typescript
// src/services/axiosInstance.ts
import axios from 'axios';

const instance = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      // Option 1: Show notification
      toast.error('You do not have permission to perform this action');

      // Option 2: Redirect to dashboard
      // window.location.href = '/dashboard';

      // Option 3: Show permission denied modal
      // showPermissionDeniedModal(error.response.data.message);
    }
    return Promise.reject(error);
  }
);

export default instance;
```

---

## Best Practices

### 1. Always Check Permissions Client-Side AND Server-Side

The server always enforces permissions - frontend checks are for UX only:

```tsx
// Good: Hide button but server still checks
<ProtectedContent permission="user:delete">
  <DeleteButton onClick={handleDelete} />
</ProtectedContent>

// The API will return 403 if someone bypasses the UI
```

### 2. Refresh Permissions After Role Changes

```tsx
const { refreshPermissions } = usePermissions();

const handleRoleUpdate = async () => {
  await usersApi.updateUser(userId, { roleId: newRoleId });
  // Refresh permissions if current user's role changed
  if (userId === currentUserId) {
    await refreshPermissions();
  }
};
```

### 3. Show Appropriate Feedback

```tsx
<ProtectedContent
  permission="reports:view_advanced"
  fallback={
    <div className="upgrade-prompt">
      <p>Advanced reports require a higher role.</p>
      <p>Contact your administrator for access.</p>
    </div>
  }
>
  <AdvancedReports />
</ProtectedContent>
```

### 4. Cache Permissions in Session Storage

```typescript
// Persist permissions across page refreshes
useEffect(() => {
  const cached = sessionStorage.getItem('userPermissions');
  if (cached) {
    const data = JSON.parse(cached);
    setPermissions(data.permissions);
    setIsPrimaryAdmin(data.isPrimaryAdmin);
    setRole(data.role);
    setLoading(false);
  }
  fetchPermissions();
}, []);

// Save after fetch
useEffect(() => {
  if (!loading) {
    sessionStorage.setItem('userPermissions', JSON.stringify({
      permissions,
      isPrimaryAdmin,
      role,
    }));
  }
}, [permissions, isPrimaryAdmin, role, loading]);
```

---

## Testing with cURL

### Get Permissions (Admin)
```bash
curl -X GET "http://localhost:3000/api/v1/auth/my-permissions" \
  -H "Authorization: Bearer <admin_token>"
```

### Test 403 Error (Limited User accessing roles)
```bash
curl -X GET "http://localhost:3000/api/v1/roles" \
  -H "Authorization: Bearer <limited_user_token>"

# Response: 403 Forbidden
```

---

## Permission Categories Reference

| Category | Permissions |
|----------|------------|
| **Sales** | customer:view, customer:create, customer:edit, customer:delete, invoice:view, invoice:create, invoice:edit, invoice:delete, invoice:send, invoice:void |
| **Expenses** | vendor:view, vendor:create, vendor:edit, vendor:delete, expense:view, expense:create, expense:edit, expense:delete, bill:view, bill:create, bill:edit, bill:pay |
| **Banking** | bank_account:view, bank_account:reconcile, bank_transaction:categorize |
| **Reports** | report:view_basic, report:view_advanced, report:export, report:customize |
| **Settings** | company:view_settings, company:edit_settings, user:view, user:invite, user:edit, user:delete, books:close |
| **Inventory** | inventory:view, inventory:create, inventory:edit, inventory:adjust |
| **Time** | time:view, time:create, time:edit, time:approve |
| **Projects** | project:view, project:create, project:edit |

---

## Next Steps

1. Implement permissions context in your React app
2. Add ProtectedContent components to hide/show UI based on permissions
3. Add ProtectedRoute for page-level access control
4. Handle 403 errors globally with user-friendly messages
5. Test with different user roles to ensure proper access control
