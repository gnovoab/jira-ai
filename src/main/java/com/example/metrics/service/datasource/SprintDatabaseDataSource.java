package com.example.metrics.service.datasource;

import com.example.metrics.model.jira.Issue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Sprint master database data source that reads from jira-sprint-database.json.
 * This is the preferred data source as it contains complete sprint data with full changelog.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class SprintDatabaseDataSource implements JiraDataSource {
    
    private static final String DATABASE_FILE = "tools/jira-sprint-database.json";
    
    private final ObjectMapper objectMapper;
    private Map<String, List<Issue>> sprintCache;
    private boolean loaded = false;
    
    @Override
    public List<Issue> fetchIssues(String jql) throws IOException {
        loadDatabaseIfNeeded();
        
        // Return all issues from all sprints
        return sprintCache.values().stream()
                .flatMap(List::stream)
                .distinct()
                .collect(Collectors.toList());
    }
    
    @Override
    public List<Issue> fetchIssuesForSprint(String sprintId) throws IOException {
        loadDatabaseIfNeeded();
        
        List<Issue> issues = sprintCache.get(sprintId);
        if (issues == null) {
            log.warn("Sprint {} not found in database. Available sprints: {}", 
                    sprintId, sprintCache.keySet());
            return new ArrayList<>();
        }
        
        log.info("Loaded {} issues for sprint {} from master database", issues.size(), sprintId);
        return issues;
    }
    
    @Override
    public String getSourceName() {
        return "Sprint Master Database";
    }
    
    @Override
    public boolean isAvailable() {
        File dbFile = new File(DATABASE_FILE);
        boolean exists = dbFile.exists() && dbFile.isFile();
        if (exists) {
            log.debug("Sprint master database found at: {}", dbFile.getAbsolutePath());
        } else {
            log.debug("Sprint master database not found at: {}", DATABASE_FILE);
        }
        return exists;
    }
    
    /**
     * Load the master database if not already loaded.
     */
    private void loadDatabaseIfNeeded() throws IOException {
        if (loaded) {
            return;
        }
        
        log.info("Loading sprint master database from: {}", DATABASE_FILE);
        
        File dbFile = new File(DATABASE_FILE);
        if (!dbFile.exists()) {
            throw new IOException("Sprint master database not found: " + DATABASE_FILE);
        }
        
        JsonNode root = objectMapper.readTree(dbFile);
        
        // Extract metadata
        String created = root.path("created").asText();
        String lastUpdated = root.path("lastUpdated").asText();
        int totalSprints = root.path("totalSprints").asInt();
        
        log.info("Database metadata - Created: {}, Last Updated: {}, Total Sprints: {}", 
                created, lastUpdated, totalSprints);
        
        // Load all sprints
        sprintCache = new HashMap<>();
        JsonNode sprintsNode = root.path("sprints");
        
        if (sprintsNode.isObject()) {
            sprintsNode.fields().forEachRemaining(entry -> {
                String sprintId = entry.getKey();
                JsonNode sprintData = entry.getValue();
                
                try {
                    List<Issue> issues = parseSprintIssues(sprintData);
                    sprintCache.put(sprintId, issues);
                    log.debug("Loaded {} issues for sprint {}", issues.size(), sprintId);
                } catch (Exception e) {
                    log.error("Failed to parse sprint {}: {}", sprintId, e.getMessage(), e);
                }
            });
        }
        
        int totalIssues = sprintCache.values().stream()
                .mapToInt(List::size)
                .sum();
        
        log.info("Successfully loaded {} sprints with {} total issues from master database", 
                sprintCache.size(), totalIssues);
        
        loaded = true;
    }
    
    /**
     * Parse issues from a sprint data node.
     */
    private List<Issue> parseSprintIssues(JsonNode sprintData) {
        List<Issue> issues = new ArrayList<>();
        JsonNode issuesNode = sprintData.path("issues");
        
        if (issuesNode.isArray()) {
            for (JsonNode issueNode : issuesNode) {
                try {
                    Issue issue = objectMapper.treeToValue(issueNode, Issue.class);
                    issues.add(issue);
                } catch (Exception e) {
                    log.warn("Failed to parse issue: {}", issueNode.path("key").asText(), e);
                }
            }
        }
        
        return issues;
    }
    
    /**
     * Clear the cache to force reload on next fetch.
     */
    public void clearCache() {
        log.info("Clearing sprint database cache");
        sprintCache = null;
        loaded = false;
    }
}

