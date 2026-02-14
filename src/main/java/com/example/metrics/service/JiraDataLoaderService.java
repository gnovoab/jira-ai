package com.example.metrics.service;

import com.example.metrics.model.jira.Issue;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to load and parse exported Jira data from JSON files.
 */
@Service
@Slf4j
public class JiraDataLoaderService {

    private final ObjectMapper objectMapper;

    public JiraDataLoaderService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Load issues from an exported Jira JSON file.
     *
     * @param filePath Path to the exported JSON file
     * @return List of parsed Issue objects
     * @throws IOException if file cannot be read or parsed
     */
    public List<Issue> loadIssuesFromFile(String filePath) throws IOException {
        log.info("Loading Jira data from file: {}", filePath);
        
        File file = new File(filePath);
        if (!file.exists()) {
            throw new IOException("File not found: " + filePath);
        }

        JsonNode root = objectMapper.readTree(file);
        
        // Extract metadata
        String exportDate = root.path("exportDate").asText();
        int totalIssues = root.path("totalIssues").asInt();
        String jql = root.path("jql").asText();
        
        log.info("Export metadata - Date: {}, Total Issues: {}", exportDate, totalIssues);
        log.info("JQL Query: {}", jql);
        
        // Parse issues array
        JsonNode issuesNode = root.path("issues");
        List<Issue> issues = new ArrayList<>();
        
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
        
        log.info("Successfully loaded {} issues from file", issues.size());
        return issues;
    }

    /**
     * Find the most recent export file in the tools directory.
     *
     * @return Path to the most recent export file
     * @throws IOException if no export files found
     */
    public String findLatestExportFile() throws IOException {
        File toolsDir = new File("tools");
        if (!toolsDir.exists() || !toolsDir.isDirectory()) {
            throw new IOException("Tools directory not found");
        }

        File[] exportFiles = toolsDir.listFiles((dir, name) -> 
            name.startsWith("jira-export-") && name.endsWith(".json"));
        
        if (exportFiles == null || exportFiles.length == 0) {
            throw new IOException("No export files found in tools directory");
        }

        // Find the most recent file (by name, which includes timestamp)
        File latestFile = exportFiles[0];
        for (File file : exportFiles) {
            if (file.getName().compareTo(latestFile.getName()) > 0) {
                latestFile = file;
            }
        }

        log.info("Found latest export file: {}", latestFile.getName());
        return latestFile.getAbsolutePath();
    }

    /**
     * Analyze issues for QA failures.
     *
     * @param issues List of issues to analyze
     * @return Count of issues with QA failures
     */
    public int countQaFailures(List<Issue> issues) {
        int qaFailures = 0;
        
        for (Issue issue : issues) {
            if (issue.getChangelog() != null && issue.getChangelog().getHistories() != null) {
                boolean hasQaFailure = issue.getChangelog().getHistories().stream()
                    .flatMap(history -> history.getItems().stream())
                    .anyMatch(item ->
                        "status".equals(item.getField())
                            && "QA Failed".equalsIgnoreCase(item.getToString())
                    );
                
                if (hasQaFailure) {
                    qaFailures++;
                    log.debug("Issue {} has QA failure", issue.getKey());
                }
            }
        }
        
        log.info("Found {} issues with QA failures out of {} total", qaFailures, issues.size());
        return qaFailures;
    }

    /**
     * Get summary statistics from loaded issues.
     *
     * @param issues List of issues
     * @return Summary string
     */
    public String getSummary(List<Issue> issues) {
        int qaFailures = countQaFailures(issues);
        double qaFailureRate = issues.isEmpty() ? 0 : (qaFailures * 100.0 / issues.size());
        
        return String.format(
            "Total Issues: %d, QA Failures: %d, QA Failure Rate: %.2f%%",
            issues.size(), qaFailures, qaFailureRate
        );
    }
}

