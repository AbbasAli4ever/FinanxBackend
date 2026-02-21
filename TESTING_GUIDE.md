# Testing Guide - Day 3 User Management APIs

## 🚀 Quick Start

### Option 1: Automated Test Script (Fastest)

```bash
# Run the automated test
./test-user-apis.sh
```

This will test all 10 endpoints automatically!

---

### Option 2: Postman (Best for Manual Testing)

**1. Download Postman:** https://www.postman.com/downloads/

**2. Import this collection:**

Create a new collection with these requests:

#### A. Login First
```
POST http://localhost:3000/api/v1/auth/login
Headers:
  Content-Type: application/json
Body:
{
  "email": "admin1769768866@test.com",
  "password": "NewPass1234"
}
```

Copy the `accessToken` from response.

#### B. Get All Users
```
GET http://localhost:3000/api/v1/users
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### C. Invite User
```
POST http://localhost:3000/api/v1/users/invite
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "email": "newuser@company.com",
  "firstName": "John",
  "lastName": "Doe",
  "roleId": "e1218957-7f4b-4d49-a2d5-465695a10803",
  "message": "Welcome!"
}
```

**Important:** Use this role ID: `e1218957-7f4b-4d49-a2d5-465695a10803`

#### D. Get Pending Invitations
```
GET http://localhost:3000/api/v1/users/invitations/pending
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### E. Accept Invitation (Public - No Auth)
```
POST http://localhost:3000/api/v1/users/accept-invitation
Headers:
  Content-Type: application/json
Body:
{
  "invitationToken": "token-from-previous-response",
  "password": "SecurePass123"
}
```

#### F. Update User
```
PATCH http://localhost:3000/api/v1/users/USER_ID_HERE
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "phone": "+1234567890"
}
```

#### G. Change Password
```
POST http://localhost:3000/api/v1/users/me/change-password
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
  Content-Type: application/json
Body:
{
  "currentPassword": "Pass1234",
  "newPassword": "NewPass1234"
}
```

#### H. Deactivate User
```
PATCH http://localhost:3000/api/v1/users/USER_ID_HERE/deactivate
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

#### I. Reactivate User
```
PATCH http://localhost:3000/api/v1/users/USER_ID_HERE/reactivate
Headers:
  Authorization: Bearer YOUR_TOKEN_HERE
```

---

### Option 3: Your Frontend

Use the complete API service from the integration guide:

**File: `src/services/users.api.ts`**

```typescript
import { usersApi } from './services/users.api';

// Example usage in React component
const MyComponent = () => {
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem('accessToken');

  useEffect(() => {
    // Get all users
    usersApi.getAllUsers(token).then(setUsers);
  }, []);

  const handleInvite = async () => {
    await usersApi.inviteUser({
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      roleId: 'e1218957-7f4b-4d49-a2d5-465695a10803'
    }, token);
  };
};
```

---

### Option 4: cURL (Command Line)

**Step 1: Get Token**
```bash
curl -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "admin1769768866@test.com",
    "password": "NewPass1234"
  }'
```

Copy the token from response.

**Step 2: Test Endpoints**
```bash
TOKEN="your-token-here"

# Get all users
curl 'http://localhost:3000/api/v1/users' \
  -H "Authorization: Bearer $TOKEN"

# Invite user
curl -X POST 'http://localhost:3000/api/v1/users/invite' \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "roleId": "e1218957-7f4b-4d49-a2d5-465695a10803",
    "message": "Welcome!"
  }'
```

---

## 🔑 Important Values

### Test Credentials
- **Email:** `admin1769768866@test.com`
- **Password:** `NewPass1234` (after running test script)
- **Original Password:** `Pass1234` (if test script not run)

### Role ID (Company Admin)
```
e1218957-7f4b-4d49-a2d5-465695a10803
```

Use this for the `roleId` field when inviting users.

---

## 🧪 Testing Checklist

- [ ] ✅ Get all users
- [ ] ✅ Get single user by ID
- [ ] ✅ Invite new user
- [ ] ✅ Get pending invitations
- [ ] ✅ Cancel invitation
- [ ] ✅ Accept invitation (public)
- [ ] ✅ Update user profile
- [ ] ✅ Change password
- [ ] ✅ Deactivate user
- [ ] ✅ Reactivate user

---

## 🚨 Common Issues

### Issue 1: 400 Bad Request on Invite
**Problem:** Invalid roleId

**Solution:** Use this exact role ID:
```
e1218957-7f4b-4d49-a2d5-465695a10803
```

### Issue 2: 401 Unauthorized
**Problem:** Token expired (15 min expiry)

**Solution:** Login again to get new token:
```bash
curl -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin1769768866@test.com","password":"NewPass1234"}'
```

### Issue 3: Server Not Running
**Solution:**
```bash
npm run start:dev
```

### Issue 4: Cannot Deactivate User
**Problem:** Trying to deactivate primary admin

**Solution:** Primary admin cannot be deactivated (security feature). Try deactivating a different user.

---

## 📝 Quick Test Sequence

1. **Login** → Get token
2. **Get all users** → Verify you see yourself
3. **Invite user** → Get invitation token
4. **Accept invitation** → Create new user account
5. **Get all users** → Should see 2 users now
6. **Update user** → Change phone number
7. **Deactivate user** → Deactivate the invited user (not primary admin)
8. **Reactivate user** → Reactivate them

---

## 🎯 Expected Results

### Successful Invite Response
```json
{
  "success": true,
  "message": "User invited successfully",
  "data": {
    "id": "uuid",
    "email": "newuser@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "role": {
      "code": "company_admin",
      "name": "Company Administrator"
    },
    "invitationToken": "64-char-hex-string",
    "expiresAt": "2026-02-06T...",
    "status": "pending"
  }
}
```

### Successful Get Users Response
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "uuid",
      "email": "admin@test.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": {
        "id": "uuid",
        "code": "company_admin",
        "name": "Company Administrator"
      },
      "isPrimaryAdmin": true,
      "isActive": true
    }
  ]
}
```

---

## 💡 Tips

1. **Save your token** - It expires in 15 minutes
2. **Use the automated script** - Fastest way to test everything
3. **Check response status** - 200/201 = success, 400 = validation error, 401 = auth error
4. **Role ID is required** - Always use the UUID, not the code
5. **Primary admin protected** - Cannot be deactivated or role changed

---

## 📚 Full Documentation

- [DAY_3_COMPLETION_SUMMARY.md](DAY_3_COMPLETION_SUMMARY.md) - Feature overview
- [DAY_3_FRONTEND_INTEGRATION_GUIDE.md](DAY_3_FRONTEND_INTEGRATION_GUIDE.md) - Complete API docs with React examples

---

**Happy Testing!** 🚀
