import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Fetches all issues for each sprint and stores them incrementally.
 * Uses /rest/api/3/search endpoint which supports proper pagination.
 */
public class SprintDataFetcher {

    private static final String BASE_URL = "https://gspcloud.atlassian.net/rest/api/3/search/jql";
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

        System.out.println("🚀 Sprint Data Fetcher - Master Database Mode");
        System.out.println("=".repeat(50));

        // Load existing master database
        Map<String, Object> masterDb = loadMasterDatabase();
        Map<String, Object> sprintsData = (Map<String, Object>) masterDb.getOrDefault("sprints", new HashMap<String, Object>());

        System.out.println("📊 Current database status:");
        System.out.println("   Sprints already cached: " + sprintsData.size());

        // Step 1: Discover all sprints
        System.out.println("\n📋 Step 1: Discovering all sprints...");
        Set<String> allSprintIds = discoverSprints(cookieHeader);
        System.out.println("✅ Found " + allSprintIds.size() + " total sprints in Jira");

        // Step 2: Determine which sprints need fetching
        Set<String> sprintsToFetch = new HashSet<>();
        for (String sprintId : allSprintIds) {
            if (!sprintsData.containsKey(sprintId)) {
                sprintsToFetch.add(sprintId);
            }
        }

        System.out.println("📥 Sprints to fetch: " + sprintsToFetch.size());
        System.out.println("⏭️  Sprints already cached: " + (allSprintIds.size() - sprintsToFetch.size()));

        if (sprintsToFetch.isEmpty()) {
            System.out.println("\n✅ All sprints already in database! Nothing to fetch.");
            System.out.println("📁 Database file: " + MASTER_DB_FILE);
            return;
        }

        // Step 3: Fetch missing sprints
        System.out.println("\n📥 Step 2: Fetching missing sprint data...");
        int completed = 0;

        for (String sprintId : sprintsToFetch) {
            System.out.println("\n📦 Fetching sprint " + sprintId + "...");
            Map<String, Object> sprintData = fetchSprintData(sprintId, cookieHeader);

            // Add to master database
            sprintsData.put(sprintId, sprintData);
            masterDb.put("sprints", sprintsData);
            masterDb.put("lastUpdated", LocalDateTime.now().toString());
            masterDb.put("totalSprints", sprintsData.size());

            // Save after each sprint (incremental save)
            saveMasterDatabase(masterDb);
            completed++;

            System.out.println("✅ Sprint " + sprintId + " saved to master database");
        }

        System.out.println("\n" + "=".repeat(50));
        System.out.println("🎉 All done!");
        System.out.println("   Newly fetched: " + completed);
        System.out.println("   Total in database: " + sprintsData.size());
        System.out.println("\n📁 Master database: " + MASTER_DB_FILE);
    }
    
    private static Set<String> discoverSprints(String cookieHeader) throws Exception {
        Set<String> sprintIds = new HashSet<>();
        
        // Query for all issues in the team (with pagination using nextPageToken)
        String jql = "project = \"" + PROJECT + "\" AND \"Team[Team]\" = " + TEAM_ID;
        String nextPageToken = null;
        int issueCount = 0;
        boolean isLast = false;

        do {
            String url = BASE_URL + "?jql=" + URLEncoder.encode(jql, StandardCharsets.UTF_8) +
                        "&fields=customfield_10020" +  // Only fetch sprint field
                        "&maxResults=" + MAX_RESULTS;

            if (nextPageToken != null) {
                url += "&nextPageToken=" + URLEncoder.encode(nextPageToken, StandardCharsets.UTF_8);
            }

            JsonNode response = makeRequest(url, cookieHeader);

            if (response == null) break;

            isLast = response.path("isLast").asBoolean(true);
            JsonNode issues = response.get("issues");

            if (issues != null && issues.isArray()) {
                // Extract sprint IDs from each issue
                for (JsonNode issue : issues) {
                    issueCount++;
                    JsonNode sprintField = issue.path("fields").path("customfield_10020");
                    if (sprintField.isArray()) {
                        for (JsonNode sprint : sprintField) {
                            if (sprint.has("id")) {
                                sprintIds.add(sprint.get("id").asText());
                            }
                        }
                    }
                }
            }

            // Get next page token
            JsonNode nextToken = response.get("nextPageToken");
            nextPageToken = (nextToken != null && !nextToken.isNull()) ? nextToken.asText() : null;

            System.out.println("   Scanned " + issueCount + " issues, found " + sprintIds.size() + " unique sprints...");

        } while (!isLast && nextPageToken != null);
        
        return sprintIds;
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
            JsonNode issues = response.get("issues");

            if (issues != null && issues.isArray()) {
                // Add issues to our list
                for (JsonNode issue : issues) {
                    allIssues.add(issue);
                }
            }

            // Get next page token
            JsonNode nextToken = response.get("nextPageToken");
            nextPageToken = (nextToken != null && !nextToken.isNull()) ? nextToken.asText() : null;

            System.out.println("   Fetched " + allIssues.size() + " issues...");

        } while (!isLast && nextPageToken != null);

        // Build sprint data object
        Map<String, Object> sprintData = new HashMap<>();
        sprintData.put("sprintId", sprintId);
        sprintData.put("fetchedAt", LocalDateTime.now().toString());
        sprintData.put("totalIssues", allIssues.size());
        sprintData.put("issues", allIssues);

        System.out.println("   ✅ Fetched " + allIssues.size() + " issues for sprint " + sprintId);
        return sprintData;
    }

    private static JsonNode makeRequest(String url, String cookieHeader) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Cookie", cookieHeader);
        conn.setRequestProperty("Accept", "application/json");

        int status = conn.getResponseCode();
        if (status >= 400) {
            System.err.println("❌ HTTP Error " + status);
            return null;
        }

        // Read response
        BufferedReader reader = new BufferedReader(
            new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8));
        StringBuilder response = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            response.append(line);
        }
        reader.close();

        return mapper.readTree(response.toString());
    }

    private static Map<String, Object> loadMasterDatabase() {
        File dbFile = new File(MASTER_DB_FILE);
        if (!dbFile.exists()) {
            System.out.println("📝 Creating new master database...");
            Map<String, Object> newDb = new HashMap<>();
            newDb.put("created", LocalDateTime.now().toString());
            newDb.put("sprints", new HashMap<String, Object>());
            newDb.put("totalSprints", 0);
            return newDb;
        }

        try {
            System.out.println("📂 Loading existing master database...");
            return mapper.readValue(dbFile,
                mapper.getTypeFactory().constructMapType(HashMap.class, String.class, Object.class));
        } catch (Exception e) {
            System.err.println("⚠️ Could not load master database: " + e.getMessage());
            System.err.println("   Creating new database...");
            Map<String, Object> newDb = new HashMap<>();
            newDb.put("created", LocalDateTime.now().toString());
            newDb.put("sprints", new HashMap<String, Object>());
            newDb.put("totalSprints", 0);
            return newDb;
        }
    }

    private static void saveMasterDatabase(Map<String, Object> masterDb) {
        try {
            mapper.writerWithDefaultPrettyPrinter().writeValue(new File(MASTER_DB_FILE), masterDb);
            System.out.println("   💾 Master database updated");
        } catch (Exception e) {
            System.err.println("⚠️ Could not save master database: " + e.getMessage());
        }
    }
}

