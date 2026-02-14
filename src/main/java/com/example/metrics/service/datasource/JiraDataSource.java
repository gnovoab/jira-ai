package com.example.metrics.service.datasource;

import com.example.metrics.model.jira.Issue;

import java.io.IOException;
import java.util.List;

/**
 * Interface for fetching Jira data from different sources.
 * Implementations can use file-based exports or API tokens.
 */
public interface JiraDataSource {
    
    /**
     * Fetch all issues matching the given criteria.
     *
     * @param jql JQL query string (optional, can be null for file-based sources)
     * @return List of issues
     * @throws IOException if data cannot be fetched
     */
    List<Issue> fetchIssues(String jql) throws IOException;
    
    /**
     * Fetch issues for a specific sprint.
     *
     * @param sprintId Sprint identifier
     * @return List of issues in the sprint
     * @throws IOException if data cannot be fetched
     */
    List<Issue> fetchIssuesForSprint(String sprintId) throws IOException;
    
    /**
     * Get the name of this data source for logging/debugging.
     *
     * @return Data source name
     */
    String getSourceName();
    
    /**
     * Check if this data source is available/configured.
     *
     * @return true if the data source can be used
     */
    boolean isAvailable();
}

