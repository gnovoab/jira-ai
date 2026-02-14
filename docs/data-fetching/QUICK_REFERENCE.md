# Sprint Database Update - Quick Reference Card

## 🚀 **Quick Commands**

### **Add Completed Sprint (When Sprint Ends)** ⭐ **RECOMMENDED**
```bash
cd tools && source .jira-session && ./add-sprint.sh <sprintId>
```
- Adds one specific sprint to database
- Gets complete final state
- **Use this when a sprint completes!**

### **Update Current Sprint (Daily)**
```bash
cd tools && source .jira-session && ./update-current-sprint.sh
```
- Updates only active sprints
- Fast (~30 seconds)
- Use during active sprint

### **Fetch New Sprints (Weekly)**
```bash
cd tools && source .jira-session && ./quick-fetch.sh
```
- Discovers new sprints
- Skips existing sprints
- Use after new sprint starts

---

## 📋 **When to Use Which Script**

| Situation | Command | Why |
|-----------|---------|-----|
| **Sprint just completed** ⭐ | `add-sprint.sh <sprintId>` | Add final sprint data |
| **Daily during sprint** | `update-current-sprint.sh` | Refresh active sprint data |
| **New sprint started** | `add-sprint.sh <sprintId>` | Add new sprint to database |
| **Weekly maintenance** | `quick-fetch.sh` | Catch any new sprints |
| **First time setup** | `quick-fetch.sh` | Fetch all sprints |

---

## 🔍 **Verification Commands**

```bash
# Check database status
curl http://localhost:8080/api/test/sprint-database/status | jq .

# View all sprints
curl http://localhost:8080/api/sprints | jq '.[] | {sprintName, totalIssues}'

# Check specific sprint
curl http://localhost:8080/api/sprints | jq '.[] | select(.sprintName == "Calandria Sprint 9")'

# QA analysis
curl http://localhost:8080/api/test/qa-analysis/summary | jq .
```

---

## ⚡ **Performance**

| Operation | Time | Data |
|-----------|------|------|
| Add 1 sprint | ~30 sec | ~5 MB |
| Delta update (1 active sprint) | ~30 sec | ~5 MB |
| Quick fetch (no new sprints) | ~10 sec | <1 MB |
| Quick fetch (1 new sprint) | ~30 sec | ~5 MB |
| Full fetch (10 sprints) | ~5 min | 52 MB |

---

## 🛠️ **Troubleshooting**

### Session expired?
```bash
# Update .jira-session with new credentials
# Then run:
source tools/.jira-session
```

### Database not loading in Spring Boot?
```bash
# Restart Spring Boot app
./gradlew bootRun
```

### Want to see what changed?
```bash
# Before update
curl http://localhost:8080/api/sprints | jq '.[] | select(.sprintId == "82498") | .totalIssues'

# Run update
cd tools && ./update-current-sprint.sh

# After update
curl http://localhost:8080/api/sprints | jq '.[] | select(.sprintId == "82498") | .totalIssues'
```

---

## 📁 **Files**

- `jira-sprint-database.json` - Master database (52 MB)
- `add-sprint.sh` - Add specific sprint (recommended)
- `update-current-sprint.sh` - Delta update script
- `quick-fetch.sh` - Full fetch script (skips existing)
- `.jira-session` - Session credentials (update when expired)

---

## ✅ **Best Practices**

1. **When sprint ends**: Run `add-sprint.sh <sprintId>` to capture final state ⭐
2. **Daily during sprint**: Run `update-current-sprint.sh` to refresh active sprint
3. **Weekly**: Run `quick-fetch.sh` to catch any new sprints
4. **Keep credentials fresh**: Update `.jira-session` when browser session expires

---

## 🎯 **Remember**

- ✅ Both scripts are smart - they never re-fetch completed sprints
- ✅ Spring Boot auto-reloads the database on next request
- ✅ All historical data is always preserved
- ✅ Delta updates are 90% faster than full re-fetch

**You're all set!** 🚀

