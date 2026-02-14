package com.example.metrics.service;

import com.example.metrics.model.dto.SprintInfo;
import com.example.metrics.model.dto.SprintSummary;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.datasource.JiraDataSourceManager;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SprintAnalysisService {
    
    private final JiraDataSourceManager dataSourceManager;
    private final ObjectMapper objectMapper;
    private static final String SPRINT_FIELD = "customfield_10020";
    
    public List<SprintSummary> getAllSprintSummaries() throws IOException {
        List<Issue> allIssues = dataSourceManager.fetchIssues(null);
        
        // Group issues by sprint
        Map<String, List<Issue>> issuesBySprint = groupIssuesBySprint(allIssues);
        
        // Calculate summary for each sprint
        return issuesBySprint.entrySet().stream()
            .map(entry -> calculateSprintSummary(entry.getKey(), entry.getValue()))
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(SprintSummary::sprintName))
            .collect(Collectors.toList());
    }
    
    public SprintSummary getSprintSummary(String sprintName) throws IOException {
        List<Issue> allIssues = dataSourceManager.fetchIssues(null);
        List<Issue> sprintIssues = allIssues.stream()
            .filter(issue -> belongsToSprint(issue, sprintName))
            .collect(Collectors.toList());
        
        return calculateSprintSummary(sprintName, sprintIssues);
    }
    
    private Map<String, List<Issue>> groupIssuesBySprint(List<Issue> issues) {
        Map<String, List<Issue>> grouped = new HashMap<>();

        for (Issue issue : issues) {
            List<SprintInfo> sprints = extractSprints(issue);

            // Only assign issue to its MOST RECENT sprint (last in the list)
            // This prevents double-counting issues that moved between sprints
            if (!sprints.isEmpty()) {
                SprintInfo mostRecentSprint = sprints.get(sprints.size() - 1);
                grouped.computeIfAbsent(mostRecentSprint.getName(), k -> new ArrayList<>()).add(issue);
            }
        }

        return grouped;
    }
    
    private SprintSummary calculateSprintSummary(String sprintName, List<Issue> issues) {
        if (issues.isEmpty()) {
            return null;
        }

        // Extract sprint info from first issue
        SprintInfo sprintInfo = extractSprints(issues.get(0)).stream()
            .filter(s -> sprintName.equals(s.getName()))
            .findFirst()
            .orElse(null);

        // Count total issues
        int totalIssues = issues.size();

        // Count by issue type
        int totalBugs = (int) issues.stream()
            .filter(this::isBug)
            .count();

        int totalStories = (int) issues.stream()
            .filter(this::isStory)
            .count();

        int totalTasks = (int) issues.stream()
            .filter(this::isTask)
            .count();

        int totalSubTasks = (int) issues.stream()
            .filter(this::isSubTask)
            .count();

        int totalOther = totalIssues - totalBugs - totalStories - totalTasks - totalSubTasks;

        // Count completed issues
        int completedIssues = (int) issues.stream()
            .filter(this::isCompleted)
            .count();

        double completionPercentage = totalIssues == 0 ? 0 : (completedIssues * 100.0) / totalIssues;

        // Count delivered stories
        int deliveredStories = (int) issues.stream()
            .filter(this::isStory)
            .filter(this::isCompleted)
            .count();

        double deliveryPercentage = totalStories == 0 ? 0 : (deliveredStories * 100.0) / totalStories;

        // Count QA metrics
        int totalQaTested = (int) issues.stream()
            .filter(this::wasQaTested)
            .count();

        int qaFailed = (int) issues.stream()
            .filter(this::hasQaFailure)
            .count();

        double qaFailureRatio = totalQaTested == 0 ? 0 : (qaFailed * 100.0) / totalQaTested;

        String sprintId = sprintInfo != null ? String.valueOf(sprintInfo.getId()) : "unknown";
        String startDate = sprintInfo != null ? sprintInfo.getStartDate() : "";
        String endDate = sprintInfo != null ? sprintInfo.getEndDate() : "";

        // Calculate sprint length in days
        int sprintLengthDays = 0;
        if (sprintInfo != null && sprintInfo.getStartDate() != null && sprintInfo.getEndDate() != null) {
            try {
                ZonedDateTime start = ZonedDateTime.parse(sprintInfo.getStartDate());
                ZonedDateTime end = ZonedDateTime.parse(sprintInfo.getEndDate());
                sprintLengthDays = (int) Duration.between(start, end).toDays();
            } catch (Exception e) {
                log.warn("Failed to parse sprint dates for {}: {}", sprintName, e.getMessage());
            }
        }

        // Calculate PR metrics
        // Note: For file-based data source, PR data is not available
        // For API-based source, would need to fetch PRs from GitHub
        int totalPRs = 0;
        int prsWithBlockingComments = 0;
        double prBlockingRate = 0.0;

        // TODO: Implement PR metrics when GitHub integration is available
        // Would need to:
        // 1. Extract Jira issue keys from issues list
        // 2. Fetch PRs from GitHub that reference these issue keys
        // 3. Check reviews for CHANGES_REQUESTED state
        // 4. Calculate blocking rate

        return new SprintSummary(
            sprintName,
            sprintId,
            startDate,
            endDate,
            sprintLengthDays,
            totalIssues,
            totalBugs,
            totalStories,
            totalTasks,
            totalSubTasks,
            totalOther,
            completedIssues,
            completionPercentage,
            deliveredStories,
            deliveryPercentage,
            totalQaTested,
            qaFailed,
            qaFailureRatio,
            totalPRs,
            prsWithBlockingComments,
            prBlockingRate
        );
    }
    
    private boolean belongsToSprint(Issue issue, String sprintName) {
        return extractSprints(issue).stream()
            .anyMatch(sprint -> sprintName.equals(sprint.getName()));
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
    
    private boolean isBug(Issue issue) {
        return issue.getFields() != null 
            && issue.getFields().getIssuetype() != null
            && "Bug".equalsIgnoreCase(issue.getFields().getIssuetype().getName());
    }
    
    private boolean isStory(Issue issue) {
        return issue.getFields() != null
            && issue.getFields().getIssuetype() != null
            && "Story".equalsIgnoreCase(issue.getFields().getIssuetype().getName());
    }

    private boolean isTask(Issue issue) {
        return issue.getFields() != null
            && issue.getFields().getIssuetype() != null
            && "Task".equalsIgnoreCase(issue.getFields().getIssuetype().getName());
    }

    private boolean isSubTask(Issue issue) {
        return issue.getFields() != null
            && issue.getFields().getIssuetype() != null
            && "Sub-task".equalsIgnoreCase(issue.getFields().getIssuetype().getName());
    }

    private boolean isCompleted(Issue issue) {
        if (issue.getFields() == null || issue.getFields().getStatus() == null) {
            return false;
        }
        String status = issue.getFields().getStatus().getName();
        return "Done".equalsIgnoreCase(status) 
            || "Completed".equalsIgnoreCase(status)
            || "Closed".equalsIgnoreCase(status);
    }
    
    private boolean wasQaTested(Issue issue) {
        if (issue.getChangelog() == null || issue.getChangelog().getHistories() == null) {
            return false;
        }
        
        return issue.getChangelog().getHistories().stream()
            .flatMap(history -> history.getItems().stream())
            .anyMatch(item -> "status".equalsIgnoreCase(item.getField())
                && item.getToString() != null
                && (item.getToString().contains("QA") || item.getToString().contains("Testing")));
    }
    
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
