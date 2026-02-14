import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * Adds a specific completed sprint to the database.
 * Use this when a sprint ends to capture its final state.
 */
public class AddCompletedSprint {

    private static final String BASE_URL = "https://gspcloud.atlassian.net/rest/api/3/search/jql";
    private static final String SPRINT_API_URL = "https://gspcloud.atlassian.net/rest/agile/1.0/sprint/";
    private static final int MAX_RESULTS = 100;
    
    private static final String MASTER_DB_FILE = "jira-sprint-database.json";

    private static ObjectMapper mapper = new ObjectMapper();
    
    public static void main(String[] args) throws Exception {
        // Check if sprint ID was provided
        if (args.length == 0) {
            System.err.println("❌ ERROR: Sprint ID required!");
            System.err.println("");
            System.err.println("Usage: java AddCompletedSprint <sprintId>");
            System.err.println("Example: java AddCompletedSprint 82498");
            System.err.println("");
            System.err.println("To find sprint IDs, check Jira or run SprintDataFetcher to discover all sprints.");
            System.exit(1);
        }

        String sprintId = args[0];

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

        System.out.println("📥 Add Completed Sprint to Database");
        System.out.println("=".repeat(50));
        System.out.println("Sprint ID: " + sprintId);
        System.out.println("");

        // Load existing master database
        Map<String, Object> masterDb = loadMasterDatabase();
        Map<String, Object> sprintsData = (Map<String, Object>) masterDb.getOrDefault("sprints", new HashMap<String, Object>());

        System.out.println("📊 Current database status:");
        System.out.println("   Total sprints in database: " + sprintsData.size());

        // Check if sprint already exists
        if (sprintsData.containsKey(sprintId)) {
            System.out.println("");
            System.out.println("⚠️  Sprint " + sprintId + " already exists in database!");
            System.out.print("Do you want to update it with fresh data? (y/n): ");
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            String response = reader.readLine().trim().toLowerCase();
            
            if (!response.equals("y") && !response.equals("yes")) {
                System.out.println("❌ Cancelled. No changes made.");
                return;
            }
            System.out.println("✅ Proceeding with update...");
        }

        // Get sprint info
        System.out.println("");
        System.out.println("🔍 Fetching sprint information...");
        JsonNode sprintInfo = getSprintInfo(sprintId, cookieHeader);
        
        if (sprintInfo == null) {
            System.err.println("❌ Could not fetch sprint information!");
            System.exit(1);
        }

        String sprintName = sprintInfo.path("name").asText("Unknown");
        String sprintState = sprintInfo.path("state").asText("unknown");
        
        System.out.println("   Sprint Name: " + sprintName);
        System.out.println("   Sprint State: " + sprintState);

        if ("active".equalsIgnoreCase(sprintState)) {
            System.out.println("");
            System.out.println("⚠️  WARNING: This sprint is still ACTIVE!");
            System.out.println("   It's recommended to wait until the sprint is closed to get the final state.");
            System.out.print("Do you want to continue anyway? (y/n): ");
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            String response = reader.readLine().trim().toLowerCase();
            
            if (!response.equals("y") && !response.equals("yes")) {
                System.out.println("❌ Cancelled. Run this script again when the sprint is closed.");
                return;
            }
        }

        // Fetch sprint data
        System.out.println("");
        System.out.println("📦 Fetching complete sprint data...");
        Map<String, Object> sprintData = fetchSprintData(sprintId, cookieHeader);

        // Add sprint metadata
        sprintData.put("sprintName", sprintName);
        sprintData.put("sprintState", sprintState);

        // Add to database
        sprintsData.put(sprintId, sprintData);
        masterDb.put("sprints", sprintsData);
        masterDb.put("lastUpdated", LocalDateTime.now().toString());
        masterDb.put("totalSprints", sprintsData.size());

        // Save database
        saveMasterDatabase(masterDb);

        System.out.println("");
        System.out.println("=".repeat(50));
        System.out.println("🎉 Sprint added successfully!");
        System.out.println("   Sprint: " + sprintName + " (" + sprintId + ")");
        System.out.println("   Issues: " + sprintData.get("totalIssues"));
        System.out.println("   Total sprints in database: " + sprintsData.size());
        System.out.println("");
        System.out.println("📁 Database file: " + MASTER_DB_FILE);
    }

