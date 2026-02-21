# Email Configuration Guide

## Overview

FinanX uses email for:
- **User Invitations** - Send invitation links to new users
- **Welcome Emails** - Confirm successful account creation
- **Password Reset** - Reset forgotten passwords

---

## Quick Setup

### 1. Add Email Configuration to `.env`

```env
# Frontend URL (for email links)
FRONTEND_URL="http://localhost:3001"

# Email Configuration (SMTP)
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="your-app-password"
MAIL_FROM_EMAIL="noreply@yourcompany.com"
MAIL_FROM_NAME="FinanX"
```

### 2. Restart the Server

```bash
npm run start:dev
```

### 3. Verify Configuration

Check the logs for:
```
[EmailService] Email transporter is ready to send emails
```

If email is NOT configured, you'll see:
```
[EmailService] Email configuration incomplete. Email sending will be disabled.
```

---

## Email Provider Setup

### Option 1: Gmail (Development/Small Scale)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Generate an "App Password":
   - Go to Security -> 2-Step Verification -> App passwords
   - Select "Mail" and your device
   - Copy the 16-character password

```env
MAIL_HOST="smtp.gmail.com"
MAIL_PORT=587
MAIL_USER="your-email@gmail.com"
MAIL_PASSWORD="xxxx xxxx xxxx xxxx"  # App password (no spaces)
```

### Option 2: Mailtrap (Development/Testing)

[Mailtrap](https://mailtrap.io) catches all emails in a sandbox - perfect for testing.

1. Create free account at mailtrap.io
2. Go to Email Testing -> Inboxes -> My Inbox
3. Click "Show Credentials"

```env
MAIL_HOST="sandbox.smtp.mailtrap.io"
MAIL_PORT=2525
MAIL_USER="your-mailtrap-username"
MAIL_PASSWORD="your-mailtrap-password"
```

### Option 3: SendGrid (Production)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Create an API Key with Mail Send permissions
3. Verify your sender domain

```env
MAIL_HOST="smtp.sendgrid.net"
MAIL_PORT=587
MAIL_USER="apikey"
MAIL_PASSWORD="your-sendgrid-api-key"
MAIL_FROM_EMAIL="noreply@yourdomain.com"
```

### Option 4: AWS SES (Production)

1. Set up AWS SES in your region
2. Verify your sender email/domain
3. Create SMTP credentials

```env
MAIL_HOST="email-smtp.us-east-1.amazonaws.com"
MAIL_PORT=587
MAIL_USER="your-ses-smtp-username"
MAIL_PASSWORD="your-ses-smtp-password"
MAIL_FROM_EMAIL="noreply@yourdomain.com"
```

### Option 5: Ethereal (Quick Testing)

[Ethereal](https://ethereal.email) provides disposable SMTP accounts.

1. Go to ethereal.email
2. Click "Create Ethereal Account"
3. Use the provided credentials

```env
MAIL_HOST="smtp.ethereal.email"
MAIL_PORT=587
MAIL_USER="generated-user@ethereal.email"
MAIL_PASSWORD="generated-password"
```

---

## Email Templates

### Invitation Email

Sent when an admin invites a new user.

**Subject:** `You're invited to join [Company Name] on FinanX`

**Contains:**
- Recipient name
- Inviter name
- Company name
- Role being assigned
- Optional personal message
- Accept invitation button/link
- Expiration date (7 days)

### Welcome Email

Sent after a user accepts an invitation.

**Subject:** `Welcome to [Company Name] on FinanX!`

**Contains:**
- User's name
- Company name
- Login button/link

### Password Reset Email

Sent when a user requests to reset their password.

**Subject:** `Reset Your FinanX Password`

**Contains:**
- User's name
- Reset link (expires in 1 hour)
- Security warning

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | No | http://localhost:3001 | Frontend base URL for links |
| `MAIL_HOST` | Yes* | - | SMTP server hostname |
| `MAIL_PORT` | No | 587 | SMTP port (587 or 465) |
| `MAIL_USER` | Yes* | - | SMTP username |
| `MAIL_PASSWORD` | Yes* | - | SMTP password |
| `MAIL_FROM_EMAIL` | No | noreply@finanx.com | Sender email address |
| `MAIL_FROM_NAME` | No | FinanX | Sender display name |

*Required for email functionality. System works without email but won't send invitations or password reset emails.

---

## Troubleshooting

### Email Not Sending

1. **Check Configuration**
   ```bash
   grep -i "mail" .env
   ```

2. **Check Server Logs**
   ```bash
   npm run start:dev 2>&1 | grep -i email
   ```

3. **Verify SMTP Credentials**
   - Test with a tool like `swaks` or online SMTP testers
   - Make sure the password is correct (App Password for Gmail)

### Gmail Specific Issues

- **"Less secure app access"** - Use App Passwords instead
- **"Authentication failed"** - Enable 2FA and create App Password
- **Rate limits** - Gmail has sending limits (500/day for free accounts)

### Common Errors

| Error | Solution |
|-------|----------|
| `EAUTH` | Wrong username/password |
| `ECONNREFUSED` | Wrong host/port |
| `ETIMEDOUT` | Firewall blocking SMTP |
| `Invalid login` | Use App Password (Gmail) |

---

## Testing Without Email

If you don't want to configure email for development:

1. The system works without email configuration
2. Invitation tokens are returned in API responses
3. Check server logs for password reset tokens (in development)

**Invitation without email:**
```bash
# Create invitation - token returned in response
curl -X POST "http://localhost:3000/api/v1/users/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "firstName": "Test", "lastName": "User", "roleId": "..."}'

# Response includes invitationToken - use it directly
```

**Password reset without email:**
```bash
# Request reset - check server logs for token
curl -X POST "http://localhost:3000/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@test.com"}'

# For testing, you can query the database:
# SELECT password_reset_token FROM users WHERE email = 'admin@test.com';
# Note: Token in DB is hashed, so use a test email service like Mailtrap
```

---

## Files Reference

```
src/modules/email/
├── email.module.ts       # Global email module
└── email.service.ts      # Email sending service with templates
```

---

## Related Documentation

- [DAY_6_EMAIL_FRONTEND_INTEGRATION_GUIDE.md](DAY_6_EMAIL_FRONTEND_INTEGRATION_GUIDE.md) - Frontend integration for invitations
- [DAY_6_PASSWORD_RESET_FRONTEND_GUIDE.md](DAY_6_PASSWORD_RESET_FRONTEND_GUIDE.md) - Frontend integration for password reset
- [DAY_6_COMPLETION_SUMMARY.md](DAY_6_COMPLETION_SUMMARY.md) - Day 6 implementation summary
