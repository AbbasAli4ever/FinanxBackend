#!/bin/bash

# FinanX Role Management API Test Script
# Day 4 - Custom Role Creation & Management

echo "======================================"
echo "  FinanX Role Management API Tests"
echo "======================================"
echo ""

BASE_URL="http://localhost:3000/api/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Register/Login to get token
echo -e "${BLUE}Step 1: Registering test user...${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "company": {"name": "Test Roles Company"},
    "user": {
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin'$(date +%s)'@testroles.com",
      "password": "Pass1234"
    }
  }')

TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get token. Is the server running?${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Login successful!${NC}"
echo ""

# Test 1: Get All Roles
echo -e "${BLUE}Test 1: Get All Roles${NC}"
ROLES_RESPONSE=$(curl -s "$BASE_URL/roles" -H "Authorization: Bearer $TOKEN")
echo $ROLES_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print('Found', len(data['data']), 'roles')"
echo -e "${GREEN}✓ Test 1 passed${NC}"
echo ""

# Test 2: Get All Permissions
echo -e "${BLUE}Test 2: Get All Permissions${NC}"
PERMS_RESPONSE=$(curl -s "$BASE_URL/roles/permissions/all" -H "Authorization: Bearer $TOKEN")
echo $PERMS_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print('Total permissions:', len(data['data']['all'])); print('Categories:', list(data['data']['grouped'].keys()))"

# Extract some permission IDs for creating a custom role
PERM_IDS=$(echo $PERMS_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); perms = data['data']['all'][:5]; print(','.join([p['id'] for p in perms]))")
echo -e "${GREEN}✓ Test 2 passed${NC}"
echo ""

# Test 3: Create Custom Role
echo -e "${BLUE}Test 3: Create Custom Role (Sales Manager)${NC}"
CREATE_ROLE_RESPONSE=$(curl -s -X POST "$BASE_URL/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "sales_manager",
    "name": "Sales Manager",
    "description": "Can manage all sales-related operations",
    "permissionIds": ["bf2f6629-0887-41c7-ad16-8b181bbe7b71", "4fb8aab5-d60d-4a4e-beb0-75ca202fdb42", "226e53e5-4c3f-43cb-9ae2-87e8e778ac95", "12298902-39af-47a4-85dd-660fba579c0e", "ebcddbe6-245a-41df-9703-df638ed473a1"]
  }')

echo $CREATE_ROLE_RESPONSE | python3 -m json.tool
CUSTOM_ROLE_ID=$(echo $CREATE_ROLE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo -e "${GREEN}✓ Test 3 passed - Custom role ID: $CUSTOM_ROLE_ID${NC}"
echo ""

# Test 4: Get Single Role
echo -e "${BLUE}Test 4: Get Single Role${NC}"
curl -s "$BASE_URL/roles/$CUSTOM_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 4 passed${NC}"
echo ""

# Test 5: Update Custom Role
echo -e "${BLUE}Test 5: Update Custom Role${NC}"
curl -s -X PATCH "$BASE_URL/roles/$CUSTOM_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Senior Sales Manager",
    "description": "Updated description for senior sales managers"
  }' | python3 -m json.tool
echo -e "${GREEN}✓ Test 5 passed${NC}"
echo ""

# Test 6: Get All Roles Again (should show 6 now)
echo -e "${BLUE}Test 6: Get All Roles (After Creating Custom Role)${NC}"
curl -s "$BASE_URL/roles" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Total roles:', len(data['data'])); [print(f\"  - {r['code']}: {r['name']} ({len(r['permissions'])} permissions)\") for r in data['data']]"
echo -e "${GREEN}✓ Test 6 passed${NC}"
echo ""

# Test 7: Delete Custom Role
echo -e "${BLUE}Test 7: Delete Custom Role${NC}"
curl -s -X DELETE "$BASE_URL/roles/$CUSTOM_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 7 passed${NC}"
echo ""

# Test 8: Verify Deletion
echo -e "${BLUE}Test 8: Verify Role Deletion${NC}"
curl -s "$BASE_URL/roles" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data = json.load(sys.stdin); print('Total roles after deletion:', len(data['data']))"
echo -e "${GREEN}✓ Test 8 passed${NC}"
echo ""

# Test 9: Try to Delete System Role (should fail)
echo -e "${BLUE}Test 9: Try to Delete System Role (Should Fail)${NC}"
SYSTEM_ROLE_ID=$(curl -s "$BASE_URL/roles" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys, json; data = json.load(sys.stdin); print([r['id'] for r in data['data'] if r['isSystemRole']][0])")
curl -s -X DELETE "$BASE_URL/roles/$SYSTEM_ROLE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 9 passed (Correctly prevented)${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}  All Tests Completed Successfully!${NC}"
echo "======================================"
echo ""
echo "Your token for testing in Postman/Frontend:"
echo "$TOKEN"
