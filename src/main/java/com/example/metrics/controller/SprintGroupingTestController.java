package com.example.metrics.controller;

import com.example.metrics.model.dto.SprintInfo;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.datasource.JiraDataSourceManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Test controller to debug sprint grouping logic.
 */
@Slf4j
@RestController
@RequestMapping("/api/test/sprint-grouping")
@RequiredArgsConstructor
public class SprintGroupingTestController {
    
    private final JiraDataSourceManager dataSourceManager;
    private final ObjectMapper objectMapper;
    private static final String SPRINT_FIELD = "customfield_10020";
    
    @GetMapping("/analysis/{sprintName}")
    public Map<String, Object> analyzeSprintGrouping(@PathVariable String sprintName) {
        try {
            List<Issue> allIssues = dataSourceManager.fetchIssues(null);
            
            // Find issues that have this sprint in their history
            List<Map<String, Object>> issuesWithSprint = new ArrayList<>();
            
            for (Issue issue : allIssues) {
                List<SprintInfo> sprints = extractSprints(issue);
                
                // Check if this issue has the sprint in its history
                boolean hasSprint = sprints.stream()
                        .anyMatch(s -> sprintName.equals(s.getName()));
                
                if (hasSprint) {
                    // Get the most recent sprint
                    SprintInfo mostRecentSprint = sprints.isEmpty() ? null : sprints.get(sprints.size() - 1);
                    
                    Map<String, Object> issueInfo = new LinkedHashMap<>();
                    issueInfo.put("key", issue.getKey());
                    issueInfo.put("allSprints", sprints.stream().map(SprintInfo::getName).collect(Collectors.toList()));
                    issueInfo.put("mostRecentSprint", mostRecentSprint != null ? mostRecentSprint.getName() : "none");
                    issueInfo.put("isInMostRecentSprint", mostRecentSprint != null && sprintName.equals(mostRecentSprint.getName()));
                    
                    issuesWithSprint.add(issueInfo);
                }
            }
            
            long countInMostRecent = issuesWithSprint.stream()
                    .filter(i -> Boolean.TRUE.equals(i.get("isInMostRecentSprint")))
                    .count();
            
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("sprintName", sprintName);
            response.put("totalIssuesWithSprintInHistory", issuesWithSprint.size());
            response.put("issuesInMostRecentSprint", countInMostRecent);
            response.put("issues", issuesWithSprint);
            
            return response;
            
        } catch (IOException e) {
            log.error("Failed to analyze sprint grouping", e);
            return Map.of("error", e.getMessage());
        }
    }
    
    private List<SprintInfo> extractSprints(Issue issue) {
        if (issue.getFields() == null) {
            return Collections.emptyList();
        }
        
        Object sprintField = issue.getFields().getCustomField(SPRINT_FIELD);
        if (sprintField == null) {
            return Collections.emptyList();
        }
        
        try {
            if (sprintField instanceof List) {
                List<?> sprintList = (List<?>) sprintField;
                return sprintList.stream()
                    .map(obj -> objectMapper.convertValue(obj, SprintInfo.class))
                    .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Failed to parse sprint field for issue {}: {}", issue.getKey(), e.getMessage());
        }
        
        return Collections.emptyList();
    }
}

