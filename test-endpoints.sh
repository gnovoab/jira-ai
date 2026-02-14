#!/bin/bash
# Comprehensive endpoint testing script

BASE_URL="http://localhost:8080"
PASS="\033[0;32m✓ PASS\033[0m"
FAIL="\033[0;31m✗ FAIL\033[0m"

echo "========================================="
echo "  Engineering Metrics API - Endpoint Testing"
echo "========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/actuator/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   $PASS Health endpoint (HTTP $HTTP_CODE)"
else
    echo -e "   $FAIL Health endpoint (HTTP $HTTP_CODE)"
fi
echo ""

# Test 2: Sprint Analysis - All Sprints
echo "2. Testing Sprint Analysis - All Sprints..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/sprints")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null)
    echo -e "   $PASS GET /api/sprints (HTTP $HTTP_CODE, $COUNT sprints)"
else
    echo -e "   $FAIL GET /api/sprints (HTTP $HTTP_CODE)"
fi
echo ""

# Test 3: QA Analysis Summary
echo "3. Testing QA Analysis Summary..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/qa-analysis/summary")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    TOTAL_SPRINTS=$(echo "$BODY" | jq '.totalSprints' 2>/dev/null)
    QA_RATE=$(echo "$BODY" | jq '.overallQaFailureRate' 2>/dev/null)
    echo -e "   $PASS GET /api/test/qa-analysis/summary (HTTP $HTTP_CODE)"
    echo "        Total Sprints: $TOTAL_SPRINTS, QA Failure Rate: $QA_RATE%"
else
    echo -e "   $FAIL GET /api/test/qa-analysis/summary (HTTP $HTTP_CODE)"
fi
echo ""

# Test 4: QA Top Failures
echo "4. Testing QA Top Failures..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/qa-analysis/top-failures")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "   $PASS GET /api/test/qa-analysis/top-failures (HTTP $HTTP_CODE)"
else
    echo -e "   $FAIL GET /api/test/qa-analysis/top-failures (HTTP $HTTP_CODE)"
fi
echo ""

# Test 5: Sprint Database Status
echo "5. Testing Sprint Database Status..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/sprint-database/status")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    SOURCE=$(echo "$BODY" | jq -r '.sourceName' 2>/dev/null)
    echo -e "   $PASS GET /api/test/sprint-database/status (HTTP $HTTP_CODE)"
    echo "        Source: $SOURCE"
else
    echo -e "   $FAIL GET /api/test/sprint-database/status (HTTP $HTTP_CODE)"
fi
echo ""

# Test 6: Sprint Database Issues
echo "6. Testing Sprint Database Issues..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/sprint-database/issues")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    TOTAL=$(echo "$BODY" | jq '.totalIssues' 2>/dev/null)
    echo -e "   $PASS GET /api/test/sprint-database/issues (HTTP $HTTP_CODE)"
    echo "        Total Issues: $TOTAL"
else
    echo -e "   $FAIL GET /api/test/sprint-database/issues (HTTP $HTTP_CODE)"
fi
echo ""

# Test 7: Specific Sprint Data
echo "7. Testing Specific Sprint Data (Sprint 79948)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/test/sprint-database/sprint/79948")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    SPRINT_ID=$(echo "$BODY" | jq -r '.sprintId' 2>/dev/null)
    ISSUE_COUNT=$(echo "$BODY" | jq '.issueKeys | length' 2>/dev/null)
    echo -e "   $PASS GET /api/test/sprint-database/sprint/79948 (HTTP $HTTP_CODE)"
    echo "        Sprint ID: $SPRINT_ID, Issues: $ISSUE_COUNT"
else
    echo -e "   $FAIL GET /api/test/sprint-database/sprint/79948 (HTTP $HTTP_CODE)"
fi
echo ""

# Test 8: QA Debug - Status Transitions
echo "8. Testing QA Debug - Status Transitions (Sprint 79948)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/debug/qa/status-transitions/79948")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    TOTAL_ISSUES=$(echo "$BODY" | jq '.totalIssues' 2>/dev/null)
    UNIQUE_TRANS=$(echo "$BODY" | jq '.uniqueTransitions' 2>/dev/null)
    echo -e "   $PASS GET /api/debug/qa/status-transitions/79948 (HTTP $HTTP_CODE)"
    echo "        Issues: $TOTAL_ISSUES, Unique Transitions: $UNIQUE_TRANS"
else
    echo -e "   $FAIL GET /api/debug/qa/status-transitions/79948 (HTTP $HTTP_CODE)"
fi
echo ""

# Test 9: QA Debug - QA Failures
echo "9. Testing QA Debug - QA Failures (Sprint 79948)..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/debug/qa/qa-failures/79948?limit=2")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "200" ]; then
    TOTAL_FAILURES=$(echo "$BODY" | jq '.totalQaFailures' 2>/dev/null)
    echo -e "   $PASS GET /api/debug/qa/qa-failures/79948 (HTTP $HTTP_CODE)"
    echo "        Total QA Failures: $TOTAL_FAILURES"
else
    echo -e "   $FAIL GET /api/debug/qa/qa-failures/79948 (HTTP $HTTP_CODE)"
fi
echo ""

echo "========================================="
echo "  Testing Complete!"
echo "========================================="

