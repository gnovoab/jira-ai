#!/bin/bash

# Sprint Data Fetcher - Fetches all issues for each sprint and caches them
# This script uses browser session cookies to authenticate with Jira

set -e

cd "$(dirname "$0")"

# Load session credentials
if [ -f .jira-session ]; then
    source .jira-session
else
    echo "❌ ERROR: .jira-session file not found!"
    echo "Please create tools/.jira-session with your session cookies"
    exit 1
fi

# Download Jackson libraries if not present
JACKSON_VERSION="2.18.2"
JACKSON_CORE="jackson-core-${JACKSON_VERSION}.jar"
JACKSON_DATABIND="jackson-databind-${JACKSON_VERSION}.jar"
JACKSON_ANNOTATIONS="jackson-annotations-${JACKSON_VERSION}.jar"

if [ ! -f "$JACKSON_CORE" ] || [ ! -f "$JACKSON_DATABIND" ] || [ ! -f "$JACKSON_ANNOTATIONS" ]; then
    echo "📦 Downloading Jackson libraries..."
    curl -sL "https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-core/${JACKSON_VERSION}/${JACKSON_CORE}" -o "$JACKSON_CORE"
    curl -sL "https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-databind/${JACKSON_VERSION}/${JACKSON_DATABIND}" -o "$JACKSON_DATABIND"
    curl -sL "https://repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-annotations/${JACKSON_VERSION}/${JACKSON_ANNOTATIONS}" -o "$JACKSON_ANNOTATIONS"
    echo "✅ Jackson libraries downloaded"
fi

# Compile the Java file
echo "🔨 Compiling SprintDataFetcher.java..."
javac -cp ".:${JACKSON_CORE}:${JACKSON_DATABIND}:${JACKSON_ANNOTATIONS}" SprintDataFetcher.java

# Run the fetcher
echo ""
echo "🚀 Running Sprint Data Fetcher..."
echo ""
java -cp ".:${JACKSON_CORE}:${JACKSON_DATABIND}:${JACKSON_ANNOTATIONS}" SprintDataFetcher

echo ""
echo "✅ Done!"

