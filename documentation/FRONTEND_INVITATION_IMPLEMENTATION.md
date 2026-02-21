# Frontend Invitation Pages - Implementation Guide

## Overview

You need to create **3 pages** for the invitation flow:

1. **Invite User Form** (`/users/invite`) - Admin invites a new user
2. **Accept Invitation Page** (`/accept-invitation`) - Invited user creates account
3. **Pending Invitations List** (`/users/invitations`) - Admin manages invitations

---

## Page 1: Invite User Form (`/users/invite`)

### Purpose
Admin fills a form to invite a new user to the company.

### API Endpoint
```
POST http://localhost:3000/api/v1/users/invite
Authorization: Bearer <accessToken>
Content-Type: application/json

Body:
{
  "email": "newuser@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "roleId": "uuid-of-role",
  "message": "Welcome to our team!"   // optional
}
```

### Response (201)
```json
{
  "success": true,
  "message": "User invited successfully",
  "data": {
    "id": "invitation-uuid",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "code": "standard",
      "name": "Standard User"
    },
    "invitationToken": "abc123def456...",
    "invitedBy": {
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@company.com"
    },
    "expiresAt": "2026-02-12T00:00:00.000Z",
    "status": "pending",
    "createdAt": "2026-02-05T00:00:00.000Z",
    "emailSent": true
  }
}
```

### Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 409 | "User with this email already exists in your company" | Email already registered |
| 409 | "A pending invitation already exists for this email" | Duplicate invitation |
| 404 | "Role not found" | Invalid roleId |
| 403 | Forbidden | User doesn't have `user:invite` permission |

### Required: Fetch Roles First

Before showing the form, fetch available roles for the dropdown:

```
GET http://localhost:3000/api/v1/roles
Authorization: Bearer <accessToken>
```

Response:
```json
{
  "success": true,
  "data": [
    { "id": "uuid-1", "code": "company_admin", "name": "Company Admin" },
    { "id": "uuid-2", "code": "accountant", "name": "Accountant" },
    { "id": "uuid-3", "code": "standard", "name": "Standard User" },
    { "id": "uuid-4", "code": "viewer", "name": "View Only" }
  ]
}
```

### UI Requirements

**Form Fields:**
- Email input (required, type="email")
- First Name input (required)
- Last Name input (required)
- Role dropdown (required, populated from `/roles` API)
- Message textarea (optional)
- Submit button

**Success State:**
```
Invitation Sent!

An invitation has been sent to newuser@example.com
Role: Standard User
Expires: Feb 12, 2026

[Invite Another]  [View Pending Invitations]
```

**If emailSent is false:**
```
Invitation Created (Email Not Sent)

Email could not be sent. Share this link manually:
http://localhost:3001/accept-invitation?token=abc123def456...

[Copy Link]
```

### Example Code

```jsx
const InviteUser = () => {
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
  const [error, setError] = useState('');

  // Fetch roles on mount
  useEffect(() => {
    const fetchRoles = async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3000/api/v1/roles', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setRoles(data.data);
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

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

    if (data.success) {
      setResult(data.data);
    } else {
      setError(data.message);
    }
    setLoading(false);
  };

  // Success state
  if (result) {
    return (
      <div>
        <h2>Invitation Sent!</h2>
        <p>Invited: {result.firstName} {result.lastName} ({result.email})</p>
        <p>Role: {result.role.name}</p>
        <p>Expires: {new Date(result.expiresAt).toLocaleDateString()}</p>

        {!result.emailSent && (
          <div className="warning">
            <p>Email not sent. Share this link manually:</p>
            <code>
              {window.location.origin}/accept-invitation?token={result.invitationToken}
            </code>
            <button onClick={() => navigator.clipboard.writeText(
              `${window.location.origin}/accept-invitation?token=${result.invitationToken}`
            )}>
              Copy Link
            </button>
          </div>
        )}

        <button onClick={() => { setResult(null); setFormData({ email: '', firstName: '', lastName: '', roleId: '', message: '' }); }}>
          Invite Another
        </button>
        <a href="/users/invitations">View Pending Invitations</a>
      </div>
    );
  }

  // Form
  return (
    <form onSubmit={handleSubmit}>
      <h2>Invite New User</h2>

      {error && <div className="error">{error}</div>}

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
    </form>
  );
};
```

### Permission Required
User must have `user:invite` permission. If not, show "Access Denied" or hide this page.

---

## Page 2: Accept Invitation (`/accept-invitation`)

### Purpose
Invited user clicks email link and creates their account by setting a password.

### URL Format
```
http://localhost:3001/accept-invitation?token=abc123def456...
```

### API Endpoint
```
POST http://localhost:3000/api/v1/users/accept-invitation
Content-Type: application/json
(NO Authorization header - this is a PUBLIC endpoint)

Body:
{
  "invitationToken": "abc123def456...",
  "password": "SecurePass@123"
}
```

### Response (201)
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "id": "new-user-uuid",
    "email": "newuser@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": {
      "id": "role-uuid",
      "code": "standard",
      "name": "Standard User"
    },
    "company": {
      "id": "company-uuid",
      "name": "My Company"
    },
    "invitationAcceptedAt": "2026-02-05T12:00:00.000Z"
  }
}
```

### Error Responses

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "This invitation has already been used or cancelled" | Already accepted/cancelled |
| 400 | "This invitation has expired" | Token older than 7 days |
| 404 | "Invalid invitation token" | Token doesn't exist |
| 409 | "User with this email already exists" | Email already registered |

### Password Requirements
- Minimum 8 characters

### UI Requirements

**No Token:**
```
Invalid Invitation

No invitation token was provided.

[Go to Login]
```

**Form:**
- Company name / role info (if available)
- Password input (type="password", min 8 chars)
- Confirm password input
- Submit button: "Create Account"

**Success State:**
```
Welcome, John!

Your account has been created successfully.
Company: My Company
Role: Standard User

[Go to Login]
```

**Error States:**
- Expired: "This invitation has expired. Ask your admin to send a new one."
- Already Used: "This invitation has already been used."
- Invalid: "This invitation link is invalid."

### Example Code

```jsx
const AcceptInvitation = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  // No token
  if (!token) {
    return (
      <div>
        <h2>Invalid Invitation</h2>
        <p>No invitation token provided.</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  const handleSubmit = async (e) => {
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
    setLoading(false);
  };

  // Success
  if (success && userData) {
    return (
      <div>
        <h2>Welcome, {userData.firstName}!</h2>
        <p>Your account has been created successfully.</p>
        <p>Company: {userData.company.name}</p>
        <p>Role: {userData.role.name}</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  // Form
  return (
    <form onSubmit={handleSubmit}>
      <h2>Complete Your Account</h2>
      <p>Create a password to finish setting up your account.</p>

      {error && <div className="error">{error}</div>}

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Create password"
        minLength={8}
        required
      />
      <small>Minimum 8 characters</small>

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating Account...' : 'Create Account'}
      </button>
    </form>
  );
};
```

### Important
This page must be **PUBLIC** (no login required). The invited user doesn't have an account yet.

---

## Page 3: Pending Invitations List (`/users/invitations`)

### Purpose
Admin views and manages pending invitations.

### Get Pending Invitations

**API Endpoint:**
```
GET http://localhost:3000/api/v1/users/invitations/pending
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "invitation-uuid",
      "email": "newuser@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": {
        "code": "standard",
        "name": "Standard User"
      },
      "invitedBy": {
        "firstName": "Admin",
        "lastName": "User",
        "email": "admin@company.com"
      },
      "expiresAt": "2026-02-12T00:00:00.000Z",
      "createdAt": "2026-02-05T00:00:00.000Z"
    }
  ]
}
```

### Cancel Invitation

**API Endpoint:**
```
PATCH http://localhost:3000/api/v1/users/invitations/:id/cancel
Authorization: Bearer <accessToken>
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation cancelled successfully"
}
```

### UI Requirements

**Table Columns:**
- Name (firstName + lastName)
- Email
- Role
- Invited By
- Expires On
- Actions (Cancel button)

**Empty State:**
```
No Pending Invitations

No invitations are currently pending.

[Invite New User]
```

### Example Code

```jsx
const PendingInvitations = () => {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvitations = async () => {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('http://localhost:3000/api/v1/users/invitations/pending', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setInvitations(data.data);
      setLoading(false);
    };
    fetchInvitations();
  }, []);

  const handleCancel = async (id) => {
    if (!confirm('Cancel this invitation?')) return;

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`http://localhost:3000/api/v1/users/invitations/${id}/cancel`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    if (data.success) {
      setInvitations(invitations.filter((inv) => inv.id !== id));
    }
  };

  if (loading) return <div>Loading...</div>;

  if (invitations.length === 0) {
    return (
      <div>
        <h2>Pending Invitations</h2>
        <p>No pending invitations.</p>
        <a href="/users/invite">Invite New User</a>
      </div>
    );
  }

  return (
    <div>
      <div className="header">
        <h2>Pending Invitations</h2>
        <a href="/users/invite">Invite New User</a>
      </div>

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
          {invitations.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.firstName} {inv.lastName}</td>
              <td>{inv.email}</td>
              <td>{inv.role.name}</td>
              <td>{inv.invitedBy.firstName} {inv.invitedBy.lastName}</td>
              <td>{new Date(inv.expiresAt).toLocaleDateString()}</td>
              <td>
                <button onClick={() => handleCancel(inv.id)}>Cancel</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Permissions Required
- `user:view` to see pending invitations
- `user:delete` to cancel invitations

---

## Invitation Flow Diagram

```
Admin clicks "Invite User"
            |
    /users/invite page
            |
    Admin fills form (email, name, role)
            |
    POST /users/invite
            |
    Backend creates invitation + sends email
            |
    ├─ emailSent: true → "Invitation sent!"
    └─ emailSent: false → Show manual link to copy
            |
    (Invited user receives email)
            |
    User clicks link in email
            |
    /accept-invitation?token=abc123...
            |
    User sets password
            |
    POST /users/accept-invitation
            |
    Account created → Redirect to /login
```

---

## Business Rules

| Rule | Detail |
|------|--------|
| Invitation expires in | 7 days |
| Duplicate email | Cannot invite same email twice (if pending or already a user) |
| Password minimum | 8 characters |
| Accept invitation page | PUBLIC (no login required) |
| Invite/Cancel pages | Requires login + permissions |
| Status flow | pending → accepted / cancelled / expired |
| Email verified | Automatically verified on acceptance |

---

## Routes Summary

| Route | Auth | Permission | Description |
|-------|------|------------|-------------|
| `/users/invite` | Yes | `user:invite` | Invite new user form |
| `/users/invitations` | Yes | `user:view` | Pending invitations list |
| `/accept-invitation?token=xxx` | **No** | None | Public - accept invitation |

---

## Testing

1. **Login as admin**
2. **Invite a user:**
   - Go to `/users/invite`
   - Fill email, name, select role
   - Submit
3. **Check invited user's email**
   - Click the invitation link
4. **Accept invitation:**
   - Set password on `/accept-invitation` page
   - Should see success message
5. **Login as new user:**
   - Go to `/login` with invited email + password
6. **Manage invitations:**
   - Go to `/users/invitations`
   - Cancel any pending invitation

---

## Checklist

- [ ] Invite user form at `/users/invite`
- [ ] Fetch and display roles in dropdown
- [ ] Handle `emailSent: false` (show manual link)
- [ ] Accept invitation page at `/accept-invitation`
- [ ] Accept invitation page is PUBLIC (no auth)
- [ ] Password + confirm password fields
- [ ] Show success with company name and role
- [ ] Pending invitations list at `/users/invitations`
- [ ] Cancel invitation functionality
- [ ] Empty state for no pending invitations
- [ ] Error handling (duplicate email, expired token, invalid token)
- [ ] Loading states on all pages
- [ ] Permission checks (hide pages if user lacks permission)