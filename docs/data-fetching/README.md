# Data Fetching & Sprint Database Documentation

Documentation for fetching Jira data and managing the Sprint Master Database.

## 📋 Files in This Section

### **QUICK_REFERENCE.md** ⭐ **START HERE**
- Quick command reference card
- Common commands for daily use
- When to use which script

### **ADD_SPRINT_GUIDE.md** ⭐ **RECOMMENDED**
- How to add a completed sprint to the database
- Step-by-step guide with examples
- **Use this when a sprint ends!**

### **DELTA_UPDATE_GUIDE.md**
- How to update active sprints without re-fetching all data
- Delta update strategies
- Performance optimization

### **SPRINT_DATABASE_README.md**
- Complete Sprint Master Database documentation
- Architecture and design
- How the database works

### **ADD_COMPLETED_SPRINT_SUMMARY.md**
- Summary of the add-sprint feature
- Quick overview and benefits

### **DELTA_UPDATE_SUMMARY.md**
- Summary of delta update capabilities
- Comparison of update strategies

### **SPRINT_DATABASE_INTEGRATION.md**
- How the Sprint Database integrates with Spring Boot
- Data source architecture
- Integration details

### **QUICKSTART.md**
- Quick start guide for data fetching tools
- Initial setup instructions

---

## 🚀 Quick Commands

### **When a Sprint Ends** (Recommended)
```bash
cd tools
source .jira-session
./add-sprint.sh <sprintId>
```

### **Daily During Sprint**
```bash
cd tools
source .jira-session
./update-current-sprint.sh
```

### **Weekly Maintenance**
```bash
cd tools
source .jira-session
./quick-fetch.sh
```

---

## 📖 Reading Order for New Users

1. **QUICK_REFERENCE.md** - Learn the basic commands
2. **ADD_SPRINT_GUIDE.md** - Understand how to add sprints
3. **SPRINT_DATABASE_README.md** - Deep dive into the database
4. **DELTA_UPDATE_GUIDE.md** - Advanced update strategies

---

## 🔗 Related Documentation

- **Setup**: See `/docs/setup/` for initial configuration
- **Analysis**: See `/docs/analysis/` for using the data
- **Tools**: See `/tools/` for the actual scripts

---

## 📁 Related Files in `/tools/`

- `add-sprint.sh` - Add a completed sprint
- `update-current-sprint.sh` - Update active sprints
- `quick-fetch.sh` - Discover and fetch new sprints
- `jira-sprint-database.json` - Master database file

---

[Back to Documentation Index](../README.md)

