# Sprint Master Database

## Overview

The Sprint Data Fetcher creates and maintains a **single master database file** (`jira-sprint-database.json`) that contains ALL sprint data from Jira. Once a sprint is fetched, it's stored permanently and **never queried again**.

## How It Works

### 1. **First Run - Discovery**
```bash
cd tools
./run-sprint-fetcher.sh
```

The fetcher will:
- Scan all team issues to discover sprint IDs
- Check which sprints are already in the database
- Fetch ONLY the missing sprints
- Save incrementally after each sprint

### 2. **Subsequent Runs - Smart Updates**

If you run it again:
- ✅ Sprints already in database → **SKIPPED** (no API call)
- 🆕 New sprints found → **FETCHED** and added to database
- 💾 Database updated incrementally

### 3. **Database Structure**

```json
{
  "created": "2026-02-13T17:30:00",
  "lastUpdated": "2026-02-13T17:35:00",
  "totalSprints": 8,
  "sprints": {
    "1234": {
      "sprintId": "1234",
      "fetchedAt": "2026-02-13T17:30:15",
      "totalIssues": 45,
      "issues": [
        {
          "key": "CMS-123",
          "fields": {
            "summary": "...",
            "status": {...},
            "customfield_10020": [...],
            ...
          },
          "changelog": {...}
        },
        ...
      ]
    },
    "5678": {
      "sprintId": "5678",
      ...
    }
  }
}
```

## Key Features

### ✅ **One-Time Fetch**
- Each sprint is fetched exactly ONCE
- No duplicate API calls
- No wasted bandwidth

### ✅ **Incremental Updates**
- Database saved after each sprint
- Can resume if interrupted
- No data loss

### ✅ **Complete Data**
- Full issue details
- Complete changelog history
- All custom fields
- All issue types

### ✅ **Smart Detection**
- Automatically discovers new sprints
- Only fetches what's missing
- Skips already-cached sprints

## Usage Examples

### First Time Setup
```bash
# 1. Update session cookies
vim tools/.jira-session

# 2. Run the fetcher
cd tools
./run-sprint-fetcher.sh

# Output:
# 🚀 Sprint Data Fetcher - Master Database Mode
# ==================================================
# 📝 Creating new master database...
# 📊 Current database status:
#    Sprints already cached: 0
# 
# 📋 Step 1: Discovering all sprints...
#    Scanned 100 / 436 issues...
#    Scanned 200 / 436 issues...
#    ...
# ✅ Found 8 total sprints in Jira
# 📥 Sprints to fetch: 8
# 
# 📥 Step 2: Fetching missing sprint data...
# 
# 📦 Fetching sprint 1234...
#    Fetched 45 / 45 issues...
#    ✅ Fetched 45 issues for sprint 1234
#    💾 Master database updated
# ✅ Sprint 1234 saved to master database
# ...
```

### Subsequent Runs (New Sprint Added)
```bash
cd tools
./run-sprint-fetcher.sh

# Output:
# 🚀 Sprint Data Fetcher - Master Database Mode
# ==================================================
# 📂 Loading existing master database...
# 📊 Current database status:
#    Sprints already cached: 8
# 
# 📋 Step 1: Discovering all sprints...
# ✅ Found 9 total sprints in Jira
# 📥 Sprints to fetch: 1
# ⏭️  Sprints already cached: 8
# 
# 📥 Step 2: Fetching missing sprint data...
# 
# 📦 Fetching sprint 9999...
#    Fetched 52 / 52 issues...
#    ✅ Fetched 52 issues for sprint 9999
#    💾 Master database updated
# ✅ Sprint 9999 saved to master database
```

### All Sprints Cached
```bash
cd tools
./run-sprint-fetcher.sh

# Output:
# 🚀 Sprint Data Fetcher - Master Database Mode
# ==================================================
# 📂 Loading existing master database...
# 📊 Current database status:
#    Sprints already cached: 9
# 
# 📋 Step 1: Discovering all sprints...
# ✅ Found 9 total sprints in Jira
# 📥 Sprints to fetch: 0
# ⏭️  Sprints already cached: 9
# 
# ✅ All sprints already in database! Nothing to fetch.
# 📁 Database file: jira-sprint-database.json
```

## Database File Location

- **File**: `tools/jira-sprint-database.json`
- **Size**: ~5-10 MB (depends on number of issues)
- **Format**: Pretty-printed JSON (human-readable)

## Benefits

1. **No Repeated Queries** - Once fetched, never query Jira again for that sprint
2. **Fast Startup** - Application loads from local file instead of API
3. **Offline Analysis** - Can analyze data without Jira access
4. **Version Control** - Can commit database to git for team sharing
5. **Backup Friendly** - Single file to backup/restore

## Next Steps

After fetching all sprints, you can:
1. Load the database into your Spring Boot application
2. Analyze sprint metrics without hitting Jira API
3. Run the fetcher periodically to get new sprints only

