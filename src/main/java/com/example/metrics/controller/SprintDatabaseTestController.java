package com.example.metrics.controller;

import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.datasource.SprintDatabaseDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Test controller to verify Sprint Master Database loading.
 */
@Slf4j
@RestController
@RequestMapping("/api/test/sprint-database")
@RequiredArgsConstructor
public class SprintDatabaseTestController {
    
    private final SprintDatabaseDataSource sprintDatabaseSource;
    
    /**
     * Check if sprint database is available.
     */
    @GetMapping("/status")
    public Map<String, Object> getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("available", sprintDatabaseSource.isAvailable());
        status.put("sourceName", sprintDatabaseSource.getSourceName());
        return status;
    }
    
    /**
     * Get all issues from the database.
     */
    @GetMapping("/issues")
    public Map<String, Object> getAllIssues() {
        try {
            List<Issue> issues = sprintDatabaseSource.fetchIssues(null);
            
            Map<String, Object> response = new HashMap<>();
            response.put("totalIssues", issues.size());
            response.put("sampleIssueKeys", issues.stream()
                    .limit(10)
                    .map(Issue::getKey)
                    .toList());
            
            return response;
        } catch (IOException e) {
            log.error("Failed to load issues", e);
            return Map.of("error", e.getMessage());
        }
    }
    
    /**
     * Get issues for a specific sprint.
     */
    @GetMapping("/sprint/{sprintId}")
    public Map<String, Object> getSprintIssues(@PathVariable String sprintId) {
        try {
            List<Issue> issues = sprintDatabaseSource.fetchIssuesForSprint(sprintId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("sprintId", sprintId);
            response.put("totalIssues", issues.size());
            response.put("issueKeys", issues.stream()
                    .map(Issue::getKey)
                    .toList());
            
            return response;
        } catch (IOException e) {
            log.error("Failed to load sprint issues", e);
            return Map.of("error", e.getMessage());
        }
    }
    
    /**
     * Clear the cache and reload.
     */
    @PostMapping("/reload")
    public Map<String, String> reload() {
        sprintDatabaseSource.clearCache();
        return Map.of("status", "Cache cleared. Data will be reloaded on next request.");
    }
}

