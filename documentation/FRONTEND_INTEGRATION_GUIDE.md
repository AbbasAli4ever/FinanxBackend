# Frontend Integration Guide - Day 2

**API Base URL:** `http://localhost:3000/api/v1`

---

## Available Endpoints

### 1. **Register (Create Company + Admin User)**

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```typescript
{
  company: {
    name: string;          // Required
    email?: string;        // Optional
  };
  user: {
    firstName: string;     // Required
    lastName: string;      // Required
    email: string;         // Required, must be valid email
    password: string;      // Required, min 8 characters
  };
}
```

**Response (201):**
```typescript
{
  success: true;
  message: "Registration successful";
  data: {
    accessToken: string;   // JWT token (15 min expiry)
    refreshToken: string;  // UUID for refresh
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      isPrimaryAdmin: boolean;
      role: {
        code: string;      // "company_admin"
        name: string;
      } | null;
    };
    company: {
      id: string;
      name: string;
    };
    permissions: string[]; // Array of permission codes
  };
}
```

**Example (JavaScript/Fetch):**
```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    company: {
      name: 'Test Company LLC',
      email: 'info@testcompany.com'
    },
    user: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@testcompany.com',
      password: 'SecurePass123'
    }
  })
});

const data = await response.json();
// Store accessToken in localStorage or secure cookie
localStorage.setItem('accessToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

---

### 2. **Login**

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```typescript
{
  email: string;      // Required
  password: string;   // Required
}
```

**Response (200):** Same as register

**Example:**
```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john@testcompany.com',
    password: 'SecurePass123'
  })
});

const data = await response.json();
localStorage.setItem('accessToken', data.data.accessToken);
localStorage.setItem('refreshToken', data.data.refreshToken);
```

---

### 3. **Get Current User** (Protected)

**Endpoint:** `GET /api/v1/auth/me`

**Headers Required:**
```
Authorization: Bearer <accessToken>
```

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
    isPrimaryAdmin: boolean;
    role: {
      code: string;
      name: string;
    } | null;
    company: {
      id: string;
      name: string;
    };
    permissions: string[];
  };
}
```

**Example:**
```javascript
const token = localStorage.getItem('accessToken');

const response = await fetch('http://localhost:3000/api/v1/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});

const data = await response.json();
console.log('Current user:', data.data);
```

---

### 4. **Health Check**

**Endpoint:** `GET /api/v1/health`

**Response:**
```typescript
{
  success: true;
  message: "FinanX ERP API is running";
  data: {
    status: "healthy";
    uptime: number;
    timestamp: string;
    database: "connected";
    version: string;
  };
}
```

---

## Authentication Flow

### Initial Registration/Login Flow

```
1. User fills registration form
   |
2. POST /api/v1/auth/register
   |
3. Backend creates company + user
   |
4. Backend returns accessToken + refreshToken
   |
5. Frontend stores tokens
   - accessToken -> localStorage or memory
   - refreshToken -> httpOnly cookie (recommended) or localStorage
   |
6. Redirect to dashboard
```

### Authenticated Requests Flow

```
1. User makes request to protected endpoint
   |
2. Frontend adds Authorization header
   Headers: { Authorization: `Bearer ${accessToken}` }
   |
3. Backend validates JWT
   |
4. Returns data or 401 if invalid
```

---

## Error Handling

### Common Error Responses

**400 Bad Request** - Validation errors
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "details": [
      "email must be a valid email",
      "password must be longer than or equal to 8 characters"
    ]
  }
}
```

**401 Unauthorized** - Invalid credentials or expired token
```json
{
  "statusCode": 401,
  "message": "Invalid credentials"
}
```

**409 Conflict** - Email already exists
```json
{
  "statusCode": 409,
  "message": "Email already registered"
}
```

---

## Token Storage Recommendations

### Option 1: LocalStorage (Simpler, less secure)
```javascript
// Store
localStorage.setItem('accessToken', token);

// Retrieve
const token = localStorage.getItem('accessToken');

// Remove on logout
localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

### Option 2: Memory + HttpOnly Cookie (More secure)
```javascript
// Store accessToken in memory (React state)
const [accessToken, setAccessToken] = useState(null);

// Store refreshToken in httpOnly cookie (backend sets it)
// Frontend cannot access it directly (XSS protection)
```

---

## React/TypeScript Example

### API Service
```typescript
// src/services/api.ts
const API_BASE_URL = 'http://localhost:3000/api/v1';

export const api = {
  async register(data: RegisterData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async getMe(token: string) {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.json();
  },
};
```

### Auth Context
```typescript
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext } from 'react';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('accessToken')
  );

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    if (response.success) {
      setToken(response.data.accessToken);
      setUser(response.data.user);
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### Protected Route Component
```typescript
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
```

---

## TypeScript Types

```typescript
// types/auth.ts
export interface RegisterRequest {
  company: {
    name: string;
    email?: string;
  };
  user: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  };
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
    company: Company;
    permissions: string[];
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isPrimaryAdmin: boolean;
  role: {
    code: string;
    name: string;
  } | null;
}

export interface Company {
  id: string;
  name: string;
}
```

---

## Handling Token Expiration

Access tokens expire after 15 minutes. Here's how to handle it:

```typescript
// Token refresh logic (to be implemented in Day 3)
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('accessToken', data.data.accessToken);
    return data.data.accessToken;
  } else {
    // Refresh token expired, logout user
    logout();
  }
}

// Axios interceptor example
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## Test the API

### Using cURL:

**Register:**
```bash
curl -X POST 'http://localhost:3000/api/v1/auth/register' \
  -H 'Content-Type: application/json' \
  -d '{
    "company": {"name": "My Company"},
    "user": {
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@mycompany.com",
      "password": "Password123"
    }
  }'
```

**Login:**
```bash
curl -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "jane@mycompany.com",
    "password": "Password123"
  }'
```

**Get Me:**
```bash
curl -X GET 'http://localhost:3000/api/v1/auth/me' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

---

## Integration Checklist

- [ ] Can register new company + admin user
- [ ] Can login with email/password
- [ ] Tokens are stored securely
- [ ] Can access protected `/me` endpoint
- [ ] Auth context/state management setup
- [ ] Protected routes redirect to login
- [ ] Error handling for 401/409 responses
- [ ] User data displayed in UI
- [ ] Logout clears tokens
- [ ] Loading states during API calls

---

## CORS Note

CORS is enabled for all origins in development. For production, update `main.ts`:

```typescript
app.enableCors({
  origin: 'https://yourdomain.com',
  credentials: true,
});
```

---

## Need Help?

- Backend running on: `http://localhost:3000`
- Health check: `http://localhost:3000/api/v1/health`
- All endpoints return standardized `ApiResponseDto` format
