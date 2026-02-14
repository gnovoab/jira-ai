import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Updates the current/active sprint with delta changes.
 * Only re-fetches active sprints to avoid pulling all data again.
 */
public class UpdateCurrentSprint {

    private static final String BASE_URL = "https://gspcloud.atlassian.net/rest/api/3/search/jql";
    private static final String SPRINT_API_URL = "https://gspcloud.atlassian.net/rest/agile/1.0/sprint/";
    private static final String TEAM_ID = "8cd48340-f038-4a23-8787-2489ff459cf0";
    private static final String PROJECT = "GPE Discovery Engineering CMS";
    private static final int MAX_RESULTS = 100;
    
    private static final String MASTER_DB_FILE = "jira-sprint-database.json";

    private static ObjectMapper mapper = new ObjectMapper();
    
    public static void main(String[] args) throws Exception {
        // Read session credentials
        String jsessionId = System.getenv("JIRA_JSESSIONID");
        String accountXsrfToken = System.getenv("JIRA_ACCOUNT_XSRF_TOKEN");
        String tenantSessionToken = System.getenv("JIRA_TENANT_SESSION_TOKEN");

        if (jsessionId == null || accountXsrfToken == null || tenantSessionToken == null) {
            System.err.println("❌ ERROR: Missing session credentials!");
            System.err.println("Please run: source tools/.jira-session");
            System.exit(1);
        }

        String cookieHeader = "JSESSIONID=" + jsessionId +
                              "; atlassian.account.xsrf.token=" + accountXsrfToken +
                              "; tenant.session.token=" + tenantSessionToken;

        System.out.println("🔄 Sprint Delta Updater - Updating Active Sprints");
        System.out.println("=".repeat(50));

        // Load existing master database
        Map<String, Object> masterDb = loadMasterDatabase();
        Map<String, Object> sprintsData = (Map<String, Object>) masterDb.getOrDefault("sprints", new HashMap<String, Object>());

        System.out.println("📊 Current database status:");
        System.out.println("   Total sprints in database: " + sprintsData.size());

        // Step 1: Find active sprints
        System.out.println("\n🔍 Step 1: Finding active sprints...");
        Set<String> activeSprintIds = findActiveSprints(sprintsData.keySet(), cookieHeader);
        
        if (activeSprintIds.isEmpty()) {
            System.out.println("✅ No active sprints found. All sprints are completed!");
            return;
        }

        System.out.println("✅ Found " + activeSprintIds.size() + " active sprint(s): " + activeSprintIds);

        // Step 2: Re-fetch active sprints
        System.out.println("\n🔄 Step 2: Updating active sprint data...");
        int updated = 0;

        for (String sprintId : activeSprintIds) {
            System.out.println("\n📦 Updating sprint " + sprintId + "...");
            
            // Fetch fresh data
            Map<String, Object> freshSprintData = fetchSprintData(sprintId, cookieHeader);
            
            // Compare with existing
            Map<String, Object> oldSprintData = (Map<String, Object>) sprintsData.get(sprintId);
            int oldIssueCount = oldSprintData != null ? (int) oldSprintData.getOrDefault("totalIssues", 0) : 0;
            int newIssueCount = (int) freshSprintData.get("totalIssues");
            
            System.out.println("   Old issue count: " + oldIssueCount);
            System.out.println("   New issue count: " + newIssueCount);
            System.out.println("   Delta: " + (newIssueCount - oldIssueCount));
            
            // Update in database
            sprintsData.put(sprintId, freshSprintData);
            updated++;
        }

        // Step 3: Save updated database
        masterDb.put("sprints", sprintsData);
        masterDb.put("lastUpdated", LocalDateTime.now().toString());
        saveMasterDatabase(masterDb);

        System.out.println("\n" + "=".repeat(50));
        System.out.println("🎉 Update complete!");
        System.out.println("   Sprints updated: " + updated);
        System.out.println("\n📁 Master database: " + MASTER_DB_FILE);
    }
    
    /**
     * Find active sprints by checking sprint state via API
     */
    private static Set<String> findActiveSprints(Set<String> sprintIds, String cookieHeader) throws Exception {
        Set<String> activeSprints = new HashSet<>();
        
        for (String sprintId : sprintIds) {
            try {
                String url = SPRINT_API_URL + sprintId;
                JsonNode sprintInfo = makeRequest(url, cookieHeader);
                
                if (sprintInfo != null && sprintInfo.has("state")) {
                    String state = sprintInfo.get("state").asText();
                    System.out.println("   Sprint " + sprintId + ": " + state);
                    
                    if ("active".equalsIgnoreCase(state)) {
                        activeSprints.add(sprintId);
                    }
                }
            } catch (Exception e) {
                System.err.println("   ⚠️  Could not check sprint " + sprintId + ": " + e.getMessage());
            }
        }
        
        return activeSprints;
    }
    
    private static Map<String, Object> fetchSprintData(String sprintId, String cookieHeader) throws Exception {
        List<JsonNode> allIssues = new ArrayList<>();

        String jql = "Sprint = " + sprintId;
        String nextPageToken = null;
        boolean isLast = false;

        do {
            String url = BASE_URL + "?jql=" + URLEncoder.encode(jql, StandardCharsets.UTF_8) +
                        "&expand=changelog" +
                        "&fields=*all" +
                        "&maxResults=" + MAX_RESULTS;

            if (nextPageToken != null) {
                url += "&nextPageToken=" + URLEncoder.encode(nextPageToken, StandardCharsets.UTF_8);
            }

            JsonNode response = makeRequest(url, cookieHeader);

            if (response == null) break;

            isLast = response.path("isLast").asBoolean(true);

