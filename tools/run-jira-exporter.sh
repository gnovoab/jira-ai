#!/bin/bash

# Jira History Exporter - Easy Runner Script
# This script helps you run the JiraHistoryExporter with browser session credentials

echo "=========================================="
echo "Jira History Exporter"
echo "=========================================="
echo ""

# Try to load credentials from .jira-session file first
if [ -f ".jira-session" ]; then
    echo "📄 Loading credentials from .jira-session file..."
    source .jira-session
    echo "✅ Credentials loaded from file!"
    echo ""
fi

# Check if credentials are set (from file or environment)
if [ -z "$JIRA_JSESSIONID" ] || [ -z "$JIRA_ACCOUNT_XSRF_TOKEN" ] || [ -z "$JIRA_TENANT_SESSION_TOKEN" ]; then
    echo "⚠️  Session credentials not found!"
    echo ""
    echo "Option 1: Create a .jira-session file (RECOMMENDED)"
    echo "  cp .jira-session.template .jira-session"
    echo "  # Edit .jira-session and add your credentials"
    echo ""
    echo "Option 2: Enter credentials now (temporary)"
    echo ""
    echo "📋 How to get your session credentials:"
    echo "  1. Open https://gspcloud.atlassian.net in your browser"
    echo "  2. Make sure you're logged in"
    echo "  3. Open DevTools (F12 or Right-click → Inspect)"
    echo "  4. Go to: Application tab → Cookies → https://gspcloud.atlassian.net"
    echo "  5. Find and copy these THREE values:"
    echo "     - JSESSIONID"
    echo "     - atlassian.account.xsrf.token"
    echo "     - tenant.session.token"
    echo ""

    # Prompt for credentials
    read -p "Enter JSESSIONID (or Ctrl+C to exit): " JSESSIONID_INPUT
    read -p "Enter atlassian.account.xsrf.token: " ACCOUNT_XSRF_TOKEN_INPUT
    read -p "Enter tenant.session.token: " TENANT_SESSION_TOKEN_INPUT

    export JIRA_JSESSIONID="$JSESSIONID_INPUT"
    export JIRA_ACCOUNT_XSRF_TOKEN="$ACCOUNT_XSRF_TOKEN_INPUT"
    export JIRA_TENANT_SESSION_TOKEN="$TENANT_SESSION_TOKEN_INPUT"

    echo ""
    echo "✅ Credentials set!"
    echo ""
fi

# Compile the Java file
echo "🔨 Compiling JiraHistoryExporter.java..."
javac JiraHistoryExporter.java

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo "✅ Compilation successful!"
echo ""

# Run the exporter
echo "🚀 Running Jira History Exporter..."
echo "   This will download all pages and save them in a single consolidated file"
echo ""

java JiraHistoryExporter

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ Export completed successfully!"
    echo "=========================================="
    echo ""
    echo "📁 Output file:"
    ls -lh jira-export-*.json 2>/dev/null | tail -1 || echo "   No files found (check for errors above)"
    echo ""
    echo "💡 Next steps:"
    echo "   - Import the JSON file into your metrics service"
    echo "   - Process the changelog data for QA failures"
    echo "   - Analyze trends and patterns"
    echo ""
    echo "📊 File structure:"
    echo "   {"
    echo "     \"exportDate\": \"...\","
    echo "     \"totalIssues\": 123,"
    echo "     \"jql\": \"...\","
    echo "     \"issues\": [...]"
    echo "   }"
else
    echo ""
    echo "=========================================="
    echo "❌ Export failed!"
    echo "=========================================="
    echo ""
    echo "Common issues:"
    echo "  - Session expired: Get fresh cookies from browser"
    echo "  - Network error: Check your connection"
    echo "  - JQL error: Verify the query is correct"
fi

