#!/bin/bash
# Add Completed Sprint - Adds a specific sprint to the database

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ $# -eq 0 ]; then
    echo "Usage: ./add-sprint.sh <sprintId>"
    echo "Example: ./add-sprint.sh 82498"
    exit 1
fi

SPRINT_ID=$1

# Load credentials
source .jira-session

# Compile
javac -cp "jackson-core-2.18.2.jar:jackson-databind-2.18.2.jar:jackson-annotations-2.18.2.jar" AddCompletedSprint.java

# Run
java -cp ".:jackson-core-2.18.2.jar:jackson-databind-2.18.2.jar:jackson-annotations-2.18.2.jar" AddCompletedSprint "$SPRINT_ID"
