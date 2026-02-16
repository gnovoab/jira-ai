package com.example.metrics.service;

import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.datasource.SprintDatabaseDataSource;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for importing and merging Jira data into the sprint database.
 * Supports delta updates and full imports.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DataImportService {

    private static final String DATABASE_FILE = "tools/jira-sprint-database.json";
    
    private final ObjectMapper objectMapper;
    private final SprintDatabaseDataSource sprintDatabaseSource;

    /**
     * Get the current database status.
     */
    public Map<String, Object> getDatabaseStatus() throws IOException {
        File dbFile = new File(DATABASE_FILE);
        Map<String, Object> status = new LinkedHashMap<>();
        
        status.put("databaseFile", dbFile.getAbsolutePath());
        status.put("exists", dbFile.exists());
        
        if (dbFile.exists()) {
            JsonNode root = objectMapper.readTree(dbFile);
            status.put("created", root.path("created").asText());
            status.put("lastUpdated", root.path("lastUpdated").asText());
            status.put("totalSprints", root.path("totalSprints").asInt());
            
            // Count total issues
            JsonNode sprints = root.path("sprints");
            int totalIssues = 0;
            List<Map<String, Object>> sprintSummaries = new ArrayList<>();
            
            if (sprints.isObject()) {
                Iterator<Map.Entry<String, JsonNode>> fields = sprints.fields();
                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> entry = fields.next();
                    String sprintId = entry.getKey();
                    JsonNode sprintData = entry.getValue();
                    int issueCount = sprintData.path("issues").size();
                    totalIssues += issueCount;
                    
                    Map<String, Object> summary = new LinkedHashMap<>();
                    summary.put("sprintId", sprintId);
                    summary.put("issueCount", issueCount);
                    summary.put("fetchedAt", sprintData.path("fetchedAt").asText());
                    sprintSummaries.add(summary);
                }
            }
            
            status.put("totalIssues", totalIssues);
            status.put("sprints", sprintSummaries);
            status.put("fileSizeBytes", dbFile.length());
            status.put("fileSizeMB", String.format("%.2f", dbFile.length() / (1024.0 * 1024.0)));
        }
        
        return status;
    }

    /**
     * Import a new sprint into the database.
     */
    public Map<String, Object> importSprint(String sprintId, List<Issue> issues) throws IOException {
        log.info("Importing sprint {} with {} issues", sprintId, issues.size());
        
        File dbFile = new File(DATABASE_FILE);
        ObjectNode root;
        
        if (dbFile.exists()) {
            root = (ObjectNode) objectMapper.readTree(dbFile);
        } else {
            root = objectMapper.createObjectNode();
            root.put("created", LocalDateTime.now().toString());
            root.put("totalSprints", 0);
            root.putObject("sprints");
        }
        
        // Get or create sprints object
        ObjectNode sprints = (ObjectNode) root.path("sprints");
        if (sprints.isMissingNode()) {
            sprints = root.putObject("sprints");
        }
        
        // Check if sprint already exists
        boolean isUpdate = sprints.has(sprintId);
        int oldIssueCount = 0;
        if (isUpdate) {
            oldIssueCount = sprints.path(sprintId).path("issues").size();
        }
        
        // Create sprint data
        ObjectNode sprintData = objectMapper.createObjectNode();
        sprintData.put("sprintId", sprintId);
        sprintData.put("totalIssues", issues.size());
        sprintData.put("fetchedAt", LocalDateTime.now().toString());
        sprintData.set("issues", objectMapper.valueToTree(issues));
        
        // Add/update sprint
        sprints.set(sprintId, sprintData);
        
        // Update metadata
        root.put("lastUpdated", LocalDateTime.now().toString());
        root.put("totalSprints", sprints.size());
        
        // Save
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(dbFile, root);
        
        // Clear cache to reload
        sprintDatabaseSource.clearCache();
        
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("sprintId", sprintId);
        result.put("action", isUpdate ? "updated" : "created");
        result.put("issueCount", issues.size());
        if (isUpdate) {
            result.put("previousIssueCount", oldIssueCount);
            result.put("delta", issues.size() - oldIssueCount);
        }
        
        log.info("Sprint {} {} successfully with {} issues", 
                sprintId, isUpdate ? "updated" : "created", issues.size());
        
        return result;
    }

    /**
     * Refresh the in-memory cache from the database file.
     */
    public Map<String, Object> refreshCache() {
        log.info("Refreshing sprint database cache");
        sprintDatabaseSource.clearCache();
        
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Cache cleared. Data will be reloaded on next request.");
        result.put("timestamp", LocalDateTime.now().toString());
        
        return result;
    }
}

