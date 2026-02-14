# Add Completed Sprint - User Guide

## 🎯 **Purpose**

When a sprint ends, use this tool to add the **completed sprint's final data** to your master database. This captures the complete sprint summary without re-fetching all historical data.

---

## 🚀 **Quick Start**

### **When Sprint 10 Completes:**

```bash
cd tools
source .jira-session
./add-sprint.sh 82650
```

**That's it!** The script will:
1. ✅ Check if the sprint exists in the database
2. ✅ Fetch the sprint's complete data (all issues, changelog, fields)
3. ✅ Add it to the master database
4. ✅ Save the updated database

---

## 📋 **How to Find Sprint ID**

### **Method 1: From Jira URL**
When viewing a sprint in Jira, check the URL:
```
https://gspcloud.atlassian.net/jira/software/c/projects/DISCCMS/boards/123/backlog?sprint=82650
                                                                                        ^^^^^^
                                                                                     Sprint ID
```

### **Method 2: From Existing Database**
```bash
# List all sprints in database
curl http://localhost:8080/api/sprints | jq '.[] | {sprintId, sprintName}'
```

### **Method 3: From Sprint Name**
If you know the sprint name but not the ID, you can discover it:
```bash
cd tools
source .jira-session
./quick-fetch.sh
# This will show all sprint IDs during discovery
```

---

## 📖 **Detailed Usage**

### **Basic Usage**
```bash
./add-sprint.sh <sprintId>
```

### **Example: Add Sprint 82650**
```bash
cd tools
source .jira-session
./add-sprint.sh 82650
```

**Output:**
```
📥 Add Completed Sprint to Database
==================================================
Sprint ID: 82650

📊 Current database status:
   Total sprints in database: 10

🔍 Fetching sprint information...
   Sprint Name: Calandria Sprint 10
   Sprint State: closed

📦 Fetching complete sprint data...
   Fetched 45 issues...
   ✅ Fetched 45 issues for sprint 82650

💾 Saved to jira-sprint-database.json (57 MB)

==================================================
🎉 Sprint added successfully!
   Sprint: Calandria Sprint 10 (82650)
   Issues: 45
   Total sprints in database: 11

📁 Database file: jira-sprint-database.json
```

---

## ⚠️ **Important Notes**

### **1. Sprint Already Exists**
If the sprint is already in the database, you'll be prompted:
```
⚠️  Sprint 82650 already exists in database!
Do you want to update it with fresh data? (y/n):
```

- Type `y` to update with fresh data
- Type `n` to cancel

### **2. Sprint Still Active**
If the sprint is still active (not closed), you'll see a warning:
```
⚠️  WARNING: This sprint is still ACTIVE!
   It's recommended to wait until the sprint is closed to get the final state.
Do you want to continue anyway? (y/n):
```

- Type `y` to fetch current state (not recommended)
- Type `n` to wait until sprint closes (recommended)

### **3. Spring Boot Reload**
After adding a sprint, restart your Spring Boot app to load the new data:
```bash
# Stop current app (Ctrl+C)
./gradlew bootRun
```

The app will automatically load the updated database on startup.

---

## 🔄 **Typical Workflow**

### **Sprint 9 Ends, Sprint 10 Starts**

**Day 1 (Sprint 9 just completed):**
```bash
# Add Sprint 9 final data
cd tools
source .jira-session
./add-sprint.sh 82498
```

**Day 2 (Sprint 10 started):**
```bash
# Add Sprint 10 (initial state)
./add-sprint.sh 82650
```

**During Sprint 10:**
```bash
# Optional: Update Sprint 10 as it progresses
./add-sprint.sh 82650  # Answer 'y' to update
```

**Sprint 10 Ends:**
```bash
# Update Sprint 10 with final state
./add-sprint.sh 82650  # Answer 'y' to update
```

---

## ✅ **Verification**

After adding a sprint, verify it was added correctly:

```bash
# Check database status
curl http://localhost:8080/api/test/sprint-database/status | jq .

# View all sprints
curl http://localhost:8080/api/sprints | jq '.[] | {sprintName, sprintId, totalIssues}'

# Check the specific sprint
curl http://localhost:8080/api/sprints | jq '.[] | select(.sprintId == "82650")'

# View sprint summary
curl http://localhost:8080/api/sprints | jq '.[] | select(.sprintId == "82650") | {
  sprintName,
  totalIssues,
  completedIssues,
  completionPercentage,
  qaFailed,
  qaFailureRatio
}'
```

---

## 🎯 **Best Practices**

### **1. Add Sprints When They Close**
- Wait until the sprint is officially closed in Jira
- This ensures you capture the final, complete state
- No need to update again later

### **2. One Sprint at a Time**
- Add sprints individually as they complete
- This keeps your database up-to-date incrementally
- No need to re-fetch all historical data

### **3. Keep Session Fresh**
- Update `.jira-session` when your browser session expires
- Always run `source .jira-session` before the script

### **4. Verify After Adding**
- Check the Spring Boot API to confirm the sprint was added
- Verify issue counts match what you see in Jira

---

## 🛠️ **Troubleshooting**

### **"Sprint ID required!"**
```bash
# You forgot to provide the sprint ID
./add-sprint.sh 82650  # ✅ Correct
```

### **"Session credentials not properly set!"**
```bash
# Load session credentials first
source .jira-session
./add-sprint.sh 82650
```

### **"Could not fetch sprint information!"**
- Check that the sprint ID is correct
- Verify your session credentials are valid
- Make sure you have access to the sprint in Jira

### **Sprint not showing in Spring Boot**
```bash
# Restart Spring Boot to reload the database
./gradlew bootRun
```

---

## 📊 **Performance**

| Operation | Time | Data Transfer |
|-----------|------|---------------|
| Add 1 sprint (~50 issues) | ~30 seconds | ~5 MB |
| Add 1 sprint (~100 issues) | ~60 seconds | ~10 MB |

**Much faster than re-fetching all sprints!**

---

## 📁 **Files**

- `AddCompletedSprint.java` - Java implementation
- `add-sprint.sh` - Shell script wrapper
- `jira-sprint-database.json` - Master database (updated in-place)

---

## ✅ **Summary**

**When a sprint ends:**
```bash
cd tools && source .jira-session && ./add-sprint.sh <sprintId>
```

**That's all you need!** The script handles everything:
- ✅ Fetches complete sprint data
- ✅ Adds to master database
- ✅ Preserves all historical data
- ✅ Fast and efficient

**No need to re-fetch all historical sprints!** 🎉

