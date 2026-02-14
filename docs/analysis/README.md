# Analysis & Results Documentation

Documentation for sprint analysis, QA metrics, and findings.

## 📋 Files in This Section

### **QA_ANALYSIS_FIXED_RESULTS.md** ⭐ **LATEST**
- **Current QA failure analysis results**
- Fixed sprint grouping logic (only counts issues in most recent sprint)
- Accurate QA metrics across all sprints
- **This is the authoritative QA analysis document**

---

## 📊 Key Findings (Latest)

### Overall QA Metrics
- **Total Issues Analyzed**: 483 across 9 sprints
- **Total QA Tested**: 192 issues
- **Total QA Failed**: 61 issues
- **Overall QA Failure Rate**: 31.77%

### Sprint-by-Sprint Results
- **Most sprints**: 0-3 QA failures (matches expectations ✅)
- **Sprint 3**: 41 failures (60.29%) - Outlier, needs investigation
- **Sprint 5**: 12 failures (25.53%)
- **Sprint 8**: 8 failures (26.67%)

### Critical Fix Applied
- **Problem**: Issues were counted in every sprint they'd ever been in
- **Solution**: Only count issues in their most recent sprint
- **Result**: Accurate metrics that match reality

---

## 🔍 Available Analysis Endpoints

### QA Analysis
```bash
# Comprehensive QA summary
curl http://localhost:8080/api/test/qa-analysis/summary | jq .

# Top failure sprints
curl http://localhost:8080/api/test/qa-analysis/top-failures | jq .
```

### Sprint Analysis
```bash
# All sprint summaries
curl http://localhost:8080/api/sprints | jq .

# Specific sprint
curl http://localhost:8080/api/sprints | jq '.[] | select(.sprintId == "79948")'
```

### Debug Endpoints
```bash
# Status transitions for a sprint
curl http://localhost:8080/api/debug/qa/status-transitions/79948 | jq .

# QA failures with details
curl http://localhost:8080/api/debug/qa/qa-failures/79948 | jq .
```

---

## 📖 Understanding the Analysis

### QA Failure Detection
Issues are flagged as QA failures if their changelog contains status transitions to:
- "QA Failed"
- "Failed QA"
- "Rejected"

### Sprint Assignment
Each issue is assigned to its **most recent sprint** (last sprint in the sprint array). This prevents double-counting issues that moved between sprints.

### Metrics Calculated
- Total issues per sprint
- Issues by type (Story, Bug, Task, Sub-task, Other)
- Completion percentage
- QA tested count
- QA failure count and rate
- Sprint length and dates

---

## 🔗 Related Documentation

- **Data Fetching**: See `/docs/data-fetching/` for updating sprint data
- **Setup**: See `/docs/setup/` for initial configuration
- **Archive**: See `/docs/archive/` for historical analysis results

---

## 📁 Related Controllers

- `QaAnalysisTestController.java` - QA failure analysis endpoints
- `SprintAnalysisController.java` - Sprint metrics endpoints
- `QaDebugController.java` - Debug and troubleshooting endpoints

---

[Back to Documentation Index](../README.md)

