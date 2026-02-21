# Frontend Password Reset Pages - Implementation Guide

## Overview

You need to create **2 pages** for the password reset flow:

1. **Forgot Password Page** (`/forgot-password`)
2. **Reset Password Page** (`/reset-password`)

---

## Page 1: Forgot Password (`/forgot-password`)

### Purpose
User enters their email to request a password reset link.

### API Endpoint
```
POST http://localhost:3000/api/v1/auth/forgot-password
Content-Type: application/json

Body: { "email": "user@example.com" }
```

### Response
```json
{
  "success": true,
  "message": "If an account exists with this email, you will receive a password reset link",
  "data": {
    "emailSent": true
  }
}
```

### UI Requirements

**Form Fields:**
- Email input (required, type="email")
- Submit button

**Success State:**
After submission, show:
```
✓ Check Your Email

If an account exists with user@example.com, you will receive
a password reset link.

The link expires in 1 hour.

[Back to Login]
```

**Notes:**
- Response is ALWAYS the same (whether email exists or not)
- This prevents attackers from checking which emails are registered

### Example Code Structure

```jsx
// /forgot-password page

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const response = await fetch('http://localhost:3000/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (response.ok) {
      setSubmitted(true);
    }
    setLoading(false);
  };

  if (submitted) {
    return (
      <div>
        <h2>Check Your Email</h2>
        <p>If an account exists with {email}, you will receive a reset link.</p>
        <p>The link expires in 1 hour.</p>
        <a href="/login">Back to Login</a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Forgot Password</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </button>
      <a href="/login">Back to Login</a>
    </form>
  );
};
```

---

## Page 2: Reset Password (`/reset-password`)

### Purpose
User clicks link in email and sets a new password.

### URL Format
```
http://localhost:3001/reset-password?token=abc123def456...
```

### Step 1: Validate Token (on page load)

**API Endpoint:**
```
GET http://localhost:3000/api/v1/auth/validate-reset-token?token=abc123...
```

**Response (Valid):**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "email": "us***@example.com"
  }
}
```

**Response (Invalid):**
```json
{
  "success": true,
  "data": {
    "valid": false
  }
}
```

### Step 2: Reset Password (on form submit)

**API Endpoint:**
```
POST http://localhost:3000/api/v1/auth/reset-password
Content-Type: application/json

Body: {
  "token": "abc123def456...",
  "newPassword": "NewPassword@123"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Password has been reset successfully. Please login with your new password."
}
```

**Response (Invalid Token):**
```json
{
  "success": false,
  "message": "Invalid or expired password reset token",
  "statusCode": 400
}
```

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

### UI Requirements

**Loading State:**
```
Validating your reset link...
```

**Invalid Token State:**
```
Invalid or Expired Link

This password reset link is invalid or has expired.
Reset links expire after 1 hour.

[Request New Reset Link]
```

**Form State:**
- Shows masked email (e.g., "us***@example.com")
- New password input (type="password")
- Confirm password input (type="password")
- Password requirements shown
- Submit button

**Success State:**
```
✓ Password Reset Successful!

Your password has been changed successfully.
You can now log in with your new password.

[Go to Login]
```

### Example Code Structure

```jsx
// /reset-password page

const ResetPassword = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  const [tokenStatus, setTokenStatus] = useState('loading'); // 'loading' | 'valid' | 'invalid'
  const [maskedEmail, setMaskedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        return;
      }

      const response = await fetch(
        `http://localhost:3000/api/v1/auth/validate-reset-token?token=${token}`
      );
      const data = await response.json();

      if (data.data?.valid) {
        setTokenStatus('valid');
        setMaskedEmail(data.data.email || '');
      } else {
        setTokenStatus('invalid');
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const response = await fetch('http://localhost:3000/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    const data = await response.json();

    if (data.success) {
      setSuccess(true);
    } else {
      setError(data.message || 'Failed to reset password');
    }
  };

  // Loading state
  if (tokenStatus === 'loading') {
    return <div>Validating your reset link...</div>;
  }

  // Invalid token
  if (tokenStatus === 'invalid') {
    return (
      <div>
        <h2>Invalid or Expired Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <a href="/forgot-password">Request New Reset Link</a>
      </div>
    );
  }

  // Success
  if (success) {
    return (
      <div>
        <h2>Password Reset Successful!</h2>
        <p>Your password has been changed.</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  // Form
  return (
    <form onSubmit={handleSubmit}>
      <h2>Reset Your Password</h2>
      <p>Resetting password for: {maskedEmail}</p>

      {error && <div className="error">{error}</div>}

      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
        minLength={8}
        required
      />
      <small>
        Must be 8+ characters with uppercase, lowercase, number, and special character (@$!%*?&)
      </small>

      <input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Confirm password"
        required
      />

      <button type="submit">Reset Password</button>
    </form>
  );
};
```

---

## Password Reset Flow Diagram

```
User clicks "Forgot Password" on login page
            ↓
    /forgot-password page
            ↓
    User enters email
            ↓
    POST /auth/forgot-password
            ↓
    Show "Check your email" message
            ↓
    (User checks email)
            ↓
    User clicks link in email
            ↓
    /reset-password?token=xxx
            ↓
    GET /auth/validate-reset-token
            ↓
    ├─ Invalid → Show error
    └─ Valid → Show password form
            ↓
    User enters new password
            ↓
    POST /auth/reset-password
            ↓
    Success → Redirect to /login
```

---

## Add Links to Login Page

On your login page, add:

```jsx
<a href="/forgot-password">Forgot Password?</a>
```

---

## Testing

1. **Start backend:** `npm run start:dev` (on port 3000)
2. **Test forgot password:**
   - Go to `/forgot-password`
   - Enter email: `hamid@mutetaxes.com`
   - Check email inbox for reset link

3. **Test reset password:**
   - Click link in email (or copy token)
   - Go to `/reset-password?token=YOUR_TOKEN`
   - Enter new password (must meet requirements)
   - Should redirect to login

---

## Checklist

- [ ] Create `/forgot-password` page
- [ ] Create `/reset-password` page
- [ ] Add "Forgot Password?" link on login page
- [ ] Password validation (8+ chars, uppercase, lowercase, number, special)
- [ ] Password confirmation match check
- [ ] Show masked email on reset page
- [ ] Handle invalid/expired tokens
- [ ] Success redirect to login
- [ ] Loading states
- [ ] Error messages

---

## API Base URL

Development: `http://localhost:3000/api/v1`

Production: Update to your production API URL