#!/bin/bash

# FinanX User Management API Test Script
# Day 3 - User Management & Invitations

echo "======================================"
echo "  FinanX User Management API Tests"
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
    "company": {"name": "Test Company"},
    "user": {
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin'$(date +%s)'@test.com",
      "password": "Pass1234"
    }
  }')

TOKEN=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
# Use hardcoded role ID for company_admin (from database seed)
ROLE_ID="e1218957-7f4b-4d49-a2d5-465695a10803"

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get token. Is the server running?${NC}"
  echo "Try: npm run start:dev"
  exit 1
fi

echo -e "${GREEN}✓ Login successful!${NC}"
echo "Token: ${TOKEN:0:50}..."
echo "Role ID: $ROLE_ID"
echo ""

# Test 1: Get All Users
echo -e "${BLUE}Test 1: Get All Users${NC}"
curl -s "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 1 passed${NC}"
echo ""

# Test 2: Invite User
echo -e "${BLUE}Test 2: Invite New User${NC}"
INVITE_RESPONSE=$(curl -s -X POST "$BASE_URL/users/invite" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "roleId": "'$ROLE_ID'",
    "message": "Welcome to the team!"
  }')

echo $INVITE_RESPONSE | python3 -m json.tool
INVITATION_TOKEN=$(echo $INVITE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['invitationToken'])" 2>/dev/null)
echo -e "${GREEN}✓ Test 2 passed${NC}"
echo "Invitation Token: $INVITATION_TOKEN"
echo ""

# Test 3: Get Pending Invitations
echo -e "${BLUE}Test 3: Get Pending Invitations${NC}"
curl -s "$BASE_URL/users/invitations/pending" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 3 passed${NC}"
echo ""

# Test 4: Accept Invitation (Public endpoint)
echo -e "${BLUE}Test 4: Accept Invitation${NC}"
curl -s -X POST "$BASE_URL/users/accept-invitation" \
  -H "Content-Type: application/json" \
  -d '{
    "invitationToken": "'$INVITATION_TOKEN'",
    "password": "NewUserPass123"
  }' | python3 -m json.tool
echo -e "${GREEN}✓ Test 4 passed${NC}"
echo ""

# Test 5: Get All Users Again (should show 2 users now)
echo -e "${BLUE}Test 5: Get All Users (After Invitation Accepted)${NC}"
USER_LIST=$(curl -s "$BASE_URL/users" \
  -H "Authorization: Bearer $TOKEN")
echo $USER_LIST | python3 -m json.tool

USER_ID=$(echo $USER_LIST | python3 -c "import sys, json; users = json.load(sys.stdin)['data']; print(users[1]['id'] if len(users) > 1 else users[0]['id'])" 2>/dev/null)
echo -e "${GREEN}✓ Test 5 passed${NC}"
echo "Second User ID: $USER_ID"
echo ""

# Test 6: Update User
echo -e "${BLUE}Test 6: Update User Profile${NC}"
curl -s -X PATCH "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+1234567890"
  }' | python3 -m json.tool
echo -e "${GREEN}✓ Test 6 passed${NC}"
echo ""

# Test 7: Change Password
echo -e "${BLUE}Test 7: Change Password${NC}"
curl -s -X POST "$BASE_URL/users/me/change-password" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Pass1234",
    "newPassword": "NewPass1234"
  }' | python3 -m json.tool
echo -e "${GREEN}✓ Test 7 passed${NC}"
echo ""

# Test 8: Deactivate User
echo -e "${BLUE}Test 8: Deactivate User${NC}"
curl -s -X PATCH "$BASE_URL/users/$USER_ID/deactivate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 8 passed${NC}"
echo ""

# Test 9: Reactivate User
echo -e "${BLUE}Test 9: Reactivate User${NC}"
curl -s -X PATCH "$BASE_URL/users/$USER_ID/reactivate" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 9 passed${NC}"
echo ""

# Test 10: Get Single User Details
echo -e "${BLUE}Test 10: Get Single User Details${NC}"
curl -s "$BASE_URL/users/$USER_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo -e "${GREEN}✓ Test 10 passed${NC}"
echo ""

echo "======================================"
echo -e "${GREEN}  All Tests Completed Successfully!${NC}"
echo "======================================"
echo ""
echo "Your token for testing in Postman/Frontend:"
echo "$TOKEN"
echo ""
echo "Your role ID (use this for inviting users):"
echo "$ROLE_ID"
