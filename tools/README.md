# Jira History Exporter

Export Jira issue history using browser session credentials (workaround for API token restrictions).

---

## 🎯 Quick Start

### **Option 1: Using Credentials File** ⭐ **RECOMMENDED**

1. **Copy the template:**
   ```bash
   cd tools
   cp .jira-session.template .jira-session
   ```

2. **Get your session credentials:**
   - Open https://gspcloud.atlassian.net in your browser
   - Make sure you're logged in
   - Open DevTools (F12) → **Application** tab → **Cookies**
   - Find these THREE cookies:
     - `JSESSIONID`
     - `atlassian.account.xsrf.token`
     - `tenant.session.token`
   - Copy their values

3. **Edit `.jira-session` file:**
   ```bash
   nano .jira-session
   ```

   Replace the placeholder values:
   ```
   export JIRA_JSESSIONID=your-actual-jsessionid-value
   export JIRA_ACCOUNT_XSRF_TOKEN=your-actual-account-xsrf-token-value
   export JIRA_TENANT_SESSION_TOKEN=your-actual-tenant-session-token-value
   ```

4. **Run the exporter:**
   ```bash
   ./run-jira-exporter.sh
   ```

---

### **Option 2: Using Environment Variables**

```bash
cd tools

# Set credentials
export JIRA_JSESSIONID='your-jsessionid-value'
export JIRA_XSRF_TOKEN='your-xsrf-token-value'

# Run
./run-jira-exporter.sh
```

---

### **Option 3: Manual Compilation**

```bash
cd tools

# Compile
javac JiraHistoryExporter.java

# Run with environment variables
JIRA_JSESSIONID='your-value' JIRA_XSRF_TOKEN='your-value' java JiraHistoryExporter
```

---

## 📋 How to Get Session Credentials

### **Chrome / Edge:**
1. Open https://gspcloud.atlassian.net
2. Press **F12** (or Right-click → Inspect)
3. Go to **Application** tab
4. In left sidebar: **Cookies** → https://gspcloud.atlassian.net
5. Find and copy:
   - `JSESSIONID` value
   - `atlassian.xsrf.token` value

### **Firefox:**
1. Open https://gspcloud.atlassian.net
2. Press **F12** (or Right-click → Inspect)
3. Go to **Storage** tab
4. In left sidebar: **Cookies** → https://gspcloud.atlassian.net
5. Find and copy the same values

### **Safari:**
1. Enable Developer menu: Preferences → Advanced → Show Develop menu
2. Open https://gspcloud.atlassian.net
3. Develop → Show Web Inspector
4. Go to **Storage** tab
5. Find and copy the same values

---

## 📊 What It Does

The exporter:
1. ✅ Connects to NBCU Jira using your browser session
2. ✅ Runs the JQL query for GPE Discovery Engineering CMS team
3. ✅ Fetches all issues updated since 2025-08-01
4. ✅ Includes full changelog history (`expand=changelog`)
5. ✅ Handles pagination automatically (50 issues per page)
6. ✅ **Consolidates all pages into a single timestamped JSON file**

---

## 🔧 Customizing the Query

Edit `JiraHistoryExporter.java` and modify the `JQL` constant:

```java
private static final String JQL =
    "project%20%3D%20%22YOUR_PROJECT%22%20AND%20updated%20%3E%3D%20%222025-08-01%22";
```

**Tip:** Use the Jira web UI to build your query, then copy the URL-encoded version from the browser address bar.

---

## 📁 Output File

After running, you'll get a **single consolidated file** with timestamp:

```
tools/jira-export-2026-02-12-143022.json
```

### **File Structure:**

```json
{
  "exportDate": "2026-02-12T14:30:22.123",
  "totalIssues": 156,
  "jql": "project = \"GPE Discovery Engineering CMS\" AND ...",
  "issues": [
    {
      "key": "DISCCMS-1234",
      "fields": {
        "summary": "Issue title",
        "status": { "name": "Done" },
        "assignee": { "displayName": "John Doe" },
        "customfield_10016": 5,
        ...
      },
      "changelog": {
        "histories": [
          {
            "created": "2025-08-15T10:30:00.000Z",
            "items": [
              {
                "field": "status",
                "fromString": "In Progress",
                "toString": "QA"
              }
            ]
          },
          ...
        ]
      }
    },
    ...
  ]
}
```

### **What's Included:**

- ✅ **Metadata:** Export date, total count, JQL query
- ✅ **All issues:** Consolidated from all pages
- ✅ **Issue details:** Summary, status, assignee, custom fields
- ✅ **Full changelog:** Every status transition and field change
- ✅ **Ready for analysis:** Single file, easy to process

---

## ⚠️ Important Notes

### **Session Expiration**
Browser sessions typically expire after:
- **Inactivity:** 30-60 minutes
- **Logout:** Immediately
- **Browser close:** Varies by settings

**When session expires:**
1. Get fresh cookies from browser
2. Update `.jira-session` file
3. Run again

### **Security**
- ✅ `.jira-session` is in `.gitignore` (won't be committed)
- ✅ Never share your session credentials
- ✅ Session credentials are temporary (expire automatically)
- ⚠️ Anyone with your session can access Jira as you

### **Rate Limiting**
- Jira may rate-limit requests
- The exporter waits between pages automatically
- If you hit limits, wait a few minutes and retry

---

## 🐛 Troubleshooting

### **"ERROR: Missing session credentials!"**
- Make sure `.jira-session` file exists and has correct values
- Or set environment variables before running

### **"401 Unauthorized" or "403 Forbidden"**
- Session expired - get fresh cookies
- Not logged in - log in to Jira first
- Insufficient permissions - contact Jira admin

### **"No files found"**
- Check for error messages in output
- Verify JQL query is correct
- Check network connection

### **Compilation errors**
- Make sure Java is installed: `java -version`
- Use Java 11 or higher

---

## 💡 Next Steps

After exporting:

1. **Process the data:**
   ```bash
   # The file is ready to use - no combining needed!
   # Example: Parse with jq
   jq '.totalIssues' jira-export-*.json
   jq '.issues[0].key' jira-export-*.json
   ```

2. **Import into your metrics service:**
   - Read the JSON file
   - Parse the issues array
   - Process changelog for QA failures
   - Calculate velocity and trends

3. **Keep historical snapshots:**
   ```bash
   # Files are timestamped, so you can keep multiple exports
   ls -lh jira-export-*.json

   # Compare exports over time
   jq '.totalIssues' jira-export-2026-02-01-*.json
   jq '.totalIssues' jira-export-2026-02-12-*.json
   ```

4. **Clean up old exports (optional):**
   ```bash
   # Remove old exports
   rm jira-export-2026-01-*.json
   ```

---

## 🔄 Alternative: Use API Token

If you can get an API token later:
- Update `src/main/resources/application.yml`
- Use the main Spring Boot application instead
- More reliable and doesn't require session refresh

---

**Questions?** Check the main project README or contact the team!

