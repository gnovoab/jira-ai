# Engineering Metrics Service - Documentation

This directory contains all documentation organized by topic.

## 📁 Directory Structure

### `/setup` - Initial Setup & Configuration
- Getting started guides
- NBCU Jira access setup
- Configuration instructions

### `/data-fetching` - Data Collection & Updates
- Sprint database management
- Data fetching tools and scripts
- Update strategies (delta, incremental)

### `/analysis` - Analysis & Results
- QA failure analysis
- Sprint metrics analysis
- Analysis results and findings

### `/archive` - Historical Documentation
- Deprecated guides
- Old analysis results
- Reference materials

---

## 🚀 Quick Start

**New to the project?** Start here:
1. Run `./gradlew bootRun` to start the server
2. Open `http://localhost:8081` in your browser
3. Explore the Dashboard, Sprint Overview, and Fix Versions pages

**For data updates:**
1. Check `/data-fetching/QUICK_REFERENCE.md` for common commands
2. Use the Database page in the UI to fetch fresh data from Jira

---

## 🖥️ Web UI Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Overview with 8 charts in a carousel, Sprint Summary with clickable cards |
| **Sprint Overview** | Detailed sprint metrics, issue breakdown, work distribution |
| **Fix Versions** | Metrics grouped by release version (2.40, 2.41, etc.) |
| **Sprints** | Sprint list with comparison features |
| **QA Analysis** | QA failure analysis and trends |
| **Trends** | Historical performance trends |
| **Database** | Sprint database status, Jira fetch with session credentials |
| **Debug Tools** | Advanced debugging and data inspection |

---

## 📋 Documentation Index

| Document | Description |
|----------|-------------|
| [QUICK_REFERENCE.md](data-fetching/QUICK_REFERENCE.md) | Common commands and quick reference |
| [ADD_SPRINT_GUIDE.md](data-fetching/ADD_SPRINT_GUIDE.md) | How to add completed sprints |
| [QA_ANALYSIS_FIXED_RESULTS.md](analysis/QA_ANALYSIS_FIXED_RESULTS.md) | Latest QA metrics |
| [ENGINEERING_METRICS_SERVICE_SPEC.md](../ai/ENGINEERING_METRICS_SERVICE_SPEC.md) | Full technical specification |

---

**Last Updated:** 2026-02-16
