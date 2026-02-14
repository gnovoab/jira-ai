package com.example.metrics.controller;

import com.example.metrics.model.jira.History;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.model.jira.Item;
import com.example.metrics.service.datasource.JiraDataSourceManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Debug controller to inspect actual QA status transitions in the changelog.
 */
@Slf4j
@RestController
@RequestMapping("/api/debug/qa")
@RequiredArgsConstructor
public class QaDebugController {
    
    private final JiraDataSourceManager dataSourceManager;
    
    /**
     * Get all unique status transitions for a sprint to see what's actually in the data.
     */
    @GetMapping("/status-transitions/{sprintId}")
    public Map<String, Object> getStatusTransitions(@PathVariable String sprintId) {
        try {
            List<Issue> issues = dataSourceManager.fetchIssuesForSprint(sprintId);
            
            // Collect all unique status transitions
            Set<String> allTransitions = new HashSet<>();
            Map<String, Integer> transitionCounts = new HashMap<>();
            
            for (Issue issue : issues) {
                if (issue.getChangelog() != null && issue.getChangelog().getHistories() != null) {
                    for (History history : issue.getChangelog().getHistories()) {
                        for (Item item : history.getItems()) {
                            if ("status".equalsIgnoreCase(item.getField())) {
                                String transition = item.getFromString() + " → " + item.getToString();
                                allTransitions.add(transition);
                                transitionCounts.put(transition, transitionCounts.getOrDefault(transition, 0) + 1);
                            }
                        }
                    }
                }
            }
            
            // Sort by count descending
            List<Map<String, Object>> sortedTransitions = transitionCounts.entrySet().stream()
                    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                    .map(e -> {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("transition", e.getKey());
                        m.put("count", e.getValue());
                        return m;
                    })
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("sprintId", sprintId);
            response.put("totalIssues", issues.size());
            response.put("uniqueTransitions", allTransitions.size());
            response.put("transitions", sortedTransitions);
            
            return response;
            
        } catch (IOException e) {
            log.error("Failed to fetch status transitions", e);
            return Map.of("error", e.getMessage());
        }
    }
    
    /**
     * Get sample issues that are being flagged as "QA failed" with their actual changelog.
     */
    @GetMapping("/qa-failures/{sprintId}")
    public Map<String, Object> getQaFailureDetails(@PathVariable String sprintId,
                                                     @RequestParam(defaultValue = "5") int limit) {
        try {
            List<Issue> issues = dataSourceManager.fetchIssuesForSprint(sprintId);
            
            List<Map<String, Object>> qaFailedIssues = new ArrayList<>();
            
            for (Issue issue : issues) {
                if (hasQaFailure(issue)) {
                    Map<String, Object> issueData = new LinkedHashMap<>();
                    issueData.put("key", issue.getKey());
                    issueData.put("summary", issue.getFields() != null ? issue.getFields().getSummary() : "N/A");
                    issueData.put("currentStatus", issue.getFields() != null && issue.getFields().getStatus() != null 
                            ? issue.getFields().getStatus().getName() : "N/A");
                    
                    // Get all status transitions for this issue
                    List<Map<String, Object>> statusChanges = new ArrayList<>();
                    if (issue.getChangelog() != null && issue.getChangelog().getHistories() != null) {
                        for (History history : issue.getChangelog().getHistories()) {
                            for (Item item : history.getItems()) {
                                if ("status".equalsIgnoreCase(item.getField())) {
                                    Map<String, Object> change = new LinkedHashMap<>();
                                    change.put("date", history.getCreated());
                                    change.put("from", item.getFromString());
                                    change.put("to", item.getToString());
                                    statusChanges.add(change);
                                }
                            }
                        }
                    }
                    
                    issueData.put("statusChanges", statusChanges);
                    qaFailedIssues.add(issueData);
                    
                    if (qaFailedIssues.size() >= limit) {
                        break;
                    }
                }
            }
            
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("sprintId", sprintId);
            response.put("totalQaFailures", qaFailedIssues.size());
            response.put("sampleIssues", qaFailedIssues);
            response.put("detectionLogic", "Matches status transitions containing: 'QA Failed', 'Failed QA', or 'Rejected'");
            
            return response;
            
        } catch (IOException e) {
            log.error("Failed to fetch QA failure details", e);
            return Map.of("error", e.getMessage());
        }
    }
    
    /**
     * Current QA failure detection logic (same as SprintAnalysisService).
     */
    private boolean hasQaFailure(Issue issue) {
        if (issue.getChangelog() == null || issue.getChangelog().getHistories() == null) {
            return false;
        }
        
        return issue.getChangelog().getHistories().stream()
            .flatMap(history -> history.getItems().stream())
            .anyMatch(item -> "status".equalsIgnoreCase(item.getField())
                && item.getToString() != null
                && (item.getToString().contains("QA Failed") 
                    || item.getToString().contains("Failed QA")
                    || item.getToString().contains("Rejected")));
    }
}

