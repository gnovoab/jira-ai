#!/bin/bash
# Update Current Sprint - Delta Update Script

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 Sprint Delta Updater"
echo "======================="

# Check session file
if [ ! -f ".jira-session" ]; then
    echo "❌ ERROR: .jira-session file not found!"
    exit 1
fi

# Load credentials
source .jira-session

# Compile
echo "🔨 Compiling..."
javac -cp "jackson-core-2.18.2.jar:jackson-databind-2.18.2.jar:jackson-annotations-2.18.2.jar" UpdateCurrentSprint.java

# Run
echo "🚀 Running delta update..."
java -cp ".:jackson-core-2.18.2.jar:jackson-databind-2.18.2.jar:jackson-annotations-2.18.2.jar" UpdateCurrentSprint

echo ""
echo "✅ Delta update complete!"

