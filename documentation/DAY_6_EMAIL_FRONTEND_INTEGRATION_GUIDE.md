# Day 6 - Email Frontend Integration Guide

**API Base URL:** `http://localhost:3000/api/v1`

---

## Overview

This guide covers frontend integration for email-related features:
1. User Invitation Flow
2. Email Configuration

---

## Email Configuration (Backend)

Before emails can be sent, configure SMTP in your `.env` file:

```env
FRONTEND_URL="http://localhost:3001"
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"
MAIL_FROM_EMAIL="noreply@finanx.com"
MAIL_FROM_NAME="FinanX"
```

**Testing Options:**
- **Mailtrap** (recommended for dev): Catches all emails in sandbox
- **Gmail**: Use App Password (not regular password)
- **Ethereal**: Free temporary SMTP accounts

---

## User Invitation Flow

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/users/invite` | Yes | Invite a new user |
| POST | `/api/v1/users/accept-invitation` | No | Accept invitation |
| GET | `/api/v1/users/invitations` | Yes | Get pending invitations |
| DELETE | `/api/v1/users/invitations/:id` | Yes | Cancel invitation |

---

### Step 1: Invite User (Admin Action)

**Endpoint:** `POST /api/v1/users/invite`

**Headers:**
```
Authorization: Bearer <accessToken>
```

**Request:**
```typescript
interface InviteUserRequest {
  email: string;      // Required
  firstName: string;  // Required
  lastName: string;   // Required
  roleId: string;     // Required, UUID
  message?: string;   // Optional personal message
}
```

**Response:**
```typescript
interface InviteUserResponse {
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
    invitationToken: string;
    invitedBy: {
      firstName: string;
      lastName: string;
      email: string;
    };
    expiresAt: string;    // 7 days from now
    status: "pending";
    createdAt: string;
    emailSent: boolean;   // true if email sent successfully
  };
}
```

**Example:**
```typescript
const inviteUser = async (userData: InviteUserRequest) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/users/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();

  if (data.success) {
    if (data.data.emailSent) {
      showNotification('Invitation email sent successfully!');
    } else {
      // Email not configured - show manual sharing option
      showNotification('Invitation created. Share this link manually:');
      const inviteUrl = `${FRONTEND_URL}/accept-invitation?token=${data.data.invitationToken}`;
      console.log('Invitation URL:', inviteUrl);
    }
  }

  return data;
};
```

**React Component:**
```tsx
const InviteUserForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    roleId: '',
    message: '',
  });
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3000/api/v1/roles', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3000/api/v1/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        setFormData({ email: '', firstName: '', lastName: '', roleId: '', message: '' });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Invite New User</h2>

      <input
        type="email"
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="First Name"
        value={formData.firstName}
        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
        required
      />

      <input
        type="text"
        placeholder="Last Name"
        value={formData.lastName}
        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
        required
      />

      <select
        value={formData.roleId}
        onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
        required
      >
        <option value="">Select Role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>{role.name}</option>
        ))}
      </select>

      <textarea
        placeholder="Personal message (optional)"
        value={formData.message}
        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>

      {result && result.success && (
        <div className="success">
          <p>Invitation sent to {result.data.email}</p>
          {!result.data.emailSent && (
            <div className="warning">
              <p>Email not sent. Share this link manually:</p>
              <code>
                {window.location.origin}/accept-invitation?token={result.data.invitationToken}
              </code>
            </div>
          )}
        </div>
      )}
    </form>
  );
};
```

---

### Step 2: Accept Invitation Page (`/accept-invitation?token=xxx`)

When a user clicks the invitation link in their email, they land on this page.

**Endpoint:** `POST /api/v1/users/accept-invitation`

**Request:**
```typescript
interface AcceptInvitationRequest {
  invitationToken: string;  // From URL query param
  password: string;         // Min 8 characters
}
```

**Response:**
```typescript
interface AcceptInvitationResponse {
  success: true;
  message: "Invitation accepted successfully";
  data: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: {
      id: string;
      code: string;
      name: string;
    };
    company: {
      id: string;
      name: string;
    };
    invitationAcceptedAt: string;
  };
}
```

**React Component:**
```tsx
const AcceptInvitation = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/v1/users/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationToken: token,
          password,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUserData(data.data);
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // No token provided
  if (!token) {
    return (
      <div className="error-container">
        <h2>Invalid Invitation</h2>
        <p>No invitation token provided.</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  // Success state
  if (success && userData) {
    return (
      <div className="success-container">
        <h2>Welcome, {userData.firstName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Company: {userData.company.name}</p>
        <p>Role: {userData.role.name}</p>
        <a href="/login" className="button">Go to Login</a>
      </div>
    );
  }

  // Form
  return (
    <form onSubmit={handleSubmit} className="accept-invitation-form">
      <h2>Complete Your Account</h2>
      <p>Create a password to finish setting up your account.</p>

      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          minLength={8}
          required
        />
        <small>Minimum 8 characters</small>
      </div>

      <div className="form-group">
        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
};
```

---

### Step 3: Manage Pending Invitations

**Get Pending Invitations:**
```typescript
const getPendingInvitations = async () => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('http://localhost:3000/api/v1/users/invitations', {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};
```

**Cancel Invitation:**
```typescript
const cancelInvitation = async (invitationId: string) => {
  const token = localStorage.getItem('accessToken');

  const response = await fetch(`http://localhost:3000/api/v1/users/invitations/${invitationId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return response.json();
};
```

**Pending Invitations Component:**
```tsx
const PendingInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvitations = async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3000/api/v1/users/invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setInvitations(data.data);
      }
      setLoading(false);
    };
    fetchInvitations();
  }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this invitation?')) return;

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`http://localhost:3000/api/v1/users/invitations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    if (data.success) {
      setInvitations(invitations.filter((inv) => inv.id !== id));
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Pending Invitations</h3>
      {invitations.length === 0 ? (
        <p>No pending invitations</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.firstName} {inv.lastName}</td>
                <td>{inv.email}</td>
                <td>{inv.role.name}</td>
                <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
                <td>
                  <button onClick={() => handleCancel(inv.id)}>Cancel</button>
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

## TypeScript Types

```typescript
// types/invitation.ts

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  message?: string;
}

export interface InvitationData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    code: string;
    name: string;
  };
  invitationToken: string;
  invitedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
  expiresAt: string;
  status: string;
  createdAt: string;
  emailSent: boolean;
}

export interface AcceptInvitationRequest {
  invitationToken: string;
  password: string;
}

export interface AcceptedUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
  company: {
    id: string;
    name: string;
  };
  invitationAcceptedAt: string;
}
```

---

## API Service

```typescript
// services/invitationApi.ts

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const invitationApi = {
  async inviteUser(data: InviteUserRequest, accessToken: string) {
    const response = await fetch(`${API_BASE_URL}/users/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async acceptInvitation(token: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/users/accept-invitation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invitationToken: token, password }),
    });
    return response.json();
  },

  async getPendingInvitations(accessToken: string) {
    const response = await fetch(`${API_BASE_URL}/users/invitations`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return response.json();
  },

  async cancelInvitation(id: string, accessToken: string) {
    const response = await fetch(`${API_BASE_URL}/users/invitations/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    return response.json();
  },
};
```

---

## Required Frontend Route

```
/accept-invitation?token=xxx
```

This is where invitation links point. Make sure this route is publicly accessible (no auth required).

---

## Error Handling

| Status | Error | Cause |
|--------|-------|-------|
| 400 | "This invitation has already been used or cancelled" | Invitation already accepted |
| 400 | "This invitation has expired" | Token expired (>7 days) |
| 404 | "Invalid invitation token" | Token doesn't exist |
| 409 | "User with this email already exists" | Email already registered |
| 409 | "A pending invitation already exists for this email" | Duplicate invitation |

---

## Checklist

- [ ] Invite user form with role selection
- [ ] Accept invitation page at `/accept-invitation`
- [ ] Pending invitations list
- [ ] Cancel invitation functionality
- [ ] Handle `emailSent: false` case (manual link sharing)
- [ ] Error handling for expired/invalid tokens
- [ ] Success messages and redirects
