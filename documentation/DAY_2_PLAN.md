# Day 2 Plan - Authentication & RBAC Foundation

**Date:** January 29, 2026
**Focus:** JWT Authentication System & Role-Based Access Control
**Estimated Time:** 6-8 hours
**Complexity:** Medium-High

---

## 🎯 Day 2 Objectives

Build the complete authentication system with JWT tokens and implement the foundational RBAC (Role-Based Access Control) structure following the QuickBooks-style design from our documentation.

---

## 📋 Task Breakdown

### **Phase 1: Database Schema Extension** (45 min)

#### Task 1.1: Add Roles & Permissions Tables
- [ ] Update `prisma/schema.prisma` with new models:
  - `Role` model (system-defined roles)
  - `Permission` model (granular permissions)
  - `RolePermission` model (many-to-many relationship)
- [ ] Add `role_id` foreign key to `User` model
- [ ] Create migration: `npx prisma migrate dev --name add_rbac_tables`

**Expected Tables:**
- `roles` (5 system roles: company_admin, standard, limited, reports_only, time_tracking_only)
- `permissions` (~50 permissions covering all modules)
- `role_permissions` (junction table)

#### Task 1.2: Create Seed Data
- [ ] Create `prisma/seed.ts` file
- [ ] Seed 5 predefined roles with descriptions
- [ ] Seed initial permissions (sales, expenses, banking, reports, settings categories)
- [ ] Map permissions to roles (role_permissions)
- [ ] Update `package.json` prisma seed script
- [ ] Run: `npm run prisma:seed`

**Deliverable:** Database with roles and permissions ready for authentication

---

### **Phase 2: Common Utilities** (30 min)

#### Task 2.1: Password Hashing Utility
- [ ] Create `src/common/utils/bcrypt.util.ts`
  - `hashPassword(password: string): Promise<string>`
  - `comparePassword(password: string, hash: string): Promise<boolean>`

#### Task 2.2: Token Utilities
- [ ] Create `src/common/utils/token.util.ts`
  - Generate secure random tokens
  - Hash tokens for storage

#### Task 2.3: Response Interceptor
- [ ] Create `src/common/interceptors/transform.interceptor.ts`
  - Automatically wrap all responses in `ApiResponseDto` format
  - Handle success responses consistently

**Deliverable:** Reusable utilities for auth operations

---

### **Phase 3: DTOs (Data Transfer Objects)** (30 min)

#### Task 3.1: Auth DTOs
- [ ] Create `src/modules/auth/dto/register.dto.ts`
  - Company registration (name, email)
  - Primary admin user (first_name, last_name, email, password)
  - Validation rules

- [ ] Create `src/modules/auth/dto/login.dto.ts`
  - Email validation
  - Password (min 8 chars)

- [ ] Create `src/modules/auth/dto/refresh-token.dto.ts`
  - Refresh token string

- [ ] Create `src/modules/auth/dto/auth-response.dto.ts`
  - Access token
  - Refresh token
  - User info
  - Company info
  - Permissions list

**Deliverable:** Type-safe request/response DTOs with validation

---

### **Phase 4: Auth Module Core** (90 min)

#### Task 4.1: Auth Service
Create `src/modules/auth/auth.service.ts` with methods:

- [ ] `register(registerDto: RegisterDto): Promise<AuthResponseDto>`
  - Create company
  - Create primary admin user with hashed password
  - Assign "company_admin" role
  - Generate tokens
  - Return full auth response

- [ ] `login(loginDto: LoginDto): Promise<AuthResponseDto>`
  - Find user by email
  - Verify password
  - Check account status (is_active, locked)
  - Update last_login_at, last_login_ip
  - Reset failed login attempts
  - Load user permissions
  - Generate JWT access token (15min)
  - Generate refresh token (7 days)
  - Store refresh token hash in database
  - Return auth response

- [ ] `refreshToken(refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto>`
  - Validate refresh token
  - Check if token is revoked or expired
  - Generate new access token
  - Optionally rotate refresh token
  - Return new tokens

- [ ] `logout(userId: string, refreshToken: string): Promise<void>`
  - Revoke refresh token
  - Mark as revoked_at timestamp

- [ ] `validateUser(email: string, password: string): Promise<User | null>`
  - Used by Passport JWT strategy
  - Validate credentials
  - Return user if valid

#### Task 4.2: Auth Controller
Create `src/modules/auth/auth.controller.ts` with endpoints:

- [ ] `POST /api/v1/auth/register` - Register new company + admin
- [ ] `POST /api/v1/auth/login` - Login user
- [ ] `POST /api/v1/auth/refresh` - Refresh access token
- [ ] `POST /api/v1/auth/logout` - Logout (revoke refresh token)
- [ ] `GET /api/v1/auth/me` - Get current user info (protected)

#### Task 4.3: Auth Module
- [ ] Create `src/modules/auth/auth.module.ts`
- [ ] Import `JwtModule.register()` with configuration
- [ ] Import `PassportModule`
- [ ] Provide `AuthService`
- [ ] Export auth services for use in other modules

**Deliverable:** Working authentication endpoints

---

### **Phase 5: JWT Strategy & Guards** (60 min)

#### Task 5.1: JWT Strategy
- [ ] Create `src/modules/auth/strategies/jwt.strategy.ts`
  - Extend `PassportStrategy(Strategy)`
  - Extract JWT from Authorization header
  - Validate token signature
  - Load user from database
  - Attach user to request object

#### Task 5.2: JWT Auth Guard
- [ ] Create `src/common/guards/jwt-auth.guard.ts`
  - Extend `AuthGuard('jwt')`
  - Protect routes requiring authentication

#### Task 5.3: Permissions Guard
- [ ] Create `src/common/guards/permissions.guard.ts`
  - Check if user has required permissions
  - Support multiple permissions (AND/OR logic)
  - Bypass for primary admin

**Deliverable:** Route protection with JWT + permissions

---

### **Phase 6: Decorators** (30 min)

#### Task 6.1: Current User Decorator
- [ ] Create `src/common/decorators/current-user.decorator.ts`
  - Extract user from request
  - Usage: `@CurrentUser() user: User`

#### Task 6.2: Permissions Decorator
- [ ] Create `src/common/decorators/permissions.decorator.ts`
  - Define required permissions for routes
  - Usage: `@RequirePermissions('invoice:create', 'invoice:view')`

#### Task 6.3: Public Route Decorator
- [ ] Create `src/common/decorators/public.decorator.ts`
  - Mark routes as public (skip JWT guard)
  - Usage: `@Public()`

**Deliverable:** Developer-friendly decorators

---

### **Phase 7: Integration & Testing** (90 min)

#### Task 7.1: Update Main App
- [ ] Update `src/main.ts`:
  - Add global validation pipe
  - Add transform interceptor
  - Configure CORS
  - Add Helmet security headers
  - Set global API prefix: `/api/v1`

#### Task 7.2: Test Registration Flow
```bash
# Test: Register new company + admin
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "company": {
      "name": "Test Company LLC",
      "email": "info@testcompany.com"
    },
    "user": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@testcompany.com",
      "password": "SecurePass123!"
    }
  }'
```

Expected: 201 Created with access_token, refresh_token, user, company

#### Task 7.3: Test Login Flow
```bash
# Test: Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@testcompany.com",
    "password": "SecurePass123!"
  }'
```

Expected: 200 OK with tokens and user info

#### Task 7.4: Test Protected Route
```bash
# Test: Get current user (requires JWT)
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

Expected: 200 OK with user details

#### Task 7.5: Test Token Refresh
```bash
# Test: Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

Expected: 200 OK with new access_token

#### Task 7.6: Test Logout
```bash
# Test: Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "<refresh_token>"
  }'
```

Expected: 200 OK, refresh token revoked

**Deliverable:** All auth endpoints tested and working

---

### **Phase 8: Documentation** (30 min)

#### Task 8.1: Create API Documentation
- [ ] Document all auth endpoints with examples
- [ ] Create `documentation/API_AUTH_ENDPOINTS.md`

#### Task 8.2: Update Day 2 Completion Report
- [ ] Create `documentation/DAY_2_COMPLETION_REPORT.md`
- [ ] List all completed features
- [ ] Include test results
- [ ] Add code snippets for frontend integration

#### Task 8.3: Create Postman/Thunder Client Collection
- [ ] Export API collection for testing
- [ ] Include environment variables setup

**Deliverable:** Complete documentation for auth system

---

## 📊 Expected Deliverables

### **Code Files Created (~20 files)**

```
prisma/
├── seed.ts                                    # NEW

src/
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts         # NEW
│   │   ├── permissions.decorator.ts          # NEW
│   │   └── public.decorator.ts               # NEW
│   ├── guards/
│   │   ├── jwt-auth.guard.ts                 # NEW
│   │   └── permissions.guard.ts              # NEW
│   ├── interceptors/
│   │   └── transform.interceptor.ts          # NEW
│   └── utils/
│       ├── bcrypt.util.ts                    # NEW
│       └── token.util.ts                     # NEW
│
└── modules/
    └── auth/
        ├── dto/
        │   ├── register.dto.ts               # NEW
        │   ├── login.dto.ts                  # NEW
        │   ├── refresh-token.dto.ts          # NEW
        │   └── auth-response.dto.ts          # NEW
        ├── strategies/
        │   └── jwt.strategy.ts               # NEW
        ├── auth.controller.ts                # NEW
        ├── auth.service.ts                   # NEW
        └── auth.module.ts                    # NEW
```

### **Database Changes**
- 3 new tables: `roles`, `permissions`, `role_permissions`
- Updated `users` table with `role_id` foreign key
- Seeded data: 5 roles, ~50 permissions, role mappings

### **API Endpoints (6 new)**
1. `POST /api/v1/auth/register` - Company + admin registration
2. `POST /api/v1/auth/login` - User login
3. `POST /api/v1/auth/refresh` - Refresh access token
4. `POST /api/v1/auth/logout` - User logout
5. `GET /api/v1/auth/me` - Get current user (protected)
6. Health check (from Day 1)

---

## 🧪 Testing Checklist

- [ ] User can register new company with admin account
- [ ] Password is hashed with bcrypt (verify in database)
- [ ] User can login with correct credentials
- [ ] Login fails with incorrect password
- [ ] Login fails for inactive user
- [ ] Access token expires after 15 minutes
- [ ] Refresh token works for 7 days
- [ ] Protected routes require valid JWT
- [ ] Invalid JWT returns 401 Unauthorized
- [ ] Logout revokes refresh token
- [ ] User cannot use revoked refresh token
- [ ] Current user endpoint returns correct data
- [ ] Permissions are loaded with user

---

## 🔐 Security Checklist

- [ ] Passwords hashed with bcrypt (cost factor 10+)
- [ ] JWT secret is strong (from environment)
- [ ] Refresh tokens stored as hash in database
- [ ] Tokens have expiration times
- [ ] Failed login attempts tracked (for future lockout)
- [ ] CORS configured properly
- [ ] Helmet security headers enabled
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented (Prisma parameterized queries)

---

## 📈 Success Metrics

| Metric | Target | Verification |
|--------|--------|--------------|
| New API Endpoints | 5 | Postman tests pass |
| Database Tables | +3 (total 6) | `\dt` in psql |
| Seed Data | 5 roles, 50 perms | Query roles table |
| Auth Flow | End-to-end working | Manual testing |
| JWT Validation | Working | Protected route test |
| Response Time | <200ms | cURL timing |
| Code Coverage | >70% | Jest tests |

---

## 🚧 Potential Challenges & Solutions

### Challenge 1: JWT Token Size
**Issue:** Including all permissions in JWT makes token large
**Solution:** Store only user_id and role_id in JWT, load permissions from DB on each request (cached)

### Challenge 2: Refresh Token Rotation
**Issue:** Should we rotate refresh tokens on each use?
**Solution:** Yes, rotate for better security. Invalidate old token when issuing new one.

### Challenge 3: Concurrent Logins
**Issue:** Should users be able to login from multiple devices?
**Solution:** Yes, allow multiple refresh tokens per user (track by device)

### Challenge 4: Password Reset Flow
**Issue:** Not included in Day 2 scope
**Solution:** Defer to Day 3 or later. Focus on core auth first.

---

## 🎯 Day 2 Goals Summary

By end of Day 2, we should have:

✅ **Complete Authentication System**
- User registration with company creation
- Login with JWT tokens
- Token refresh mechanism
- Logout functionality

✅ **RBAC Foundation**
- Roles and permissions in database
- Permission checking guards
- Role assignment on registration

✅ **Security**
- Password hashing
- JWT protection
- Refresh token management

✅ **Developer Experience**
- Clean decorators (@CurrentUser, @RequirePermissions)
- Type-safe DTOs
- Standardized API responses

✅ **Documentation**
- API endpoint documentation
- Day 2 completion report
- Testing guide

---

## 📚 Reference Materials

- **Day 1 Report:** `documentation/DAY_1_COMPLETION_REPORT.md`
- **RBAC Spec:** `documentation/rbac/RBAC_MODULE_QUICKBOOKS_STYLE.md`
- **Prisma Schema:** `prisma/schema.prisma`
- **NestJS Auth Docs:** https://docs.nestjs.com/security/authentication
- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725

---

## 🔄 Dependency on Day 1

Day 2 builds directly on:
- ✅ Database connection (PrismaService)
- ✅ User & Company tables
- ✅ Environment configuration
- ✅ Project structure

---

## ⏭️ Day 3 Preview

**Focus:** User Management & Invitations

- User invitation system
- Email verification
- Password reset flow
- User profile management
- Role management APIs

---

**Ready to start Day 2?** 🚀

**Estimated completion time:** 6-8 hours
**Recommended break points:** After each phase
**Coffee breaks:** Required ☕

---

*Created: January 28, 2026*
*Project: FinanX ERP Backend*
*Day: 2 of 30*
