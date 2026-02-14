package com.example.metrics.service.datasource;

import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.JiraDataLoaderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * File-based Jira data source that reads from exported JSON files.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FileBasedJiraDataSource implements JiraDataSource {
    
    private final JiraDataLoaderService dataLoaderService;
    private List<Issue> cachedIssues;
    
    @Override
    public List<Issue> fetchIssues(String jql) throws IOException {
        if (cachedIssues == null) {
            log.info("Loading issues from latest export file");
            String filePath = dataLoaderService.findLatestExportFile();
            cachedIssues = dataLoaderService.loadIssuesFromFile(filePath);
        }
        return cachedIssues;
    }
    
    @Override
    public List<Issue> fetchIssuesForSprint(String sprintId) throws IOException {
        List<Issue> allIssues = fetchIssues(null);
        
        // Filter issues by sprint
        // Sprint information is in the changelog or custom fields
        return allIssues.stream()
            .filter(issue -> isInSprint(issue, sprintId))
            .collect(Collectors.toList());
    }
    
    @Override
    public String getSourceName() {
        return "File-based Export";
    }
    
    @Override
    public boolean isAvailable() {
        try {
            dataLoaderService.findLatestExportFile();
            return true;
        } catch (IOException e) {
            log.debug("File-based data source not available: {}", e.getMessage());
            return false;
        }
    }
    
    /**
     * Check if an issue belongs to a sprint.
     * This checks the changelog for sprint field changes.
     */
    private boolean isInSprint(Issue issue, String sprintId) {
        if (issue.getChangelog() == null || issue.getChangelog().getHistories() == null) {
            return false;
        }
        
        // Check if sprint field was ever set to this sprint
        return issue.getChangelog().getHistories().stream()
            .flatMap(history -> history.getItems().stream())
            .anyMatch(item -> 
                "Sprint".equalsIgnoreCase(item.getField()) 
                && item.getToString() != null 
                && item.getToString().contains(sprintId)
            );
    }
    
    /**
     * Clear the cache to force reload on next fetch.
     */
    public void clearCache() {
        log.info("Clearing file-based data source cache");
        cachedIssues = null;
    }
}

