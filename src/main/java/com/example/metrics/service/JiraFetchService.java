package com.example.metrics.service;

import com.example.metrics.service.datasource.SprintDatabaseDataSource;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

/**
 * Service for fetching sprint data directly from Jira using session credentials.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JiraFetchService {

    private static final String BASE_URL = "https://gspcloud.atlassian.net/rest/api/3/search/jql";
    private static final String SPRINT_API_URL = "https://gspcloud.atlassian.net/rest/agile/1.0/sprint/";
    private static final String TEAM_ID = "8cd48340-f038-4a23-8787-2489ff459cf0";
    private static final String PROJECT = "GPE Discovery Engineering CMS";
    private static final String DATABASE_FILE = "tools/jira-sprint-database.json";
    private static final int MAX_RESULTS = 100;

    private final ObjectMapper objectMapper;
    private final SprintDatabaseDataSource sprintDatabaseSource;

    /**
     * DTO for session credentials.
     * Jira Cloud uses atlassian.xsrf.token instead of JSESSIONID.
     */
    public record JiraCredentials(String xsrfToken, String accountXsrfToken, String tenantSessionToken) {
        public String toCookieHeader() {
            return "atlassian.xsrf.token=" + xsrfToken +
                   "; atlassian.account.xsrf.token=" + accountXsrfToken +
                   "; tenant.session.token=" + tenantSessionToken;
        }
    }

    /**
     * Update active sprints (delta update).
     * Finds active sprints and re-fetches their data.
     */
    public Map<String, Object> updateActiveSprints(JiraCredentials credentials) throws Exception {
        log.info("Starting delta update for active sprints");
        String cookieHeader = credentials.toCookieHeader();
        
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "deltaUpdate");
        result.put("startTime", LocalDateTime.now(ZoneId.systemDefault()).toString());

        // Load existing database
        ObjectNode masterDb = loadMasterDatabase();
        ObjectNode sprints = (ObjectNode) masterDb.path("sprints");
        
        // Find active sprints
        List<String> activeSprintIds = new ArrayList<>();
        Iterator<String> sprintIds = sprints.fieldNames();
        
        while (sprintIds.hasNext()) {
            String sprintId = sprintIds.next();
            try {
                String state = getSprintState(sprintId, cookieHeader);
                log.info("Sprint {} state: {}", sprintId, state);
                if ("active".equalsIgnoreCase(state)) {
                    activeSprintIds.add(sprintId);
                }
            } catch (Exception e) {
                log.warn("Could not check sprint {} state: {}", sprintId, e.getMessage());
            }
        }

        result.put("activeSprintsFound", activeSprintIds.size());
        result.put("activeSprintIds", activeSprintIds);

        if (activeSprintIds.isEmpty()) {
            result.put("message", "No active sprints found. All sprints are completed.");
            result.put("updated", 0);
            return result;
        }

        // Update each active sprint
        List<Map<String, Object>> updates = new ArrayList<>();
        for (String sprintId : activeSprintIds) {
            Map<String, Object> updateInfo = updateSprint(sprintId, cookieHeader, masterDb);
            updates.add(updateInfo);
        }

        // Save database
        masterDb.put("lastUpdated", LocalDateTime.now(ZoneId.systemDefault()).toString());
        saveMasterDatabase(masterDb);
        
        // Clear cache
        sprintDatabaseSource.clearCache();

        result.put("updates", updates);
        result.put("updated", updates.size());
        result.put("endTime", LocalDateTime.now(ZoneId.systemDefault()).toString());
        result.put("success", true);

        return result;
    }

    /**
     * Fetch new sprints that are not in the database.
     */
    public Map<String, Object> fetchNewSprints(JiraCredentials credentials) throws Exception {
        log.info("Starting full fetch for new sprints");
        String cookieHeader = credentials.toCookieHeader();
        
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operation", "fetchNewSprints");
        result.put("startTime", LocalDateTime.now(ZoneId.systemDefault()).toString());

        // Load existing database
        ObjectNode masterDb = loadMasterDatabase();
        ObjectNode sprints = (ObjectNode) masterDb.path("sprints");
        Set<String> existingSprintIds = new HashSet<>();
        sprints.fieldNames().forEachRemaining(existingSprintIds::add);

        // Discover all sprints from Jira
        Set<String> allSprintIds = discoverSprints(cookieHeader);
        result.put("totalSprintsInJira", allSprintIds.size());
        result.put("existingSprintsInDb", existingSprintIds.size());

        // Find new sprints
        Set<String> newSprintIds = new HashSet<>(allSprintIds);
        newSprintIds.removeAll(existingSprintIds);
        result.put("newSprintsToFetch", newSprintIds.size());

        if (newSprintIds.isEmpty()) {
            result.put("message", "All sprints already in database. Nothing to fetch.");
            result.put("fetched", 0);
            return result;
        }

        // Fetch new sprints
        List<Map<String, Object>> fetched = new ArrayList<>();
        for (String sprintId : newSprintIds) {
            Map<String, Object> fetchInfo = fetchAndSaveSprint(sprintId, cookieHeader, masterDb);
            fetched.add(fetchInfo);
        }

        // Save database
        masterDb.put("lastUpdated", LocalDateTime.now(ZoneId.systemDefault()).toString());
        masterDb.put("totalSprints", sprints.size());
        saveMasterDatabase(masterDb);
        
        // Clear cache
        sprintDatabaseSource.clearCache();

        result.put("fetched", fetched);
        result.put("totalFetched", fetched.size());
        result.put("endTime", LocalDateTime.now(ZoneId.systemDefault()).toString());
        result.put("success", true);

        return result;
    }

    // ========== Helper Methods ==========

    /**
     * Get sprint state from Jira Agile API.
     */
    private String getSprintState(String sprintId, String cookieHeader) throws Exception {
        String url = SPRINT_API_URL + sprintId;
        JsonNode response = makeRequest(url, cookieHeader);
        if (response != null && response.has("state")) {
            return response.get("state").asText();
        }
        return "unknown";
    }

    /**
     * Update a single sprint in the database.
     */
    private Map<String, Object> updateSprint(String sprintId, String cookieHeader, ObjectNode masterDb) throws Exception {
        ObjectNode sprints = (ObjectNode) masterDb.path("sprints");
        JsonNode oldSprint = sprints.get(sprintId);
        int oldIssueCount = oldSprint != null ? oldSprint.path("totalIssues").asInt(0) : 0;

        log.info("Updating sprint {}...", sprintId);
        ObjectNode sprintData = fetchSprintIssues(sprintId, cookieHeader);
        int newIssueCount = sprintData.path("totalIssues").asInt(0);

        sprints.set(sprintId, sprintData);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("sprintId", sprintId);
        info.put("oldIssueCount", oldIssueCount);
        info.put("newIssueCount", newIssueCount);
        info.put("delta", newIssueCount - oldIssueCount);
        return info;
    }

    /**
     * Fetch and save a new sprint to the database.
     */
    private Map<String, Object> fetchAndSaveSprint(String sprintId, String cookieHeader, ObjectNode masterDb) throws Exception {
        log.info("Fetching sprint {}...", sprintId);
        ObjectNode sprintData = fetchSprintIssues(sprintId, cookieHeader);
        int issueCount = sprintData.path("totalIssues").asInt(0);

        ObjectNode sprints = (ObjectNode) masterDb.path("sprints");
        sprints.set(sprintId, sprintData);

        Map<String, Object> info = new LinkedHashMap<>();
        info.put("sprintId", sprintId);
        info.put("issueCount", issueCount);
        return info;
    }

    /**
     * Discover all sprint IDs from team issues.
     */
    private Set<String> discoverSprints(String cookieHeader) throws Exception {
        Set<String> sprintIds = new HashSet<>();
        String jql = "project = \"" + PROJECT + "\" AND \"Team[Team]\" = " + TEAM_ID;
        String nextPageToken = null;
        boolean isLast = false;

        do {
            String url = BASE_URL + "?jql=" + URLEncoder.encode(jql, StandardCharsets.UTF_8) +
                        "&fields=customfield_10020" +
                        "&maxResults=" + MAX_RESULTS;

            if (nextPageToken != null) {
                url += "&nextPageToken=" + URLEncoder.encode(nextPageToken, StandardCharsets.UTF_8);
            }

            JsonNode response = makeRequest(url, cookieHeader);
            if (response == null) break;

            isLast = response.path("isLast").asBoolean(true);
            JsonNode issues = response.get("issues");

            if (issues != null && issues.isArray()) {
                for (JsonNode issue : issues) {
                    JsonNode sprintField = issue.path("fields").path("customfield_10020");
                    if (sprintField.isArray()) {
                        for (JsonNode sprint : sprintField) {
                            if (sprint.has("id")) {
                                sprintIds.add(String.valueOf(sprint.get("id").asInt()));
                            }
                        }
                    }
                }
            }

            JsonNode nextToken = response.get("nextPageToken");
            nextPageToken = (nextToken != null && !nextToken.isNull()) ? nextToken.asText() : null;

            log.info("Discovered {} unique sprints so far...", sprintIds.size());

        } while (!isLast && nextPageToken != null);

        return sprintIds;
    }

    /**
     * Fetch all issues for a sprint with changelog.
     */
    private ObjectNode fetchSprintIssues(String sprintId, String cookieHeader) throws Exception {
        ArrayNode allIssues = objectMapper.createArrayNode();
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
                for (JsonNode issue : issues) {
                    allIssues.add(issue);
                }
            }

            JsonNode nextToken = response.get("nextPageToken");
            nextPageToken = (nextToken != null && !nextToken.isNull()) ? nextToken.asText() : null;

            log.info("Fetched {} issues for sprint {}...", allIssues.size(), sprintId);

        } while (!isLast && nextPageToken != null);

        ObjectNode sprintData = objectMapper.createObjectNode();
        sprintData.put("sprintId", sprintId);
        sprintData.put("fetchedAt", LocalDateTime.now(ZoneId.systemDefault()).toString());
        sprintData.put("totalIssues", allIssues.size());
        sprintData.set("issues", allIssues);

        return sprintData;
    }

    /**
     * Make HTTP request to Jira API.
     */
    private JsonNode makeRequest(String url, String cookieHeader) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Cookie", cookieHeader);
        conn.setRequestProperty("Accept", "application/json");
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(60000);

        int status = conn.getResponseCode();
        if (status >= 400) {
            log.error("HTTP Error {} for URL: {}", status, url);
            throw new RuntimeException("HTTP Error " + status);
        }

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            return objectMapper.readTree(response.toString());
        }
    }

    /**
     * Load master database from file.
     */
    private ObjectNode loadMasterDatabase() throws Exception {
        File dbFile = new File(DATABASE_FILE);
        if (!dbFile.exists()) {
            log.info("Creating new master database...");
            ObjectNode newDb = objectMapper.createObjectNode();
            newDb.put("created", LocalDateTime.now(ZoneId.systemDefault()).toString());
            newDb.set("sprints", objectMapper.createObjectNode());
            newDb.put("totalSprints", 0);
            return newDb;
        }

        log.info("Loading existing master database...");
        return (ObjectNode) objectMapper.readTree(dbFile);
    }

    /**
     * Save master database to file.
     */
    private void saveMasterDatabase(ObjectNode masterDb) throws Exception {
        File dbFile = new File(DATABASE_FILE);
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(dbFile, masterDb);
        log.info("Master database saved to {}", DATABASE_FILE);
    }
}
