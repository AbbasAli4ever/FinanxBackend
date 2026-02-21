# Day 4 Frontend Integration Guide - Custom Role Creation

**API Base URL:** `http://localhost:3000/api/v1`

---

## 🚀 New Endpoints Available

### 1. **Get All Roles**

**Endpoint:** `GET /api/v1/roles`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Roles retrieved successfully";
  data: [
    {
      id: string;
      code: string;
      name: string;
      description: string | null;
      isSystemRole: boolean;
      requiredPlan: string | null;
      displayOrder: number;
      permissions: [
        {
          id: string;
          code: string;
          name: string;
          category: string;
        }
      ];
      usersCount: number;
      createdAt: string;
      updatedAt: string;
    }
  ];
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/roles', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log('Roles:', data.data);
// Returns: 5 system roles + any custom roles
```

---

### 2. **Get All Permissions**

**Endpoint:** `GET /api/v1/roles/permissions/all`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Permissions retrieved successfully";
  data: {
    all: [
      {
        id: string;
        code: string;
        name: string;
        description: string | null;
        category: string;
      }
    ];
    grouped: {
      sales: Permission[];
      expenses: Permission[];
      banking: Permission[];
      reports: Permission[];
      settings: Permission[];
      inventory: Permission[];
      time: Permission[];
      projects: Permission[];
    };
  };
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/roles/permissions/all', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log('Total permissions:', data.data.all.length); // 47
console.log('Categories:', Object.keys(data.data.grouped)); // 8 categories
```

---

### 3. **Create Custom Role**

**Endpoint:** `POST /api/v1/roles`

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  code: string;           // Required, unique, 3-50 chars
  name: string;           // Required, 3-100 chars
  description?: string;   // Optional
  permissionIds: string[]; // Required, array of permission UUIDs
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Role created successfully";
  data: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystemRole: false;
    displayOrder: number;
    permissions: Permission[];
    createdAt: string;
  };
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/roles', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    code: 'sales_manager',
    name: 'Sales Manager',
    description: 'Can manage all sales-related operations',
    permissionIds: [
      'bf2f6629-0887-41c7-ad16-8b181bbe7b71', // customer:view
      '4fb8aab5-d60d-4a4e-beb0-75ca202fdb42', // customer:create
      '226e53e5-4c3f-43cb-9ae2-87e8e778ac95', // customer:edit
      '12298902-39af-47a4-85dd-660fba579c0e', // invoice:view
      'ebcddbe6-245a-41df-9703-df638ed473a1', // invoice:create
    ]
  })
});

const data = await response.json();
console.log('Role created:', data.data);
```

**Error Responses:**

**409 - Role Code Exists:**
```json
{
  "statusCode": 409,
  "message": "Role with this code already exists"
}
```

**400 - Invalid Permission IDs:**
```json
{
  "statusCode": 400,
  "message": "One or more permission IDs are invalid"
}
```

---

### 4. **Update Custom Role**

**Endpoint:** `PATCH /api/v1/roles/:id`

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  name?: string;           // Optional, 3-100 chars
  description?: string;    // Optional
  permissionIds?: string[]; // Optional, array of permission UUIDs
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Role updated successfully";
  data: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystemRole: false;
    permissions: Permission[];
    updatedAt: string;
  };
}
```

**Example:**
```javascript
const roleId = 'custom-role-uuid-here';
const response = await fetch(`http://localhost:3000/api/v1/roles/${roleId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Senior Sales Manager',
    description: 'Updated description',
    permissionIds: [
      // ... new set of permission IDs
    ]
  })
});
```

**Error Response:**

**400 - Cannot Edit System Role:**
```json
{
  "statusCode": 400,
  "message": "System roles cannot be modified"
}
```

---

### 5. **Delete Custom Role**

**Endpoint:** `DELETE /api/v1/roles/:id`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Role deleted successfully";
  data: null;
}
```

**Example:**
```javascript
const roleId = 'custom-role-uuid-here';
const response = await fetch(`http://localhost:3000/api/v1/roles/${roleId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
```

**Error Responses:**

**400 - Cannot Delete System Role:**
```json
{
  "statusCode": 400,
  "message": "System roles cannot be deleted"
}
```

**400 - Role In Use:**
```json
{
  "statusCode": 400,
  "message": "Cannot delete role. 5 user(s) are assigned to this role"
}
```

---

### 6. **Get Single Role**

**Endpoint:** `GET /api/v1/roles/:id`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Role retrieved successfully";
  data: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    requiredPlan: string | null;
    displayOrder: number;
    permissions: Permission[];
    usersCount: number;
    createdAt: string;
    updatedAt: string;
  };
}
```

---

## 🎨 React/TypeScript Implementation

### API Service Layer

**File: `src/services/roles.api.ts`**

```typescript
const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  requiredPlan: string | null;
  displayOrder: number;
  permissions: Permission[];
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export const rolesApi = {
  // Get all roles
  async getAllRoles(token: string): Promise<Role[]> {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Get single role
  async getRole(roleId: string, token: string): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Get all permissions
  async getAllPermissions(token: string): Promise<{
    all: Permission[];
    grouped: Record<string, Permission[]>;
  }> {
    const response = await fetch(`${API_BASE_URL}/roles/permissions/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Create custom role
  async createRole(
    roleData: {
      code: string;
      name: string;
      description?: string;
      permissionIds: string[];
    },
    token: string
  ): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/roles`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roleData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Update custom role
  async updateRole(
    roleId: string,
    updateData: {
      name?: string;
      description?: string;
      permissionIds?: string[];
    },
    token: string
  ): Promise<Role> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Delete custom role
  async deleteRole(roleId: string, token: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/roles/${roleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
  },
};
```

---

## 🖥️ React Component Examples

### 1. Create Custom Role Form

**File: `src/pages/Roles/CreateRole.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { rolesApi, Permission } from '../../services/roles.api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const CreateRole: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
  });

  const [permissions, setPermissions] = useState<{
    all: Permission[];
    grouped: Record<string, Permission[]>;
  } | null>(null);

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load permissions on mount
  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const perms = await rolesApi.getAllPermissions(token!);
      setPermissions(perms);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleSelectAllInCategory = (category: string) => {
    const categoryPerms = permissions?.grouped[category] || [];
    const newSelected = new Set(selectedPermissions);

    const allSelected = categoryPerms.every(p => newSelected.has(p.id));

    if (allSelected) {
      // Deselect all in category
      categoryPerms.forEach(p => newSelected.delete(p.id));
    } else {
      // Select all in category
      categoryPerms.forEach(p => newSelected.add(p.id));
    }

    setSelectedPermissions(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedPermissions.size === 0) {
      setError('Please select at least one permission');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await rolesApi.createRole(
        {
          ...formData,
          permissionIds: Array.from(selectedPermissions),
        },
        token!
      );

      alert('Role created successfully!');
      navigate('/roles');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!permissions) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div className="create-role-page">
      <h1>Create Custom Role</h1>

      {error && (
        <div className="error-message" style={{ color: 'red' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="code">Role Code *</label>
            <input
              id="code"
              type="text"
              required
              minLength={3}
              maxLength={50}
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toLowerCase() })
              }
              placeholder="sales_manager"
            />
            <small>Lowercase, no spaces. Example: sales_manager</small>
          </div>

          <div className="form-group">
            <label htmlFor="name">Role Name *</label>
            <input
              id="name"
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Sales Manager"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe what this role can do..."
              rows={3}
            />
          </div>
        </div>

        {/* Permissions */}
        <div className="form-section">
          <h2>
            Permissions ({selectedPermissions.size} / {permissions.all.length}{' '}
            selected)
          </h2>

          {Object.entries(permissions.grouped).map(([category, perms]) => {
            const allSelected = perms.every((p) => selectedPermissions.has(p.id));
            const someSelected = perms.some((p) => selectedPermissions.has(p.id));

            return (
              <div key={category} className="permission-category">
                <div className="category-header">
                  <h3>
                    {category.charAt(0).toUpperCase() + category.slice(1)} (
                    {perms.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleSelectAllInCategory(category)}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="permission-list">
                  {perms.map((permission) => (
                    <div key={permission.id} className="permission-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedPermissions.has(permission.id)}
                          onChange={() => handlePermissionToggle(permission.id)}
                        />
                        <div>
                          <strong>{permission.name}</strong>
                          <br />
                          <small style={{ color: '#666' }}>
                            {permission.description || permission.code}
                          </small>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/roles')}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating Role...' : 'Create Role'}
          </button>
        </div>
      </form>
    </div>
  );
};
```

---

### 2. Roles List Component

**File: `src/pages/Roles/RolesList.tsx`**

```typescript
import React, { useEffect, useState } from 'react';
import { rolesApi, Role } from '../../services/roles.api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const RolesList: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const data = await rolesApi.getAllRoles(token!);
      setRoles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (roleId: string, roleName: string) => {
    if (!confirm(`Are you sure you want to delete the role "${roleName}"?`)) {
      return;
    }

    try {
      await rolesApi.deleteRole(roleId, token!);
      alert('Role deleted successfully');
      loadRoles(); // Reload list
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading roles...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="roles-list-page">
      <div className="page-header">
        <h1>Roles & Permissions</h1>
        <button onClick={() => navigate('/roles/create')}>
          Create Custom Role
        </button>
      </div>

      <div className="roles-grid">
        {roles.map((role) => (
          <div key={role.id} className="role-card">
            <div className="role-header">
              <h3>{role.name}</h3>
              {role.isSystemRole && <span className="badge">System Role</span>}
            </div>

            <p className="role-description">
              {role.description || 'No description'}
            </p>

            <div className="role-stats">
              <div>
                <strong>{role.permissions.length}</strong> permissions
              </div>
              <div>
                <strong>{role.usersCount}</strong> users
              </div>
            </div>

            <div className="role-actions">
              <button onClick={() => navigate(`/roles/${role.id}`)}>
                View Details
              </button>

              {!role.isSystemRole && (
                <>
                  <button onClick={() => navigate(`/roles/${role.id}/edit`)}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(role.id, role.name)}
                    className="danger"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Permission Preview */}
            <details className="permissions-preview">
              <summary>View Permissions ({role.permissions.length})</summary>
              <ul>
                {role.permissions.slice(0, 10).map((perm) => (
                  <li key={perm.id}>{perm.name}</li>
                ))}
                {role.permissions.length > 10 && (
                  <li>... and {role.permissions.length - 10} more</li>
                )}
              </ul>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

### 3. Edit Role Component

**File: `src/pages/Roles/EditRole.tsx`**

```typescript
import React, { useState, useEffect } from 'react';
import { rolesApi, Role, Permission } from '../../services/roles.api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export const EditRole: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { roleId } = useParams<{ roleId: string }>();

  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<{
    all: Permission[];
    grouped: Record<string, Permission[]>;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [roleId]);

  const loadData = async () => {
    try {
      const [roleData, permsData] = await Promise.all([
        rolesApi.getRole(roleId!, token!),
        rolesApi.getAllPermissions(token!),
      ]);

      setRole(roleData);
      setPermissions(permsData);
      setFormData({
        name: roleData.name,
        description: roleData.description || '',
      });
      setSelectedPermissions(
        new Set(roleData.permissions.map((p) => p.id))
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await rolesApi.updateRole(
        roleId!,
        {
          ...formData,
          permissionIds: Array.from(selectedPermissions),
        },
        token!
      );

      alert('Role updated successfully!');
      navigate('/roles');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Similar UI as CreateRole but pre-filled with existing data
  // ... (rest of component similar to CreateRole)
};
```

---

## 📋 TypeScript Types

```typescript
// types/roles.ts

export interface Permission {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  displayOrder: number;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  requiredPlan: string | null;
  displayOrder: number;
  permissions: Permission[];
  usersCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleRequest {
  code: string;
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface PermissionsResponse {
  all: Permission[];
  grouped: Record<string, Permission[]>;
}
```

---

## 🧪 Testing with cURL

### Test 1: Get All Roles
```bash
TOKEN="your-token-here"
curl 'http://localhost:3000/api/v1/roles' \
  -H "Authorization: Bearer $TOKEN"
```

### Test 2: Get All Permissions
```bash
curl 'http://localhost:3000/api/v1/roles/permissions/all' \
  -H "Authorization: Bearer $TOKEN"
```

### Test 3: Create Custom Role
```bash
curl -X POST 'http://localhost:3000/api/v1/roles' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "accountant",
    "name": "Accountant",
    "description": "Manages financial records and reports",
    "permissionIds": [
      "a34a51cd-fccf-4690-9537-d9d5dd21aee0",
      "fc8f88ef-8476-413e-a61a-90e9e3e7580e",
      "052790a7-ae7d-4b46-9f54-d11656f8fdc3",
      "3bba4473-63a7-46e1-96c2-7de8197e76fd",
      "cebc2e3d-b16c-48a5-93fb-23cb5e40c7a8"
    ]
  }'
```

### Test 4: Update Role
```bash
ROLE_ID="custom-role-id-here"
curl -X PATCH "http://localhost:3000/api/v1/roles/$ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Accountant",
    "description": "Updated description"
  }'
```

### Test 5: Delete Role
```bash
curl -X DELETE "http://localhost:3000/api/v1/roles/$ROLE_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Frontend Integration Checklist

### Role Management UI
- [ ] Display list of all roles (system + custom)
- [ ] Show role details with permissions
- [ ] Create custom role form
- [ ] Permission selection with checkboxes
- [ ] Group permissions by category
- [ ] "Select All" per category
- [ ] Update role form (pre-filled)
- [ ] Delete role with confirmation
- [ ] Show user count per role
- [ ] Disable edit/delete for system roles

### Permission Management
- [ ] Load all 47 permissions
- [ ] Display grouped by 8 categories
- [ ] Show permission descriptions
- [ ] Search/filter permissions
- [ ] Visual feedback for selected permissions

### Error Handling
- [ ] Handle 409 (role code exists)
- [ ] Handle 400 (invalid permissions)
- [ ] Handle 400 (system role protection)
- [ ] Handle 400 (role in use)
- [ ] Display user-friendly errors

### UX Improvements
- [ ] Loading states
- [ ] Success messages
- [ ] Confirmation dialogs
- [ ] Permission count display
- [ ] Category badges
- [ ] System role badges

---

## 🎯 Permission Categories

### Sales (10 permissions)
- customer:view, create, edit, delete
- invoice:view, create, edit, delete, send, void

### Expenses (12 permissions)
- vendor:view, create, edit, delete
- expense:view, create, edit, delete
- bill:view, create, edit, pay

### Banking (3 permissions)
- bank_account:view, reconcile
- bank_transaction:categorize

### Reports (4 permissions)
- report:view_basic, view_advanced, export, customize

### Settings (7 permissions)
- company:view_settings, edit_settings
- user:view, invite, edit, delete
- books:close

### Inventory (4 permissions)
- inventory:view, create, edit, adjust

### Time (4 permissions)
- time:view, create, edit, approve

### Projects (3 permissions)
- project:view, create, edit

---

## 💡 Best Practices

1. **Always load permissions first** - Before showing create/edit role form
2. **Group by category** - Makes it easier for users to find permissions
3. **Show descriptions** - Help users understand what each permission does
4. **Validate before submit** - At least one permission required
5. **Prevent editing system roles** - Show read-only view for system roles
6. **Show user count** - Warn before deleting roles with users
7. **Use confirmation dialogs** - For delete operations
8. **Refresh after changes** - Reload role list after create/update/delete

---

## 🚀 Quick Start Example

```typescript
// 1. Load roles on page mount
useEffect(() => {
  rolesApi.getAllRoles(token).then(setRoles);
}, []);

// 2. Load permissions for role creation
useEffect(() => {
  rolesApi.getAllPermissions(token).then(setPermissions);
}, []);

// 3. Create custom role
const createRole = async () => {
  await rolesApi.createRole({
    code: 'sales_manager',
    name: 'Sales Manager',
    description: 'Manages sales team',
    permissionIds: selectedPermissionIds
  }, token);
};
```

---

**Happy Coding!** 🚀
