# Setup & Configuration Documentation

Documentation for initial project setup and configuration.

## 📋 Files in This Section

### **HELP.md**
- General help and getting started guide
- Overview of the project
- File-based data ingestion approach

---

## 🚀 Quick Start for New Users

1. **Read HELP.md** - Understand the project
2. **Set up browser session** - See `/docs/data-fetching/` for session setup
3. **Fetch sprint data** - Use the data fetching tools in `/tools/`

---

## 📊 Data Ingestion Approach

This project uses a **file-based approach** for Jira data:

- ✅ **No API tokens required** - Uses browser session authentication
- ✅ **Sprint Master Database** - Single JSON file with all sprint data
- ✅ **Browser session cookies** - JSESSIONID, XSRF token, tenant session token
- ✅ **Manual data fetching** - Run scripts when sprints complete

**Why file-based?**
- NBCU Jira API token access was never approved
- Browser session authentication works reliably
- Complete control over data fetching and storage
- No rate limiting or API quota concerns

---

## 🔗 Related Documentation

- **Data Fetching**: See `/docs/data-fetching/` for how to fetch sprint data
- **Analysis**: See `/docs/analysis/` for QA and sprint analysis

---

[Back to Documentation Index](../README.md)

---

## 🆘 Need Help?

- **Process documentation:** https://nbcu-ot.atlassian.net/wiki/spaces/ATLASSIAN/pages/131662031/Personal+Access+Tokens
- **Questions?** Contact Alex Filler or Catherine Xu

---

**Start with:** `README_NBCU_SETUP.md` 🚀

