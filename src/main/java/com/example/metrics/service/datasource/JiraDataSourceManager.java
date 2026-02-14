package com.example.metrics.service.datasource;

import com.example.metrics.model.jira.Issue;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

/**
 * Manager that automatically selects the best available Jira data source.
 * File-based approach using browser session authentication.
 * Priority order:
 * 1. Sprint Master Database (preferred - complete data with full changelog)
 * 2. File-based exports (fallback)
 */
@Slf4j
@Service
public class JiraDataSourceManager {

    private final SprintDatabaseDataSource sprintDatabaseSource;
    private final FileBasedJiraDataSource fileBasedSource;

    public JiraDataSourceManager(
            SprintDatabaseDataSource sprintDatabaseSource,
            FileBasedJiraDataSource fileBasedSource) {
        this.sprintDatabaseSource = sprintDatabaseSource;
        this.fileBasedSource = fileBasedSource;
        logAvailableSources();
    }

    public JiraDataSource getActiveSource() {
        // Priority 1: Sprint Master Database (preferred)
        if (sprintDatabaseSource.isAvailable()) {
            log.info("Using Sprint Master Database as data source");
            return sprintDatabaseSource;
        }
        // Priority 2: File-based exports (fallback)
        if (fileBasedSource.isAvailable()) {
            log.info("Using file-based exports as data source");
            return fileBasedSource;
        }
        throw new IllegalStateException("No Jira data source available");
    }

    public List<Issue> fetchIssues(String jql) throws IOException {
        return getActiveSource().fetchIssues(jql);
    }

    public List<Issue> fetchIssuesForSprint(String sprintId) throws IOException {
        return getActiveSource().fetchIssuesForSprint(sprintId);
    }

    private void logAvailableSources() {
        log.info("Data sources available - Sprint Database: {}, File-based: {}",
            sprintDatabaseSource.isAvailable(),
            fileBasedSource.isAvailable());
    }

    public void clearCache() {
        sprintDatabaseSource.clearCache();
        fileBasedSource.clearCache();
    }
}

