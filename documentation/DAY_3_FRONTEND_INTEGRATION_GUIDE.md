# Day 3 Frontend Integration Guide - User Management & Invitations

**API Base URL:** `http://localhost:3000/api/v1`

---

## 🚀 Available Endpoints

### 1. **Get All Users in Company**

**Endpoint:** `GET /api/v1/users`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Users retrieved successfully";
  data: [
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      phone: string | null;
      avatarUrl: string | null;
      role: {
        id: string;
        code: string;
        name: string;
      };
      isPrimaryAdmin: boolean;
      isActive: boolean;
      lastLoginAt: string | null;
      emailVerifiedAt: string | null;
      invitationAcceptedAt: string | null;
      createdAt: string;
    }
  ];
}
```

**Example (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/v1/users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log('Users:', data.data);
```

---

### 2. **Get Single User by ID**

**Endpoint:** `GET /api/v1/users/:id`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "User retrieved successfully";
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: {
      id: string;
      code: string;
      name: string;
    } | null;
    isPrimaryAdmin: boolean;
    isActive: boolean;
    company: {
      id: string;
      name: string;
    };
    permissions: string[]; // Array of permission codes
    lastLoginAt: string | null;
    emailVerifiedAt: string | null;
    createdAt: string;
  };
}
```

**Example:**
```javascript
const userId = 'user-uuid-here';
const response = await fetch(`http://localhost:3000/api/v1/users/${userId}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log('User details:', data.data);
```

---

### 3. **Invite User**

**Endpoint:** `POST /api/v1/users/invite`

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  email: string;          // Required, valid email
  firstName: string;      // Required
  lastName: string;       // Required
  roleId: string;         // Required, UUID of role
  message?: string;       // Optional, invitation message
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "User invited successfully";
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      code: string;
      name: string;
    };
    invitationToken: string;  // Token for acceptance
    invitedBy: {
      firstName: string;
      lastName: string;
      email: string;
    };
    expiresAt: string;        // ISO date, 7 days from now
    status: "pending";
    createdAt: string;
  };
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/users/invite', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'newuser@company.com',
    firstName: 'Jane',
    lastName: 'Doe',
    roleId: 'role-uuid-here',
    message: 'Welcome to our team!'
  })
});

const data = await response.json();
console.log('Invitation created:', data.data);
// Send invitationToken to user via email (Day 5)
```

**Error Responses:**

**409 - User Already Exists:**
```json
{
  "statusCode": 409,
  "message": "User with this email already exists in your company"
}
```

**409 - Pending Invitation Exists:**
```json
{
  "statusCode": 409,
  "message": "A pending invitation already exists for this email"
}
```

---

### 4. **Get Pending Invitations**

**Endpoint:** `GET /api/v1/users/invitations/pending`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Pending invitations retrieved successfully";
  data: [
    {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: {
        code: string;
        name: string;
      };
      invitedBy: {
        firstName: string;
        lastName: string;
        email: string;
      };
      expiresAt: string;
      createdAt: string;
    }
  ];
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/users/invitations/pending', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log('Pending invitations:', data.data);
```

---

### 5. **Cancel Invitation**

**Endpoint:** `PATCH /api/v1/users/invitations/:id/cancel`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "Invitation cancelled successfully";
  data: null;
}
```

**Example:**
```javascript
const invitationId = 'invitation-uuid-here';
const response = await fetch(
  `http://localhost:3000/api/v1/users/invitations/${invitationId}/cancel`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  }
);

const data = await response.json();
console.log(data.message); // "Invitation cancelled successfully"
```

---

### 6. **Accept Invitation** (Public Endpoint)

**Endpoint:** `POST /api/v1/users/accept-invitation`

**Authentication:** NOT Required (Public)

**Request:**
```typescript
{
  invitationToken: string;  // Required, token from invitation
  password: string;         // Required, min 8 characters
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Invitation accepted successfully. You can now login.";
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      id: string;
      code: string;
      name: string;
      description: string;
      isSystemRole: boolean;
      requiredPlan: string | null;
      displayOrder: number;
      createdAt: string;
      updatedAt: string;
    };
    company: {
      id: string;
      name: string;
    };
    invitationAcceptedAt: string;
  };
}
```

**Example:**
```javascript
// This endpoint is called from a public page (no login required)
const response = await fetch('http://localhost:3000/api/v1/users/accept-invitation', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    invitationToken: 'token-from-email-link',
    password: 'SecurePass123'
  })
});

const data = await response.json();
if (data.success) {
  // Redirect to login page
  window.location.href = '/login';
}
```

**Error Responses:**

**404 - Invalid Token:**
```json
{
  "statusCode": 404,
  "message": "Invalid invitation token"
}
```

**400 - Already Used:**
```json
{
  "statusCode": 400,
  "message": "This invitation has already been used or cancelled"
}
```

**400 - Expired:**
```json
{
  "statusCode": 400,
  "message": "This invitation has expired"
}
```

---

### 7. **Update User Profile**

**Endpoint:** `PATCH /api/v1/users/:id`

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  roleId?: string;        // UUID
  isActive?: boolean;
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "User updated successfully";
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    role: {
      id: string;
      code: string;
      name: string;
    };
    isPrimaryAdmin: boolean;
    isActive: boolean;
    updatedAt: string;
  };
}
```

**Example:**
```javascript
const userId = 'user-uuid-here';
const response = await fetch(`http://localhost:3000/api/v1/users/${userId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    firstName: 'Jane',
    phone: '+1234567890'
  })
});

const data = await response.json();
console.log('Updated user:', data.data);
```

**Error Responses:**

**400 - Cannot Deactivate Primary Admin:**
```json
{
  "statusCode": 400,
  "message": "Primary admin cannot be deactivated"
}
```

**400 - Cannot Change Primary Admin Role:**
```json
{
  "statusCode": 400,
  "message": "Primary admin role cannot be changed"
}
```

**409 - Email Conflict:**
```json
{
  "statusCode": 409,
  "message": "Email already in use by another user"
}
```

---

### 8. **Change Password**

**Endpoint:** `POST /api/v1/users/me/change-password`

**Authentication:** Required (JWT)

**Request:**
```typescript
{
  currentPassword: string;  // Required
  newPassword: string;      // Required, min 8 characters
}
```

**Response (200):**
```typescript
{
  success: true;
  message: "Password changed successfully";
  data: null;
}
```

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/users/me/change-password', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    currentPassword: 'OldPass123',
    newPassword: 'NewSecurePass123'
  })
});

const data = await response.json();
console.log(data.message); // "Password changed successfully"
```

**Error Responses:**

**401 - Wrong Current Password:**
```json
{
  "statusCode": 401,
  "message": "Current password is incorrect"
}
```

**400 - Validation Error:**
```json
{
  "statusCode": 400,
  "message": ["newPassword must be longer than or equal to 8 characters"]
}
```

---

### 9. **Deactivate User**

**Endpoint:** `PATCH /api/v1/users/:id/deactivate`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "User deactivated successfully";
  data: null;
}
```

**Example:**
```javascript
const userId = 'user-uuid-here';
const response = await fetch(`http://localhost:3000/api/v1/users/${userId}/deactivate`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log(data.message); // "User deactivated successfully"
```

**Error Response:**
```json
{
  "statusCode": 400,
  "message": "Primary admin cannot be deactivated"
}
```

---

### 10. **Reactivate User**

**Endpoint:** `PATCH /api/v1/users/:id/reactivate`

**Authentication:** Required (JWT)

**Response (200):**
```typescript
{
  success: true;
  message: "User reactivated successfully";
  data: null;
}
```

**Example:**
```javascript
const userId = 'user-uuid-here';
const response = await fetch(`http://localhost:3000/api/v1/users/${userId}/reactivate`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const data = await response.json();
console.log(data.message); // "User reactivated successfully"
```

---

## 🔄 Complete User Management Flow

### Flow 1: Invite and Onboard New User

```
1. Admin lists users
   GET /api/v1/users
   ↓
2. Admin clicks "Invite User" button
   Opens invitation form
   ↓
3. Admin fills form and submits
   POST /api/v1/users/invite
   ↓
4. Backend creates invitation and returns token
   (In Day 5, email will be sent automatically)
   ↓
5. Admin sees invitation in "Pending Invitations"
   GET /api/v1/users/invitations/pending
   ↓
6. New user receives email with invitation link
   Link contains: /accept-invitation?token=xxx
   ↓
7. User clicks link, fills password form
   POST /api/v1/users/accept-invitation
   ↓
8. User account created, redirected to login
   POST /api/v1/auth/login
```

### Flow 2: Manage Existing User

```
1. Admin views user list
   GET /api/v1/users
   ↓
2. Admin clicks on user to view details
   GET /api/v1/users/:id
   ↓
3. Admin updates user information
   PATCH /api/v1/users/:id
   ↓
4. Optional: Deactivate user
   PATCH /api/v1/users/:id/deactivate
   ↓
5. Optional: Reactivate later
   PATCH /api/v1/users/:id/reactivate
```

### Flow 3: User Changes Own Password

```
1. User goes to settings/profile
   ↓
2. User clicks "Change Password"
   Opens password change form
   ↓
3. User enters current and new password
   POST /api/v1/users/me/change-password
   ↓
4. Password updated successfully
   Show success message
```

---

## 🎨 React/TypeScript Implementation

### API Service Layer

```typescript
// src/services/users.api.ts
const API_BASE_URL = 'http://localhost:3000/api/v1';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: {
    id: string;
    code: string;
    name: string;
  };
  isPrimaryAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  invitationAcceptedAt: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    code: string;
    name: string;
  };
  invitedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  expiresAt: string;
  createdAt: string;
}

export const usersApi = {
  // Get all users
  async getAllUsers(token: string): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Get single user
  async getUser(userId: string, token: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Invite user
  async inviteUser(
    inviteData: {
      email: string;
      firstName: string;
      lastName: string;
      roleId: string;
      message?: string;
    },
    token: string
  ) {
    const response = await fetch(`${API_BASE_URL}/users/invite`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inviteData),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Get pending invitations
  async getPendingInvitations(token: string): Promise<Invitation[]> {
    const response = await fetch(`${API_BASE_URL}/users/invitations/pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Cancel invitation
  async cancelInvitation(invitationId: string, token: string) {
    const response = await fetch(
      `${API_BASE_URL}/users/invitations/${invitationId}/cancel`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Accept invitation (public)
  async acceptInvitation(invitationToken: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/users/accept-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken, password }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },

  // Update user
  async updateUser(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      avatarUrl?: string;
      roleId?: string;
      isActive?: boolean;
    },
    token: string
  ) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
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

  // Change password
  async changePassword(
    currentPassword: string,
    newPassword: string,
    token: string
  ) {
    const response = await fetch(`${API_BASE_URL}/users/me/change-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Deactivate user
  async deactivateUser(userId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/deactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },

  // Reactivate user
  async reactivateUser(userId: string, token: string) {
    const response = await fetch(`${API_BASE_URL}/users/${userId}/reactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  },
};
```

---

## 🖥️ React Component Examples

### 1. Users List Component

```typescript
// src/pages/Users/UsersList.tsx
import React, { useEffect, useState } from 'react';
import { usersApi, User } from '../../services/users.api';
import { useAuth } from '../../contexts/AuthContext';

export const UsersList: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getAllUsers(token!);
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await usersApi.deactivateUser(userId, token!);
      loadUsers(); // Reload list
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      await usersApi.reactivateUser(userId, token!);
      loadUsers(); // Reload list
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Team Members</h1>
      <button onClick={() => window.location.href = '/users/invite'}>
        Invite User
      </button>

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                {user.firstName} {user.lastName}
                {user.isPrimaryAdmin && <span> (Admin)</span>}
              </td>
              <td>{user.email}</td>
              <td>{user.role?.name || 'No Role'}</td>
              <td>{user.isActive ? 'Active' : 'Inactive'}</td>
              <td>
                <button onClick={() => window.location.href = `/users/${user.id}`}>
                  Edit
                </button>
                {!user.isPrimaryAdmin && (
                  user.isActive ? (
                    <button onClick={() => handleDeactivate(user.id)}>
                      Deactivate
                    </button>
                  ) : (
                    <button onClick={() => handleReactivate(user.id)}>
                      Reactivate
                    </button>
                  )
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 2. Invite User Component

```typescript
// src/pages/Users/InviteUser.tsx
import React, { useState } from 'react';
import { usersApi } from '../../services/users.api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const InviteUser: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await usersApi.inviteUser(formData, token!);
      alert('User invited successfully! They will receive an email soon.');
      navigate('/users');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Invite New User</h1>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
        </div>

        <div>
          <label>First Name:</label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
          />
        </div>

        <div>
          <label>Last Name:</label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
          />
        </div>

        <div>
          <label>Role:</label>
          <select
            required
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
          >
            <option value="">Select Role</option>
            {/* Fetch roles from GET /api/v1/roles (Day 4) */}
            <option value="role-uuid-1">Company Admin</option>
            <option value="role-uuid-2">Standard User</option>
          </select>
        </div>

        <div>
          <label>Welcome Message (Optional):</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Sending Invitation...' : 'Send Invitation'}
        </button>
      </form>
    </div>
  );
};
```

### 3. Accept Invitation Component (Public Page)

```typescript
// src/pages/Public/AcceptInvitation.tsx
import React, { useState } from 'react';
import { usersApi } from '../../services/users.api';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const AcceptInvitation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await usersApi.acceptInvitation(invitationToken, password);
      alert('Account created successfully! You can now login.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Accept Invitation</h1>
      <p>Create your password to complete your account setup.</p>

      {error && <div style={{ color: 'red' }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Password:</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div>
          <label>Confirm Password:</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};
```

### 4. Change Password Component

```typescript
// src/pages/Settings/ChangePassword.tsx
import React, { useState } from 'react';
import { usersApi } from '../../services/users.api';
import { useAuth } from '../../contexts/AuthContext';

export const ChangePassword: React.FC = () => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await usersApi.changePassword(
        formData.currentPassword,
        formData.newPassword,
        token!
      );
      setSuccess(true);
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Change Password</h2>

      {error && <div style={{ color: 'red' }}>{error}</div>}
      {success && <div style={{ color: 'green' }}>Password changed successfully!</div>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Current Password:</label>
          <input
            type="password"
            required
            value={formData.currentPassword}
            onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
          />
        </div>

        <div>
          <label>New Password:</label>
          <input
            type="password"
            required
            minLength={8}
            value={formData.newPassword}
            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
          />
        </div>

        <div>
          <label>Confirm New Password:</label>
          <input
            type="password"
            required
            minLength={8}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Changing Password...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};
```

### 5. Pending Invitations Component

```typescript
// src/pages/Users/PendingInvitations.tsx
import React, { useEffect, useState } from 'react';
import { usersApi, Invitation } from '../../services/users.api';
import { useAuth } from '../../contexts/AuthContext';

export const PendingInvitations: React.FC = () => {
  const { token } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const data = await usersApi.getPendingInvitations(token!);
      setInvitations(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return;

    try {
      await usersApi.cancelInvitation(invitationId, token!);
      loadInvitations(); // Reload
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Pending Invitations</h2>

      {invitations.length === 0 ? (
        <p>No pending invitations</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Invited By</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => (
              <tr key={invitation.id}>
                <td>{invitation.firstName} {invitation.lastName}</td>
                <td>{invitation.email}</td>
                <td>{invitation.role.name}</td>
                <td>
                  {invitation.invitedBy.firstName} {invitation.invitedBy.lastName}
                </td>
                <td>{new Date(invitation.expiresAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleCancel(invitation.id)}>
                    Cancel
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

---

## 🧪 Testing with cURL

### Test 1: Get All Users
```bash
TOKEN="your-jwt-token"
curl -X GET 'http://localhost:3000/api/v1/users' \
  -H "Authorization: Bearer $TOKEN"
```

### Test 2: Invite User
```bash
TOKEN="your-jwt-token"
curl -X POST 'http://localhost:3000/api/v1/users/invite' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "firstName": "John",
    "lastName": "Doe",
    "roleId": "role-uuid-here",
    "message": "Welcome!"
  }'
```

### Test 3: Accept Invitation
```bash
curl -X POST 'http://localhost:3000/api/v1/users/accept-invitation' \
  -H "Content-Type: application/json" \
  -d '{
    "invitationToken": "token-from-invitation",
    "password": "SecurePass123"
  }'
```

### Test 4: Update User
```bash
TOKEN="your-jwt-token"
USER_ID="user-uuid-here"
curl -X PATCH "http://localhost:3000/api/v1/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890"
  }'
```

### Test 5: Change Password
```bash
TOKEN="your-jwt-token"
curl -X POST 'http://localhost:3000/api/v1/users/me/change-password' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123",
    "newPassword": "NewPass123"
  }'
```

---

## 📋 TypeScript Types

```typescript
// types/users.ts

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: {
    id: string;
    code: string;
    name: string;
  };
  isPrimaryAdmin: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  emailVerifiedAt: string | null;
  invitationAcceptedAt: string | null;
  createdAt: string;
}

export interface UserDetails extends User {
  company: {
    id: string;
    name: string;
  };
  permissions: string[];
}

export interface Invitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    code: string;
    name: string;
  };
  invitedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  expiresAt: string;
  createdAt: string;
}

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  message?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  roleId?: string;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AcceptInvitationRequest {
  invitationToken: string;
  password: string;
}
```

---

## ✅ Frontend Integration Checklist

### User Management Features
- [ ] Display list of all users
- [ ] Show user status (active/inactive)
- [ ] Highlight primary admin
- [ ] Invite new user form
- [ ] View pending invitations
- [ ] Cancel invitation button
- [ ] Edit user profile
- [ ] Deactivate/reactivate user buttons
- [ ] Prevent deactivating primary admin

### Accept Invitation Flow
- [ ] Public invitation acceptance page
- [ ] Parse token from URL query parameter
- [ ] Password creation form
- [ ] Password confirmation validation
- [ ] Redirect to login after success
- [ ] Handle expired/invalid tokens

### Password Management
- [ ] Change password form in settings
- [ ] Current password validation
- [ ] New password confirmation
- [ ] Min 8 characters validation
- [ ] Success/error messaging

### Error Handling
- [ ] Handle 401 (redirect to login)
- [ ] Handle 404 (user not found)
- [ ] Handle 409 (email conflicts)
- [ ] Handle 400 (validation errors)
- [ ] Display user-friendly error messages

### UI/UX
- [ ] Loading states during API calls
- [ ] Confirmation dialogs for destructive actions
- [ ] Success messages after operations
- [ ] Disable buttons during loading
- [ ] Form validation before submission

---

## 🚨 Important Notes

### Security
- Always store JWT tokens securely (httpOnly cookies recommended)
- Never log tokens in production
- Validate token expiration on frontend
- Handle 401 responses by redirecting to login

### Email Integration (Day 5)
- Currently invitation tokens are returned in API response
- In Day 5, emails will be sent automatically
- Frontend should show "Invitation sent via email" message
- Token should not be displayed to admin (security)

### Invitation Links
Format the invitation URL like this:
```
https://yourapp.com/accept-invitation?token=INVITATION_TOKEN_HERE
```

### Role Management
- Roles will have a dedicated endpoint in Day 4
- For now, hardcode role UUIDs from database
- Fetch from `GET /api/v1/roles` (coming in Day 4)

---

## 📞 Need Help?

- Backend running on: `http://localhost:3000`
- Health check: `http://localhost:3000/api/v1/health`
- All user endpoints return standardized `ApiResponseDto` format
- Check [DAY_3_COMPLETION_SUMMARY.md](DAY_3_COMPLETION_SUMMARY.md) for detailed feature list

**Happy coding!** 🚀
