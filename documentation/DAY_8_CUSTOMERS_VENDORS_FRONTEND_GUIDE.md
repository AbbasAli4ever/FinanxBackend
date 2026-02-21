# Customers & Vendors - Frontend Integration Guide

## Overview

Implement **Customers** and **Vendors** pages. Both share a similar structure with slight differences.

**Base URL:** `http://localhost:3000/api/v1`
**Auth:** All endpoints require `Authorization: Bearer <token>` header

---

## 1. Customers List Page (`/customers`)

### API Call
```
GET /api/v1/customers?search=john&customerType=Business&isActive=true&sortBy=displayName&sortOrder=asc
Authorization: Bearer <token>
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "customerType": "Business",
      "displayName": "Acme Corporation",
      "companyName": "Acme Corp",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@acme.com",
      "phone": "+1-555-0100",
      "mobile": null,
      "billingAddress": {
        "line1": "123 Main St",
        "line2": null,
        "city": "New York",
        "state": "NY",
        "postalCode": "10001",
        "country": "US"
      },
      "shippingAddress": {
        "line1": null,
        "line2": null,
        "city": null,
        "state": null,
        "postalCode": null,
        "country": null
      },
      "taxNumber": "12-3456789",
      "taxExempt": false,
      "paymentTerms": "Net 30",
      "openingBalance": 0,
      "currentBalance": 0,
      "creditLimit": null,
      "notes": "Key corporate client",
      "isActive": true,
      "createdAt": "2026-02-16T...",
      "updatedAt": "2026-02-16T..."
    }
  ]
}
```

### UI Layout
```
┌──────────────────────────────────────────────────────────┐
│  Customers                              [+ New Customer] │
├──────────────────────────────────────────────────────────┤
│  [Search...] [Type: All ▼] [Status: Active ▼]           │
├──────────────────────────────────────────────────────────┤
│  Name              │ Email           │ Phone    │ Bal  │⋯│
│  ─────────────────────────────────────────────────────── │
│  Acme Corporation  │ john@acme.com   │ 555-0100 │ 0.00│⋯│
│  Jane Smith        │ jane@email.com  │ 555-0200 │ 0.00│⋯│
└──────────────────────────────────────────────────────────┘
```

---

## 2. Create Customer Modal

### API Call
```
POST /api/v1/customers
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "Acme Corporation",
  "customerType": "Business",
  "companyName": "Acme Corp",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@acme.com",
  "phone": "+1-555-0100",
  "mobile": "+1-555-0101",
  "website": "https://acme.com",
  "billingAddressLine1": "123 Main St",
  "billingCity": "New York",
  "billingState": "NY",
  "billingPostalCode": "10001",
  "billingCountry": "US",
  "shippingAddressLine1": "456 Warehouse Ave",
  "shippingCity": "Newark",
  "shippingState": "NJ",
  "shippingPostalCode": "07101",
  "shippingCountry": "US",
  "taxNumber": "12-3456789",
  "taxExempt": false,
  "paymentTerms": "Net 30",
  "openingBalance": 1500.00,
  "openingBalanceDate": "2026-01-01",
  "creditLimit": 50000,
  "notes": "Key corporate client"
}
```

### Required Fields
- `displayName` (required) - must be unique per company

### Optional Fields
All other fields are optional. Provide what the user fills in.

### Error Responses
```json
// Duplicate name
{ "statusCode": 409, "message": "Customer \"Acme Corporation\" already exists" }

// Duplicate email
{ "statusCode": 409, "message": "A customer with email \"john@acme.com\" already exists" }
```

### UI Layout - Create Form

```
┌──────────────────────────────────────────────────────┐
│  New Customer                                    [X] │
├──────────────────────────────────────────────────────┤
│  Type:  (o) Business  ( ) Individual                 │
│                                                      │
│  ── Contact Info ──                                  │
│  Title       [Mr.  ▼]  Suffix    [___]               │
│  First Name  [___________]  Last Name [___________]  │
│  Display Name * [________________________]           │
│  Company Name   [________________________]           │
│  Email          [________________________]           │
│  Phone          [____________]  Mobile [____________] │
│  Fax            [____________]  Website [___________] │
│                                                      │
│  ── Billing Address ──                               │
│  Address Line 1 [________________________]           │
│  Address Line 2 [________________________]           │
│  City     [__________] State [____] ZIP [_____]      │
│  Country  [US ▼]                                     │
│                                                      │
│  ☐ Same as billing address                           │
│  ── Shipping Address ──                              │
│  (same fields as billing)                            │
│                                                      │
│  ── Tax & Payment ──                                 │
│  Tax Number     [____________]  ☐ Tax Exempt         │
│  Payment Terms  [Net 30 ▼]                           │
│  Credit Limit   [____________]                       │
│                                                      │
│  ── Opening Balance ──                               │
│  Amount  [____________]  As of Date [__________]     │
│                                                      │
│  ── Notes ──                                         │
│  [_________________________________________________] │
│                                                      │
│              [Cancel]  [Save Customer]               │
└──────────────────────────────────────────────────────┘
```

### Example React Code - Create Customer
```jsx
const CreateCustomerForm = ({ onClose, onCreated }) => {
  const [customerType, setCustomerType] = useState('Business');
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [form, setForm] = useState({
    displayName: '',
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    // ... all fields
  });
  const [error, setError] = useState('');

  // Payment terms options
  const paymentTermsOptions = [
    'Due on Receipt',
    'Net 15',
    'Net 30',
    'Net 45',
    'Net 60',
    'Net 90',
    'Custom',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Build body - only include non-empty fields
    const body = { customerType };
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        body[key] = value;
      }
    });

    // Copy billing to shipping if same
    if (sameAsBilling) {
      body.shippingAddressLine1 = body.billingAddressLine1;
      body.shippingAddressLine2 = body.billingAddressLine2;
      body.shippingCity = body.billingCity;
      body.shippingState = body.billingState;
      body.shippingPostalCode = body.billingPostalCode;
      body.shippingCountry = body.billingCountry;
    }

    const response = await fetch('http://localhost:3000/api/v1/customers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (data.success) {
      onCreated(data.data);
      onClose();
    } else {
      setError(data.message);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
};
```

---

## 3. Edit Customer

### API Call
```
PATCH /api/v1/customers/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+1-555-9999",
  "creditLimit": 75000,
  "notes": "Updated notes"
}
```

Only send fields that changed. `displayName`, `email` uniqueness is re-validated on update.

---

## 4. Delete (Deactivate) Customer

### API Call
```
DELETE /api/v1/customers/:id
Authorization: Bearer <token>
```

**Note:** This soft-deletes (deactivates) the customer. They can be reactivated via PATCH with `{ "isActive": true }`.

---

## 5. Vendors List Page (`/vendors`)

### API Call
```
GET /api/v1/vendors?search=office&vendorType=Business&isActive=true&track1099=true
Authorization: Bearer <token>
```

### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "vendorType": "Business",
      "displayName": "Office Depot",
      "companyName": "Office Depot Inc",
      "firstName": null,
      "lastName": null,
      "email": "billing@officedepot.com",
      "phone": "+1-800-463-3768",
      "address": {
        "line1": "6600 N Military Trail",
        "line2": null,
        "city": "Boca Raton",
        "state": "FL",
        "postalCode": "33496",
        "country": "US"
      },
      "taxNumber": "59-2663954",
      "businessIdNo": "59-2663954",
      "track1099": true,
      "paymentTerms": "Net 30",
      "accountNumber": "ACC-12345",
      "openingBalance": 0,
      "currentBalance": 0,
      "notes": "Office supplies vendor",
      "isActive": true
    }
  ]
}
```

### UI Layout
```
┌──────────────────────────────────────────────────────────┐
│  Vendors                                 [+ New Vendor]  │
├──────────────────────────────────────────────────────────┤
│  [Search...] [Type: All ▼] [Status: Active ▼] [☐ 1099] │
├──────────────────────────────────────────────────────────┤
│  Name             │ Email            │ Phone    │ 1099│⋯│
│  ─────────────────────────────────────────────────────── │
│  Office Depot     │ billing@offic... │ 800-463  │  ✓  │⋯│
│  Mike Plumber     │ mike@plumbing... │ 555-0300 │  ✓  │⋯│
└──────────────────────────────────────────────────────────┘
```

---

## 6. Create Vendor

### API Call
```
POST /api/v1/vendors
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "Office Depot",
  "vendorType": "Business",
  "companyName": "Office Depot Inc",
  "email": "billing@officedepot.com",
  "phone": "+1-800-463-3768",
  "addressLine1": "6600 N Military Trail",
  "city": "Boca Raton",
  "state": "FL",
  "postalCode": "33496",
  "country": "US",
  "taxNumber": "59-2663954",
  "businessIdNo": "59-2663954",
  "track1099": true,
  "paymentTerms": "Net 30",
  "accountNumber": "ACC-12345",
  "openingBalance": 0,
  "notes": "Office supplies vendor"
}
```

### UI Layout - Create Vendor Form

```
┌──────────────────────────────────────────────────────┐
│  New Vendor                                      [X] │
├──────────────────────────────────────────────────────┤
│  Type:  (o) Business  ( ) Individual                 │
│                                                      │
│  ── Contact Info ──                                  │
│  Display Name * [________________________]           │
│  Company Name   [________________________]           │
│  First Name     [___________]  Last Name [________]  │
│  Email          [________________________]           │
│  Phone          [____________]  Mobile [____________] │
│  Website        [________________________]           │
│                                                      │
│  ── Address ──                                       │
│  Address Line 1 [________________________]           │
│  Address Line 2 [________________________]           │
│  City     [__________] State [____] ZIP [_____]      │
│  Country  [US ▼]                                     │
│                                                      │
│  ── Tax & Compliance ──                              │
│  Tax Number     [____________]                       │
│  Business ID    [____________]                       │
│  ☑ Track payments for 1099                           │
│                                                      │
│  ── Payment ──                                       │
│  Payment Terms  [Net 30 ▼]                           │
│  Account Number [____________]                       │
│                                                      │
│  ── Opening Balance ──                               │
│  Amount  [____________]  As of Date [__________]     │
│                                                      │
│  ── Notes ──                                         │
│  [_________________________________________________] │
│                                                      │
│               [Cancel]  [Save Vendor]                │
└──────────────────────────────────────────────────────┘
```

---

## 7. Edit Vendor

### API Call
```
PATCH /api/v1/vendors/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "phone": "+1-800-NEW-NUMB",
  "track1099": false
}
```

---

## 8. Delete (Deactivate) Vendor

### API Call
```
DELETE /api/v1/vendors/:id
Authorization: Bearer <token>
```

Soft-deletes the vendor. Reactivate via PATCH with `{ "isActive": true }`.

---

## Key Differences: Customer vs Vendor

| Feature | Customer | Vendor |
|---------|----------|--------|
| Address | Billing + Shipping (separate) | Single address |
| Tax | taxNumber + taxExempt | taxNumber + businessIdNo + track1099 |
| Financial | creditLimit | accountNumber (vendor's ref for us) |
| 1099 | N/A | track1099 flag |

---

## Payment Terms Options

Suggest these in a dropdown (both for customers and vendors):

```javascript
const PAYMENT_TERMS = [
  'Due on Receipt',
  'Net 10',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
];
```

---

## Customer Type Behavior

When user selects **Business**:
- Show `companyName` field prominently
- `displayName` auto-fills from `companyName` if empty

When user selects **Individual**:
- Show `firstName` + `lastName` prominently
- `displayName` auto-fills from `firstName + lastName` if empty
- Hide `companyName` or make it secondary

```javascript
// Auto-populate displayName
useEffect(() => {
  if (!form.displayName || autoFilled) {
    if (customerType === 'Business' && form.companyName) {
      setForm(prev => ({ ...prev, displayName: form.companyName }));
    } else if (customerType === 'Individual' && (form.firstName || form.lastName)) {
      const name = [form.firstName, form.lastName].filter(Boolean).join(' ');
      setForm(prev => ({ ...prev, displayName: name }));
    }
  }
}, [customerType, form.companyName, form.firstName, form.lastName]);
```

---

## "Same as Billing" Checkbox (Customers Only)

```jsx
<label>
  <input
    type="checkbox"
    checked={sameAsBilling}
    onChange={(e) => {
      setSameAsBilling(e.target.checked);
      if (e.target.checked) {
        setForm(prev => ({
          ...prev,
          shippingAddressLine1: prev.billingAddressLine1,
          shippingAddressLine2: prev.billingAddressLine2,
          shippingCity: prev.billingCity,
          shippingState: prev.billingState,
          shippingPostalCode: prev.billingPostalCode,
          shippingCountry: prev.billingCountry,
        }));
      }
    }}
  />
  Same as billing address
</label>
```

---

## Checklist

### Customers
- [ ] Create `/customers` list page with table
- [ ] Add search bar and filter dropdowns (type, active status)
- [ ] Create "New Customer" form/modal with Business/Individual toggle
- [ ] Implement billing + shipping address sections
- [ ] Add "Same as billing" checkbox for shipping
- [ ] Auto-populate displayName from company/individual name
- [ ] Implement edit customer page/modal
- [ ] Implement delete with confirmation
- [ ] Show balance formatted as currency
- [ ] Handle duplicate name/email error messages

### Vendors
- [ ] Create `/vendors` list page with table
- [ ] Add search bar and filter dropdowns (type, active, 1099)
- [ ] Show 1099 badge/indicator in vendor list
- [ ] Create "New Vendor" form/modal with Business/Individual toggle
- [ ] Add 1099 tracking checkbox
- [ ] Include account number field
- [ ] Implement edit vendor page/modal
- [ ] Implement delete with confirmation
- [ ] Handle duplicate name/email error messages
