# 🚀 Quick Start - Fetch All Sprint Data

## Super Simple - 3 Steps!

### Step 1: Get Cookies (30 seconds)

1. Open https://gspcloud.atlassian.net in your browser
2. Press **F12** (Developer Tools)
3. Go to **Network** tab
4. Refresh the page
5. Click any request → **Headers** → find **Cookie** section
6. Copy these three values:
   - `JSESSIONID=...`
   - `atlassian.account.xsrf.token=...`
   - `tenant.session.token=...`

### Step 2: Run the Script

```bash
cd tools
./quick-fetch.sh
```

### Step 3: Paste Cookies

The script will ask for the three cookies - just paste them!

```
JSESSIONID: [paste here]
atlassian.account.xsrf.token: [paste here]
tenant.session.token: [paste here]
```

**That's it!** The script will:
- ✅ Save your cookies
- ✅ Download all sprint data
- ✅ Create master database file
- ✅ Never query the same sprint twice

---

## Alternative: Manual Cookie Update

If you prefer to update cookies separately:

```bash
cd tools
./update-cookies.sh
```

Then choose option 1 to fetch sprint data.

---

## What You Get

After running, you'll have:

**`jira-sprint-database.json`** - Master database with:
- All sprints from your team
- All issues per sprint (Stories, Bugs, Tasks, etc.)
- Complete changelog history
- All custom fields

**Size:** ~5-10 MB  
**Format:** JSON (human-readable)  
**Location:** `tools/jira-sprint-database.json`

---

## Next Time You Run

The script is smart:
- ✅ Skips sprints already in database
- ✅ Only fetches NEW sprints
- ✅ Reuses existing cookies if valid
- ✅ Updates incrementally

So you can run it weekly/monthly to get new sprints only!

---

## Troubleshooting

### "HTTP Error 410"
Your cookies expired. Just run `./quick-fetch.sh` again with fresh cookies.

### "No sprints found"
Check that you're logged into the correct Jira instance (gspcloud.atlassian.net).

### "Permission denied"
Run: `chmod +x tools/*.sh`

---

## Files Created

```
tools/
├── quick-fetch.sh              ← Run this! (easiest)
├── update-cookies.sh           ← Alternative cookie updater
├── run-sprint-fetcher.sh       ← Main fetcher (auto-called)
├── .jira-session               ← Your cookies (auto-created)
└── jira-sprint-database.json   ← Master database (auto-created)
```

---

## Pro Tips

💡 **Bookmark this workflow:**
```bash
cd tools && ./quick-fetch.sh
```

💡 **Check database status:**
```bash
jq '.totalSprints, .lastUpdated' tools/jira-sprint-database.json
```

💡 **List all sprints:**
```bash
jq '.sprints | keys' tools/jira-sprint-database.json
```

💡 **See sprint details:**
```bash
jq '.sprints["1234"]' tools/jira-sprint-database.json
```

---

## Need Help?

1. Read `SPRINT_DATABASE_README.md` for detailed docs
2. Check the script output for error messages
3. Make sure cookies are fresh (they expire after ~24 hours)

