import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class JiraHistoryExporter {

    private static final String BASE_URL =
            "https://gspcloud.atlassian.net/rest/api/3/search/jql";

    // Your JQL - using literal brackets as they work in browser
    // Note: Jira accepts literal [ ] in the Team[Team] field name
    private static final String JQL =
            "project%20=%20%22GPE%20Discovery%20Engineering%20CMS%22%20AND%20%22Team[Team]%22%20=%208cd48340-f038-4a23-8787-2489ff459cf0%20AND%20updated%20%3E=%20%222025-08-01%22";

    // Output file with timestamp
    private static final String OUTPUT_FILE = "jira-export-" +
            LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd-HHmmss")) + ".json";

    public static void main(String[] args) throws Exception {
        // Read session credentials from environment variables
        String jsessionId = System.getenv("JIRA_JSESSIONID");
        String accountXsrfToken = System.getenv("JIRA_ACCOUNT_XSRF_TOKEN");
        String tenantSessionToken = System.getenv("JIRA_TENANT_SESSION_TOKEN");

        if (jsessionId == null || accountXsrfToken == null || tenantSessionToken == null) {
            System.err.println("ERROR: Missing session credentials!");
            System.err.println("Please set environment variables:");
            System.err.println("  export JIRA_JSESSIONID='your-session-id'");
            System.err.println("  export JIRA_ACCOUNT_XSRF_TOKEN='your-account-xsrf-token'");
            System.err.println("  export JIRA_TENANT_SESSION_TOKEN='your-tenant-session-token'");
            System.err.println();
            System.err.println("To get these values:");
            System.err.println("  1. Open https://gspcloud.atlassian.net in your browser");
            System.err.println("  2. Open DevTools (F12) → Application → Cookies");
            System.err.println("  3. Copy these cookie values:");
            System.err.println("     - JSESSIONID");
            System.err.println("     - atlassian.account.xsrf.token");
            System.err.println("     - tenant.session.token");
            System.exit(1);
        }

        String cookieHeader = "JSESSIONID=" + jsessionId +
                              "; atlassian.account.xsrf.token=" + accountXsrfToken +
                              "; tenant.session.token=" + tenantSessionToken;

        System.out.println("📊 Starting Jira export...");
        System.out.println("📁 Output file: " + OUTPUT_FILE);
        System.out.println();

        List<String> allIssues = new ArrayList<>();
        int startAt = 0;
        int page = 0;
        int totalIssues = 0;
        int maxResults = 50;

        do {
            page++;
            String url = BASE_URL + "?jql=" + JQL + "&expand=changelog&fields=*all&maxResults=" + maxResults + "&startAt=" + startAt;

            System.out.println("📥 Fetching page " + page + "...");
            System.out.println("   URL: " + url);
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("GET");

            // Add authentication cookies
            conn.setRequestProperty("Cookie", cookieHeader);
            conn.setRequestProperty("Accept", "application/json");

            int status = conn.getResponseCode();
            if (status >= 400) {
                System.err.println("❌ HTTP Error " + status);
                InputStream errorStream = conn.getErrorStream();
                if (errorStream != null) {
                    BufferedReader errorReader = new BufferedReader(new InputStreamReader(errorStream));
                    String errorLine;
                    while ((errorLine = errorReader.readLine()) != null) {
                        System.err.println(errorLine);
                    }
                    errorReader.close();
                }
                System.exit(1);
            }

            InputStream is = conn.getInputStream();
            BufferedReader in = new BufferedReader(new InputStreamReader(is));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) {
                response.append(line);
            }
            in.close();

            String json = response.toString();

            // Debug: Show first and last chars of response
            System.out.println("   📄 Response length: " + json.length() + " chars");
            if (json.length() > 500) {
                System.out.println("   📄 Response preview (first 300): " + json.substring(0, 300) + "...");
                System.out.println("   📄 Response preview (last 300): ..." + json.substring(json.length() - 300));
            } else {
                System.out.println("   📄 Response: " + json);
            }

            // Debug: Save first response to file for inspection
            if (page == 1) {
                try (FileWriter debugWriter = new FileWriter("debug-response.json")) {
                    debugWriter.write(json);
                    System.out.println("   💾 Debug: Saved response to debug-response.json");
                } catch (Exception e) {
                    System.err.println("   ⚠️ Could not save debug response: " + e.getMessage());
                }
            }

            // Extract issues array from this page
            String issuesJson = extractIssuesArray(json);
            System.out.println("   🔍 Debug: issuesJson is " + (issuesJson == null ? "null" : issuesJson.length() + " chars"));
            int issuesOnPage = 0;
            if (issuesJson != null && !issuesJson.equals("[]")) {
                // Count issues on this page
                issuesOnPage = countIssues(issuesJson);

                // Check for duplicate pages (API returning same data)
                if (page > 1 && json.length() == Integer.getInteger("jira.last.response.length", 0)) {
                    System.out.println("   ⚠️ Warning: Response length unchanged (" + json.length() + " chars) - API may be returning duplicate data");
                    System.out.println("   🛑 Stopping pagination to avoid duplicates");
                    break;
                }
                System.setProperty("jira.last.response.length", String.valueOf(json.length()));

                // Remove the outer brackets and add to our list
                String issuesContent = issuesJson.substring(1, issuesJson.length() - 1);
                if (!issuesContent.trim().isEmpty()) {
                    allIssues.add(issuesContent);
                    totalIssues += issuesOnPage;
                    System.out.println("   ✅ Got " + issuesOnPage + " issues (total: " + totalIssues + ")");
                } else {
                    System.out.println("   ⚠️ Debug: issuesContent is empty");
                }
            } else {
                System.out.println("   ⚠️ Debug: issuesJson is null or empty array");
            }

            // Check if there are more pages
            // Jira API v3 uses "isLast" field instead of "total"
            // The structure is: {"issues":[...], "nextPageToken":"...", "isLast":false}
            boolean isLast = true; // Default to true (assume last page)

            String isLastPattern = "\"isLast\":";
            int isLastIdx = json.indexOf(isLastPattern);
            if (isLastIdx >= 0) {
                int valueStart = isLastIdx + isLastPattern.length();
                String valueStr = json.substring(valueStart, Math.min(valueStart + 10, json.length())).trim();
                isLast = valueStr.startsWith("true");
                System.out.println("   📊 Debug: isLast=" + isLast);
            } else {
                System.out.println("   ⚠️ Debug: isLast field not found, assuming last page");
            }

            startAt += issuesOnPage;
            System.out.println("   📍 Debug: startAt=" + startAt + ", issuesOnPage=" + issuesOnPage + ", isLast=" + isLast);

            if (isLast || issuesOnPage == 0) {
                System.out.println("   🛑 Debug: Breaking loop (isLast=" + isLast + " or issuesOnPage=" + issuesOnPage + " == 0)");
                break;
            }

        } while (true);

        // Write consolidated file
        System.out.println();
        System.out.println("💾 Writing consolidated file...");

        try (FileWriter fw = new FileWriter(OUTPUT_FILE)) {
            fw.write("{\n");
            fw.write("  \"exportDate\": \"" + LocalDateTime.now() + "\",\n");
            fw.write("  \"totalIssues\": " + totalIssues + ",\n");
            fw.write("  \"jql\": \"" + JQL.replace("%20", " ").replace("%22", "\\\"") + "\",\n");
            fw.write("  \"issues\": [\n");

            for (int i = 0; i < allIssues.size(); i++) {
                fw.write("    " + allIssues.get(i));
                if (i < allIssues.size() - 1) {
                    fw.write(",");
                }
                fw.write("\n");
            }

            fw.write("  ]\n");
            fw.write("}\n");
        }

        System.out.println("✅ Export complete!");
        System.out.println("📁 File: " + new File(OUTPUT_FILE).getAbsolutePath());
        System.out.println("📊 Total issues: " + totalIssues);
    }

    // Simple JSON value extractor (works for simple strings)
    private static String parseJsonValue(String json, String key) {
        String pattern = "\"" + key + "\":";
        int idx = json.indexOf(pattern);
        if (idx < 0) return null;

        int start = json.indexOf("\"", idx + pattern.length());
        if (start < 0) return null;

        int end = json.indexOf("\"", start + 1);
        if (end < 0) return null;

        return json.substring(start + 1, end);
    }

    // Extract the issues array from a Jira API response
    private static String extractIssuesArray(String json) {
        String pattern = "\"issues\":";
        int idx = json.indexOf(pattern);
        if (idx < 0) {
            System.err.println("   ❌ Debug: Could not find 'issues' field in JSON");
            return null;
        }

        // Find the opening bracket
        int start = json.indexOf("[", idx);
        if (start < 0) {
            System.err.println("   ❌ Debug: Could not find '[' after 'issues' field");
            return null;
        }

        // Find the matching closing bracket - need to handle strings properly
        int bracketCount = 1;
        int pos = start + 1;
        boolean inString = false;
        boolean escaped = false;

        while (pos < json.length() && bracketCount > 0) {
            char c = json.charAt(pos);

            if (escaped) {
                escaped = false;
            } else if (c == '\\') {
                escaped = true;
            } else if (c == '"') {
                inString = !inString;
            } else if (!inString) {
                if (c == '[') bracketCount++;
                else if (c == ']') bracketCount--;
            }
            pos++;
        }

        if (bracketCount != 0) {
            System.err.println("   ❌ Debug: Unmatched brackets in issues array (bracketCount=" + bracketCount + ", pos=" + pos + ", length=" + json.length() + ")");
            return null;
        }

        System.out.println("   ✅ Debug: Extracted issues array from position " + start + " to " + pos + " (" + (pos - start) + " chars)");
        return json.substring(start, pos);
    }

    // Count issues in a JSON array
    private static int countIssues(String issuesJson) {
        if (issuesJson == null || issuesJson.equals("[]")) return 0;

        // Count occurrences of "\"expand\":" which appears once at the start of each issue object
        // This is more reliable than "key" which appears in many nested objects
        int count = 0;
        int idx = 0;
        String pattern = "\"expand\":";
        while ((idx = issuesJson.indexOf(pattern, idx)) >= 0) {
            count++;
            idx += pattern.length();
        }
        return count;
    }
}