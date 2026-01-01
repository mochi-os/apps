#!/bin/bash
# Integration test for Apps app - Routing endpoints
# Tests routing data retrieval and preference setting
#
# Prerequisites:
# - Mochi server running on localhost:8081
# - Admin and user accounts available
#
# Usage:
#   ./test_routing.sh

set -e

SCRIPT_DIR="$(dirname "$0")"
CURL="$SCRIPT_DIR/../../../test/claude/curl.sh"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

pass() {
    echo -e "${GREEN}✓ $1${NC}"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

fail() {
    echo -e "${RED}✗ $1${NC}"
    if [ -n "$2" ]; then
        echo -e "  ${YELLOW}$2${NC}"
    fi
    TESTS_FAILED=$((TESTS_FAILED + 1))
    TESTS_RUN=$((TESTS_RUN + 1))
}

echo "========================================"
echo "Apps App - Routing Tests"
echo "========================================"
echo ""

# ----------------------------------------
# Get Routing Data (Admin)
# ----------------------------------------
echo "--- Routing Data (Admin) ---"

# Test: Get routing data as admin
RESPONSE=$("$CURL" /apps/-/routing/data)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin).get('data', {}); assert 'classes' in d and 'services' in d and 'paths' in d and d.get('is_admin') == True" 2>/dev/null; then
    CLASS_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin)['data']; print(len(d['classes']))" 2>/dev/null)
    SERVICE_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin)['data']; print(len(d['services']))" 2>/dev/null)
    PATH_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin)['data']; print(len(d['paths']))" 2>/dev/null)
    pass "Get routing data (classes: $CLASS_COUNT, services: $SERVICE_COUNT, paths: $PATH_COUNT)"
else
    fail "Get routing data as admin" "$RESPONSE"
fi

# Get a class name and app ID for testing
CLASS_NAME=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
for name, info in d.get('classes', {}).items():
    if len(info.get('apps', [])) > 0:
        print(name)
        break
" 2>/dev/null || echo "")

APP_ID=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
for name, info in d.get('classes', {}).items():
    if len(info.get('apps', [])) > 0:
        print(info['apps'][0]['id'])
        break
" 2>/dev/null || echo "")

# ----------------------------------------
# User Routing Tests
# ----------------------------------------
echo ""
echo "--- User Routing Preferences ---"

# Check if user account exists
USER_TOKEN=$("$SCRIPT_DIR/../../../test/claude/get-token.sh" user 1 2>/dev/null || echo "")
if [ -z "$USER_TOKEN" ]; then
    echo -e "${YELLOW}○ Skipping user tests (no user account available)${NC}"
else

# Test: Get routing data as user
RESPONSE=$("$CURL" -a user /apps/-/routing/data)
if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin).get('data', {}); assert 'classes' in d and 'services' in d and 'paths' in d and d.get('is_admin') == False" 2>/dev/null; then
    pass "Get routing data as user (is_admin=false)"
else
    fail "Get routing data as user" "$RESPONSE"
fi

if [ -n "$CLASS_NAME" ] && [ -n "$APP_ID" ]; then
    # Test: Set user class routing preference
    RESPONSE=$("$CURL" -a user -X POST -d "type=class&name=$CLASS_NAME&app=$APP_ID" /apps/-/user/preferences/routing/set)
    if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok') == True" 2>/dev/null; then
        pass "Set user class routing preference"
    else
        fail "Set user class routing preference" "$RESPONSE"
    fi

    # Verify user preference was set
    RESPONSE=$("$CURL" -a user /apps/-/routing/data)
    USER_PREF=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
print(d.get('classes', {}).get('$CLASS_NAME', {}).get('user', ''))
" 2>/dev/null || echo "")
    if [ "$USER_PREF" == "$APP_ID" ]; then
        pass "Verify user class preference set"
    else
        fail "Verify user class preference" "Expected $APP_ID, got $USER_PREF"
    fi

    # Test: Clear user class routing preference
    RESPONSE=$("$CURL" -a user -X POST -d "type=class&name=$CLASS_NAME&app=" /apps/-/user/preferences/routing/set)
    if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok') == True" 2>/dev/null; then
        pass "Clear user class routing preference"
    else
        fail "Clear user class routing preference" "$RESPONSE"
    fi

    # Verify user preference was cleared
    RESPONSE=$("$CURL" -a user /apps/-/routing/data)
    USER_PREF=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
print(d.get('classes', {}).get('$CLASS_NAME', {}).get('user', ''))
" 2>/dev/null || echo "")
    if [ -z "$USER_PREF" ]; then
        pass "Verify user class preference cleared"
    else
        fail "Verify user class preference cleared" "Expected empty, got $USER_PREF"
    fi
else
    echo -e "${YELLOW}○ Skipping preference tests (no classes with apps found)${NC}"
fi

fi  # End of user tests

# ----------------------------------------
# System Routing Tests (Admin)
# ----------------------------------------
echo ""
echo "--- System Routing (Admin) ---"

if [ -n "$CLASS_NAME" ] && [ -n "$APP_ID" ]; then
    # Test: Set system class routing
    RESPONSE=$("$CURL" -X POST -d "type=class&name=$CLASS_NAME&app=$APP_ID" /apps/-/system/routing/set)
    if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok') == True" 2>/dev/null; then
        pass "Set system class routing"
    else
        fail "Set system class routing" "$RESPONSE"
    fi

    # Verify system routing was set
    RESPONSE=$("$CURL" /apps/-/routing/data)
    SYSTEM_PREF=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
print(d.get('classes', {}).get('$CLASS_NAME', {}).get('system', ''))
" 2>/dev/null || echo "")
    if [ "$SYSTEM_PREF" == "$APP_ID" ]; then
        pass "Verify system class routing set"
    else
        fail "Verify system class routing" "Expected $APP_ID, got $SYSTEM_PREF"
    fi

    # Test: Clear system class routing
    RESPONSE=$("$CURL" -X POST -d "type=class&name=$CLASS_NAME&app=" /apps/-/system/routing/set)
    if echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('ok') == True" 2>/dev/null; then
        pass "Clear system class routing"
    else
        fail "Clear system class routing" "$RESPONSE"
    fi

    # Verify system routing was cleared
    RESPONSE=$("$CURL" /apps/-/routing/data)
    SYSTEM_PREF=$(echo "$RESPONSE" | python3 -c "
import sys, json
d = json.load(sys.stdin).get('data', {})
print(d.get('classes', {}).get('$CLASS_NAME', {}).get('system', ''))
" 2>/dev/null || echo "")
    if [ -z "$SYSTEM_PREF" ]; then
        pass "Verify system class routing cleared"
    else
        fail "Verify system class routing cleared" "Expected empty, got $SYSTEM_PREF"
    fi
else
    echo -e "${YELLOW}○ Skipping system routing tests (no classes with apps found)${NC}"
fi

# ----------------------------------------
# Access Control Tests
# ----------------------------------------
echo ""
echo "--- Access Control ---"

if [ -n "$USER_TOKEN" ]; then
    # Test: Non-admin cannot set system routing
    RESPONSE=$("$CURL" -a user -X POST -d "type=class&name=wiki&app=test" /apps/-/system/routing/set 2>&1)
    if echo "$RESPONSE" | grep -qi "admin\|forbidden\|403\|unauthorized" 2>/dev/null || \
       echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); assert d.get('status') in [401, 403] or 'admin' in d.get('error', '').lower()" 2>/dev/null; then
        pass "Non-admin blocked from system routing set"
    else
        fail "Non-admin should be blocked from system routing" "$RESPONSE"
    fi
fi

# ----------------------------------------
# Error Handling Tests
# ----------------------------------------
echo ""
echo "--- Error Handling ---"

# Test: Missing type parameter
RESPONSE=$("$CURL" -X POST -d "name=test&app=test" /apps/-/user/preferences/routing/set)
if echo "$RESPONSE" | grep -qi "missing\|400\|error" 2>/dev/null; then
    pass "Missing type parameter returns error"
else
    fail "Missing type parameter should error" "$RESPONSE"
fi

# Test: Invalid routing type
RESPONSE=$("$CURL" -X POST -d "type=invalid&name=test&app=test" /apps/-/user/preferences/routing/set)
if echo "$RESPONSE" | grep -qi "invalid\|400\|error" 2>/dev/null; then
    pass "Invalid routing type returns error"
else
    fail "Invalid routing type should error" "$RESPONSE"
fi

# ----------------------------------------
# Summary
# ----------------------------------------
echo ""
echo "========================================"
echo "Test Results"
echo "========================================"
echo -e "Tests run:    ${TESTS_RUN}"
echo -e "Passed:       ${GREEN}${TESTS_PASSED}${NC}"
echo -e "Failed:       ${RED}${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
