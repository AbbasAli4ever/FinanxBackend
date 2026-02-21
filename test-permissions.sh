#!/bin/bash

# ============================================================
# FinanX Backend - Day 5 Permission Guard Testing Script
# ============================================================
# This script tests the permission enforcement system
# ============================================================

BASE_URL="http://localhost:3000/api/v1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Store tokens
ADMIN_TOKEN=""
LIMITED_USER_TOKEN=""
LIMITED_USER_ID=""
COMPANY_ADMIN_ROLE_ID=""
LIMITED_ROLE_ID=""

echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}       FinanX Backend - Permission Guard Tests              ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo ""

# Function to run a test
run_test() {
    local test_name=$1
    local expected_result=$2  # "success" or "forbidden"
    local http_code=$3

    TESTS_RUN=$((TESTS_RUN + 1))

    if [ "$expected_result" = "success" ] && [ "$http_code" = "200" -o "$http_code" = "201" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓ PASS${NC}: $test_name"
        return 0
    elif [ "$expected_result" = "forbidden" ] && [ "$http_code" = "403" ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓ PASS${NC}: $test_name (correctly denied with 403)"
        return 0
    else
        TESTS_FAILED=$((TESTS_FAILED + 1))
        echo -e "${RED}✗ FAIL${NC}: $test_name (expected $expected_result, got HTTP $http_code)"
        return 1
    fi
}

# ============================================================
# SETUP: Register a new company and admin user
# ============================================================
echo -e "${YELLOW}[SETUP] Registering new company and admin...${NC}"
TIMESTAMP=$(date +%s)
ADMIN_EMAIL="admin_${TIMESTAMP}@test.com"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d "{
        \"company\": {\"name\": \"Test Company $TIMESTAMP\"},
        \"user\": {
            \"firstName\": \"Admin\",
            \"lastName\": \"User\",
            \"email\": \"$ADMIN_EMAIL\",
            \"password\": \"Admin123!@#\"
        }
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    ADMIN_TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
    if [ -n "$ADMIN_TOKEN" ]; then
        echo -e "${GREEN}✓ Admin registered successfully${NC}"
        echo -e "   Admin Email: $ADMIN_EMAIL"
        echo -e "   Admin Token: ${ADMIN_TOKEN:0:50}..."
    else
        echo -e "${RED}✗ Failed to extract admin token${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Failed to register admin. HTTP: $HTTP_CODE${NC}"
    echo -e "   Response: $BODY"
    exit 1
fi

# ============================================================
# TEST 1: Admin can access user list (has all permissions - primary admin)
# ============================================================
echo -e "\n${YELLOW}[TEST 1] Admin can access user list${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Admin access user list" "success" "$HTTP_CODE"

# ============================================================
# TEST 2: Admin can access roles (company:edit_settings)
# ============================================================
echo -e "\n${YELLOW}[TEST 2] Admin can access roles${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/roles" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
run_test "Admin access roles" "success" "$HTTP_CODE"

# Extract role IDs - using "limited" role which has NO user management permissions
COMPANY_ADMIN_ROLE_ID=$(echo "$BODY" | python3 -c "import sys, json; roles = json.load(sys.stdin)['data']; print(next((r['id'] for r in roles if r['code'] == 'company_admin'), ''))" 2>/dev/null)
LIMITED_ROLE_ID=$(echo "$BODY" | python3 -c "import sys, json; roles = json.load(sys.stdin)['data']; print(next((r['id'] for r in roles if r['code'] == 'limited'), ''))" 2>/dev/null)

echo -e "   Company Admin Role ID: $COMPANY_ADMIN_ROLE_ID"
echo -e "   Limited User Role ID: $LIMITED_ROLE_ID"

# ============================================================
# TEST 3: Get my permissions (Admin should be primary admin)
# ============================================================
echo -e "\n${YELLOW}[TEST 3] Get admin's permissions${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/my-permissions" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
run_test "Get admin permissions" "success" "$HTTP_CODE"

IS_PRIMARY_ADMIN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['isPrimaryAdmin'])" 2>/dev/null)
if [ "$IS_PRIMARY_ADMIN" = "True" ]; then
    echo -e "   ${GREEN}✓ Admin is correctly identified as Primary Admin${NC}"
fi

# ============================================================
# TEST 4: Create invitation for a limited user (no user management perms)
# ============================================================
echo -e "\n${YELLOW}[TEST 4] Create invitation for limited user${NC}"
RANDOM_EMAIL="limiteduser_${TIMESTAMP}@example.com"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users/invite" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"$RANDOM_EMAIL\",
        \"firstName\": \"Limited\",
        \"lastName\": \"User\",
        \"roleId\": \"$LIMITED_ROLE_ID\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
run_test "Create invitation for limited user" "success" "$HTTP_CODE"

# Extract invitation token
INVITATION_TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['invitationToken'])" 2>/dev/null)
echo -e "   Invitation Token: ${INVITATION_TOKEN:0:30}..."

# ============================================================
# TEST 5: Accept invitation and create limited user
# ============================================================
echo -e "\n${YELLOW}[TEST 5] Accept invitation${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users/accept-invitation" \
    -H "Content-Type: application/json" \
    -d "{
        \"invitationToken\": \"$INVITATION_TOKEN\",
        \"password\": \"TestUser123!@#\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
run_test "Accept invitation" "success" "$HTTP_CODE"

LIMITED_USER_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo -e "   Limited User ID: $LIMITED_USER_ID"

# ============================================================
# TEST 6: Login as Limited User
# ============================================================
echo -e "\n${YELLOW}[TEST 6] Login as Limited User${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$RANDOM_EMAIL\", \"password\": \"TestUser123!@#\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    LIMITED_USER_TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
    run_test "Limited user login" "success" "$HTTP_CODE"
    echo -e "   Limited User Token: ${LIMITED_USER_TOKEN:0:50}..."
else
    run_test "Limited user login" "success" "$HTTP_CODE"
fi

# ============================================================
# TEST 7: Limited User CANNOT access roles (no company:edit_settings)
# ============================================================
echo -e "\n${YELLOW}[TEST 7] Limited User denied access to roles${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/roles" \
    -H "Authorization: Bearer $LIMITED_USER_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Limited user denied roles access" "forbidden" "$HTTP_CODE"

# ============================================================
# TEST 8: Limited User CANNOT access user list (no user:view)
# ============================================================
echo -e "\n${YELLOW}[TEST 8] Limited User denied access to user list${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users" \
    -H "Authorization: Bearer $LIMITED_USER_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Limited user denied user list access" "forbidden" "$HTTP_CODE"

# ============================================================
# TEST 9: Limited User CANNOT invite users (no user:invite)
# ============================================================
echo -e "\n${YELLOW}[TEST 9] Limited User denied invite users${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users/invite" \
    -H "Authorization: Bearer $LIMITED_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"email\": \"hacker@example.com\",
        \"firstName\": \"Hacker\",
        \"lastName\": \"User\",
        \"roleId\": \"$LIMITED_ROLE_ID\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Limited user denied invite access" "forbidden" "$HTTP_CODE"

# ============================================================
# TEST 10: Limited User CAN change their own password (no permission needed)
# ============================================================
echo -e "\n${YELLOW}[TEST 10] Limited User can change own password${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/users/me/change-password" \
    -H "Authorization: Bearer $LIMITED_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"currentPassword\": \"TestUser123!@#\",
        \"newPassword\": \"NewPassword123!@#\"
    }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Limited user can change own password" "success" "$HTTP_CODE"

# ============================================================
# TEST 11: Get limited user's permissions
# ============================================================
echo -e "\n${YELLOW}[TEST 11] Get limited user's permissions${NC}"

# Re-login with new password
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$RANDOM_EMAIL\", \"password\": \"NewPassword123!@#\"}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
LIMITED_USER_TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/auth/my-permissions" \
    -H "Authorization: Bearer $LIMITED_USER_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')
run_test "Get limited user permissions" "success" "$HTTP_CODE"

PERM_COUNT=$(echo "$BODY" | python3 -c "import sys, json; print(len(json.load(sys.stdin)['data']['permissions']))" 2>/dev/null)
echo -e "   Limited User has $PERM_COUNT permissions"

IS_PRIMARY_ADMIN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['isPrimaryAdmin'])" 2>/dev/null)
if [ "$IS_PRIMARY_ADMIN" = "False" ]; then
    echo -e "   ${GREEN}✓ Limited user is correctly NOT Primary Admin${NC}"
fi

# ============================================================
# TEST 12: Limited User CANNOT deactivate users (no user:delete)
# ============================================================
echo -e "\n${YELLOW}[TEST 12] Limited User denied deactivate users${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$LIMITED_USER_ID/deactivate" \
    -H "Authorization: Bearer $LIMITED_USER_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Limited user denied deactivate access" "forbidden" "$HTTP_CODE"

# ============================================================
# TEST 13: Admin CAN deactivate test user (has all permissions)
# ============================================================
echo -e "\n${YELLOW}[TEST 13] Admin deactivates test user${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$LIMITED_USER_ID/deactivate" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
run_test "Admin deactivates test user" "success" "$HTTP_CODE"

# ============================================================
# SUMMARY
# ============================================================
echo ""
echo -e "${BLUE}============================================================${NC}"
echo -e "${BLUE}                    TEST SUMMARY                             ${NC}"
echo -e "${BLUE}============================================================${NC}"
echo -e "Total Tests Run: $TESTS_RUN"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
else
    echo -e "Tests Failed: $TESTS_FAILED"
fi
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}    ✓ ALL PERMISSION GUARD TESTS PASSED!                    ${NC}"
    echo -e "${GREEN}============================================================${NC}"
    exit 0
else
    echo -e "${RED}============================================================${NC}"
    echo -e "${RED}    ✗ SOME TESTS FAILED                                      ${NC}"
    echo -e "${RED}============================================================${NC}"
    exit 1
fi
