# Sprint Database Delta Update Guide

## 🎯 **Overview**

This guide explains how to update your Sprint Master Database **without re-fetching all historical data**. Perfect for when the current sprint completes or you want to refresh active sprint data.

---

## 📊 **Two Update Strategies**

### 1. **Full Fetch** (Initial Setup or New Sprints)
- **Script**: `./quick-fetch.sh` or `./run-sprint-fetcher.sh`
- **What it does**: Discovers all sprints and fetches only NEW sprints not in the database
- **When to use**: 
  - Initial database creation
  - After a new sprint starts
  - Weekly/monthly to catch any new sprints
- **Performance**: Only fetches sprints not already cached

### 2. **Delta Update** (Active Sprint Refresh) ✨ **NEW**
- **Script**: `./update-current-sprint.sh`
- **What it does**: Re-fetches ONLY active/in-progress sprints
- **When to use**:
  - Daily during an active sprint
  - When you know issues were added/updated in the current sprint
  - After sprint completion to get final state
- **Performance**: Only fetches 1-2 active sprints (very fast!)

---

## 🚀 **Quick Start**

### Initial Setup (First Time)
```bash
cd tools
source .jira-session
./quick-fetch.sh
```

### Daily/Weekly Updates (During Sprint)
```bash
cd tools
source .jira-session
./update-current-sprint.sh
```

### Monthly Updates (Catch New Sprints)
```bash
cd tools
source .jira-session
./quick-fetch.sh
```

---

## 🔄 **How Delta Updates Work**

### Step 1: Identify Active Sprints
The script queries the Jira Agile API to check the state of each sprint:
- `active` → Will be updated
- `closed` → Skipped (already complete)
- `future` → Skipped (not started yet)

### Step 2: Re-fetch Active Sprint Data
For each active sprint:
- Fetches ALL issues using `Sprint = {sprintId}` JQL query
- Includes full changelog and all fields
- Replaces the old sprint data in the database

### Step 3: Save Updated Database
- Updates the master database file
- Preserves all historical sprint data
- Only modifies active sprint entries

---

## 📋 **Example Workflow**

### Scenario: Sprint 9 is Active

**Monday** (Sprint in progress):
```bash
./update-current-sprint.sh
```
Output:
```
🔍 Finding active sprints...
   Sprint 82498: active
✅ Found 1 active sprint(s): [82498]

📦 Updating sprint 82498...
   Old issue count: 15
   New issue count: 23
   Delta: +8

✅ Update complete!
```

**Friday** (Sprint completed):
```bash
./update-current-sprint.sh
```
Output:
```
🔍 Finding active sprints...
   Sprint 82498: closed
✅ No active sprints found. All sprints are completed!
```

**Next Monday** (New sprint started):
```bash
./quick-fetch.sh
```
Output:
```
📋 Discovering all sprints...
✅ Found 11 total sprints in Jira
📥 Sprints to fetch: 1
⏭️  Sprints already cached: 10

📦 Fetching sprint 82650...
✅ Sprint 82650 saved to master database
```

---

## 🎯 **Best Practices**

### 1. **During Active Sprint**
- Run `update-current-sprint.sh` **daily** or **after major changes**
- Very fast (only updates 1 sprint)
- Keeps your metrics up-to-date

### 2. **After Sprint Completion**
- Run `update-current-sprint.sh` one final time to capture final state
- Then run `quick-fetch.sh` to discover the new sprint

### 3. **Weekly Maintenance**
- Run `quick-fetch.sh` once a week to catch any new sprints
- It will skip sprints already in the database

### 4. **Session Management**
- Update `.jira-session` when your browser session expires
- Always run `source .jira-session` before running scripts

---

## 🔍 **Verification**

After running an update, verify the changes:

```bash
# Check database status
curl http://localhost:8080/api/test/sprint-database/status | jq .

# Check specific sprint
curl http://localhost:8080/api/test/sprint-database/sprint/82498 | jq '{totalIssues, lastFetched}'

# View all sprints
curl http://localhost:8080/api/sprints | jq '.[] | {sprintName, totalIssues}'
```

---

## ⚡ **Performance Comparison**

| Operation | Sprints Fetched | Time | Data Transfer |
|-----------|----------------|------|---------------|
| **Initial Full Fetch** | 10 sprints | ~5 minutes | 52 MB |
| **Quick Fetch (no new sprints)** | 0 sprints | ~10 seconds | <1 MB |
| **Quick Fetch (1 new sprint)** | 1 sprint | ~30 seconds | ~5 MB |
| **Delta Update (1 active sprint)** | 1 sprint | ~30 seconds | ~5 MB |

---

## 🛠️ **Troubleshooting**

### "No active sprints found"
- This is normal if all sprints are completed
- Run `quick-fetch.sh` to discover new sprints

### "Session credentials not set"
- Run `source .jira-session` before the script
- Check that `.jira-session` file exists and has valid credentials

### "Could not check sprint X"
- Some old sprints might not be accessible via the Agile API
- This is normal and can be ignored

---

## 📁 **Files**

- `UpdateCurrentSprint.java` - Delta update implementation
- `update-current-sprint.sh` - Shell script to run delta updates
- `SprintDataFetcher.java` - Full fetch implementation (skips existing sprints)
- `quick-fetch.sh` - Shell script to run full fetch
- `jira-sprint-database.json` - Master database file (52 MB)

---

## ✅ **Summary**

**For daily updates during a sprint:**
```bash
cd tools && source .jira-session && ./update-current-sprint.sh
```

**For catching new sprints:**
```bash
cd tools && source .jira-session && ./quick-fetch.sh
```

**Both scripts are smart:**
- ✅ Never re-fetch completed sprints
- ✅ Only fetch what's needed
- ✅ Preserve all historical data
- ✅ Fast and efficient

🎉 **You now have a complete delta update system!**

