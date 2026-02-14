#!/bin/bash

# Super Quick Fetch - One command to rule them all!
# Just copy your cookies and run this script

set -e

cd "$(dirname "$0")"

echo "🚀 Quick Sprint Fetch"
echo "=" | head -c 50; echo ""
echo ""
echo "📋 Instructions:"
echo "   1. Open https://gspcloud.atlassian.net in your browser"
echo "   2. Press F12 → Network tab → Refresh page"
echo "   3. Click any request → Headers → Cookie"
echo "   4. Copy the three cookie values below"
echo ""
echo "=" | head -c 50; echo ""
echo ""

# Check if cookies are already set and valid
if [ -f .jira-session ]; then
    source .jira-session
    if [ -n "$JIRA_JSESSIONID" ] && [ -n "$JIRA_ACCOUNT_XSRF_TOKEN" ] && [ -n "$JIRA_TENANT_SESSION_TOKEN" ]; then
        echo "🔍 Found existing cookies in .jira-session"
        echo ""
        echo "Do you want to:"
        echo "   1) Use existing cookies (quick)"
        echo "   2) Update cookies (if expired)"
        echo ""
        echo -n "Your choice [1-2]: "
        read USE_EXISTING
        
        if [ "$USE_EXISTING" = "1" ]; then
            echo ""
            echo "✅ Using existing cookies"
            echo ""
            ./run-sprint-fetcher.sh
            exit 0
        fi
    fi
fi

# Update cookies
echo "Paste your cookies (one per line):"
echo ""

echo -n "JSESSIONID: "
read JSESSIONID

echo -n "atlassian.account.xsrf.token: "
read XSRF_TOKEN

echo -n "tenant.session.token: "
read TENANT_TOKEN

# Save cookies
cat > .jira-session << EOF
export JIRA_JSESSIONID=${JSESSIONID}
export JIRA_ACCOUNT_XSRF_TOKEN=${XSRF_TOKEN}
export JIRA_TENANT_SESSION_TOKEN=${TENANT_TOKEN}
EOF

echo ""
echo "✅ Cookies saved!"
echo ""
echo "🚀 Starting sprint data fetch..."
echo ""

# Run the fetcher
./run-sprint-fetcher.sh

