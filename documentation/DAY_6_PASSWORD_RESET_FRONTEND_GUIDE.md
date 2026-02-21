# Day 6 - Password Reset Frontend Integration Guide

**API Base URL:** `http://localhost:3000/api/v1`

---

## Overview

This guide covers frontend integration for the password reset feature.

---

## Password Reset Flow

```
User forgets password
         |
         v
┌─────────────────────┐
│  /forgot-password   │  User enters email
└─────────────────────┘
         |
         v
┌─────────────────────┐
│ POST forgot-password│  Backend sends email (if user exists)
└─────────────────────┘
         |
         v
┌─────────────────────┐
│  Check your email   │  Success message (same for all cases)
└─────────────────────┘
         |
         v (User clicks email link)
┌─────────────────────────────────┐
│ /reset-password?token=abc123... │
└─────────────────────────────────┘
         |
         v
┌─────────────────────┐
│ GET validate-token  │  Check if token is valid
└─────────────────────┘
         |
    ┌────┴────┐
    |         |
 Invalid    Valid
    |         |
    v         v
┌────────┐  ┌────────────┐
│ Error  │  │ Show form  │
│ page   │  │ Enter new  │
└────────┘  │ password   │
            └────────────┘
                  |
                  v
            ┌───────────────┐
            │POST reset-pwd │  Reset password
            └───────────────┘
                  |
                  v
            ┌───────────────┐
            │   Success!    │  Redirect to login
            └───────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| GET | `/api/v1/auth/validate-reset-token?token=xxx` | Validate token |
| POST | `/api/v1/auth/reset-password` | Reset password |

---

## Step 1: Forgot Password Page (`/forgot-password`)

### Endpoint

**POST** `/api/v1/auth/forgot-password`

### Request

```typescript
interface ForgotPasswordRequest {
  email: string;  // Required, valid email
}
```

### Response

```typescript
// Response is ALWAYS the same (prevents email enumeration)
interface ForgotPasswordResponse {
  success: true;
  message: "If an account exists with this email, you will receive a password reset link";
  data: {
    message: string;
    emailSent: boolean;  // true if email configured and sent
  };
}
```

### React Component

```tsx
import { useState, FormEvent } from 'react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success state - always show this regardless of whether email exists
  if (submitted) {
    return (
      <div className="forgot-password-success">
        <h2>Check Your Email</h2>
        <p>
          If an account exists with <strong>{email}</strong>, you will receive
          a password reset link.
        </p>
        <p className="note">
          The link expires in <strong>1 hour</strong>.
        </p>
        <p className="note">
          Don't see the email? Check your spam folder.
        </p>
        <a href="/login" className="link">Back to Login</a>
      </div>
    );
  }

  // Form
  return (
    <div className="forgot-password-container">
      <form onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p>Enter your email address and we'll send you a link to reset your password.</p>

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            autoFocus
          />
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        <div className="links">
          <a href="/login">Back to Login</a>
          <a href="/register">Create Account</a>
        </div>
      </form>
    </div>
  );
};

export default ForgotPassword;
```

---

## Step 2: Validate Reset Token

When user clicks the link in their email, first validate the token.

### Endpoint

**GET** `/api/v1/auth/validate-reset-token?token=xxx`

### Response (Valid Token)

```typescript
{
  success: true;
  message: "Token is valid";
  data: {
    valid: true;
    email: "us***@example.com";  // Masked email
  };
}
```

### Response (Invalid/Expired Token)

```typescript
{
  success: true;
  message: "Token is invalid or expired";
  data: {
    valid: false;
  };
}
```

---

## Step 3: Reset Password Page (`/reset-password?token=xxx`)

### Endpoint

**POST** `/api/v1/auth/reset-password`

### Request

```typescript
interface ResetPasswordRequest {
  token: string;       // From URL query param
  newPassword: string; // Must meet password requirements
}
```

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (@$!%*?&)

### Response (Success)

```typescript
{
  success: true;
  message: "Password has been reset successfully. Please login with your new password.";
  data: {
    message: string;
  };
}
```

### Response (Invalid Token)

```typescript
{
  success: false;
  message: "Invalid or expired password reset token";
  statusCode: 400;
}
```

### React Component

```tsx
import { useState, useEffect, FormEvent } from 'react';

const ResetPassword = () => {
  // Get token from URL
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  // States
  const [tokenStatus, setTokenStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenStatus('invalid');
        return;
      }

      try {
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
      } catch {
        setTokenStatus('invalid');
      }
    };

    validateToken();
  }, [token]);

  // Password validation
  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[@$!%*?&]/.test(password)) {
      return 'Password must contain at least one special character (@$!%*?&)';
    }
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);

    try {
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
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (tokenStatus === 'loading') {
    return (
      <div className="reset-password-loading">
        <p>Validating your reset link...</p>
      </div>
    );
  }

  // Invalid token state
  if (tokenStatus === 'invalid') {
    return (
      <div className="reset-password-invalid">
        <h2>Invalid or Expired Link</h2>
        <p>This password reset link is invalid or has expired.</p>
        <p>Reset links expire after 1 hour for security reasons.</p>
        <a href="/forgot-password" className="button">
          Request New Reset Link
        </a>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="reset-password-success">
        <h2>Password Reset Successful!</h2>
        <p>Your password has been changed successfully.</p>
        <p>You can now log in with your new password.</p>
        <a href="/login" className="button">
          Go to Login
        </a>
      </div>
    );
  }

  // Reset form
  return (
    <div className="reset-password-container">
      <form onSubmit={handleSubmit}>
        <h2>Reset Your Password</h2>

        {maskedEmail && (
          <p className="email-hint">
            Resetting password for: <strong>{maskedEmail}</strong>
          </p>
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="form-group">
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
            autoFocus
          />
          <small className="password-requirements">
            Must be at least 8 characters with uppercase, lowercase, number, and special character (@$!%*?&)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
          />
        </div>

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
};

export default ResetPassword;
```

---

## Password Strength Indicator (Optional)

```tsx
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const checks = [
    { label: 'At least 8 characters', valid: password.length >= 8 },
    { label: 'Uppercase letter', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', valid: /[a-z]/.test(password) },
    { label: 'Number', valid: /[0-9]/.test(password) },
    { label: 'Special character (@$!%*?&)', valid: /[@$!%*?&]/.test(password) },
  ];

  const strength = checks.filter((c) => c.valid).length;

  return (
    <div className="password-strength">
      <div className="strength-bar">
        <div
          className={`strength-fill strength-${strength}`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>
      <ul className="strength-checks">
        {checks.map((check, i) => (
          <li key={i} className={check.valid ? 'valid' : 'invalid'}>
            {check.valid ? '✓' : '○'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
};
```

---

## TypeScript Types

```typescript
// types/passwordReset.ts

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  data: {
    message: string;
    emailSent: boolean;
  };
}

export interface ValidateResetTokenResponse {
  success: boolean;
  message: string;
  data: {
    valid: boolean;
    email?: string;  // Masked email, only present if valid
  };
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
  data?: {
    message: string;
  };
}
```

---

## API Service

```typescript
// services/passwordResetApi.ts

const API_BASE_URL = 'http://localhost:3000/api/v1';

export const passwordResetApi = {
  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    return response.json();
  },

  async validateResetToken(token: string): Promise<ValidateResetTokenResponse> {
    const response = await fetch(
      `${API_BASE_URL}/auth/validate-reset-token?token=${token}`
    );
    return response.json();
  },

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    return response.json();
  },
};
```

---

## Required Frontend Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/forgot-password` | Request password reset | No |
| `/reset-password` | Reset password (with `?token=xxx`) | No |

---

## Security Features

| Feature | Description |
|---------|-------------|
| **Email Enumeration Prevention** | Same response whether email exists or not |
| **Token Hashing** | Tokens stored as SHA-256 hashes in database |
| **1-Hour Expiry** | Tokens expire after 1 hour |
| **Session Invalidation** | All refresh tokens revoked after reset |
| **Email Masking** | Only first 2 characters shown |
| **Strong Password Required** | Enforced on frontend and backend |

---

## Error Handling

| Error | Message | User Action |
|-------|---------|-------------|
| Invalid token | "Invalid or expired password reset token" | Request new link |
| Weak password | Validation error | Fix password |
| Network error | "Network error" | Try again |

---

## Testing

### Test with cURL

```bash
# Request password reset
curl -X POST "http://localhost:3000/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com"}'

# Validate token
curl "http://localhost:3000/api/v1/auth/validate-reset-token?token=YOUR_TOKEN"

# Reset password
curl -X POST "http://localhost:3000/api/v1/auth/reset-password" \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN", "newPassword": "NewPass@123"}'
```

---

## Checklist

- [ ] Forgot password page at `/forgot-password`
- [ ] Reset password page at `/reset-password`
- [ ] Token validation before showing form
- [ ] Password strength indicator (optional)
- [ ] Password confirmation field
- [ ] Client-side password validation
- [ ] Loading states during API calls
- [ ] Error messages displayed
- [ ] Success state with redirect to login
- [ ] Handle invalid/expired token gracefully
- [ ] "Back to Login" links
