package com.example.metrics.service;

import com.example.metrics.model.dto.FixVersionSummary;
import com.example.metrics.model.dto.IssueDetail;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.datasource.JiraDataSourceManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FixVersionAnalysisService {
    
    private final JiraDataSourceManager dataSourceManager;
    
    public List<FixVersionSummary> getAllFixVersionSummaries() throws IOException {
        List<Issue> allIssues = dataSourceManager.fetchIssues(null);
        
        // Group issues by fix version
        Map<String, List<Issue>> issuesByVersion = groupIssuesByFixVersion(allIssues);
        
        // Calculate summary for each version
        return issuesByVersion.entrySet().stream()
            .map(entry -> calculateVersionSummary(entry.getKey(), entry.getValue()))
            .filter(Objects::nonNull)
            .sorted(Comparator.comparing(FixVersionSummary::versionName))
            .collect(Collectors.toList());
    }
    
    public FixVersionSummary getFixVersionSummary(String versionName) throws IOException {
        List<Issue> allIssues = dataSourceManager.fetchIssues(null);
        List<Issue> versionIssues = allIssues.stream()
            .filter(issue -> hasFixVersion(issue, versionName))
            .collect(Collectors.toList());

        return calculateVersionSummary(versionName, versionIssues);
    }

    /**
     * Get all issues for a fix version with details for UI display.
     * Deduplicates by issue key to avoid showing the same issue multiple times.
     */
    public List<IssueDetail> getFixVersionIssues(String versionName) throws IOException {
        List<Issue> allIssues = dataSourceManager.fetchIssues(null);

        // Use LinkedHashMap to preserve order while deduplicating by key
        Map<String, Issue> uniqueIssues = new LinkedHashMap<>();
        allIssues.stream()
            .filter(issue -> hasFixVersion(issue, versionName))
            .forEach(issue -> uniqueIssues.putIfAbsent(issue.getKey(), issue));

        return uniqueIssues.values().stream()
            .map(this::toIssueDetail)
            .sorted(Comparator.comparing(IssueDetail::issueType)
                .thenComparing(IssueDetail::key))
            .collect(Collectors.toList());
    }

    /**
     * Convert Issue to IssueDetail DTO.
     */
    private IssueDetail toIssueDetail(Issue issue) {
        String key = issue.getKey();
        String summary = issue.getFields() != null ? issue.getFields().getSummary() : "";
        String issueType = issue.getFields() != null && issue.getFields().getIssuetype() != null
            ? issue.getFields().getIssuetype().getName() : "Unknown";
        String status = issue.getFields() != null && issue.getFields().getStatus() != null
            ? issue.getFields().getStatus().getName() : "Unknown";
        String priority = issue.getFields() != null && issue.getFields().getPriority() != null
            ? issue.getFields().getPriority().getName() : "None";
        String assignee = issue.getFields() != null && issue.getFields().getAssignee() != null
            ? issue.getFields().getAssignee().getDisplayName() : "Unassigned";
        boolean devDelivered = hasReachedQaOrBeyond(issue);
        boolean qaDelivered = hasReachedDone(issue);

        return new IssueDetail(key, summary, issueType, status, priority, assignee, devDelivered, qaDelivered);
    }

    /**
     * Check if issue has reached QA or beyond (dev finished coding).
     */
    private boolean hasReachedQaOrBeyond(Issue issue) {
        if (issue.getFields() != null && issue.getFields().getStatus() != null) {
            String currentStatus = issue.getFields().getStatus().getName();
            if (isQaOrBeyondStatus(currentStatus)) {
                return true;
            }
        }
        if (issue.getChangelog() != null && issue.getChangelog().getHistories() != null) {
            return issue.getChangelog().getHistories().stream()
                .flatMap(history -> history.getItems().stream())
                .anyMatch(item -> "status".equalsIgnoreCase(item.getField())
                    && item.getToString() != null
                    && isQaOrBeyondStatus(item.getToString()));
        }
        return false;
    }

    private boolean isQaOrBeyondStatus(String status) {
        if (status == null) return false;
        return "QA".equalsIgnoreCase(status)
            || "Ready for Test".equalsIgnoreCase(status)
            || "Ready for merge".equalsIgnoreCase(status)
            || "Monitoring".equalsIgnoreCase(status)
            || "Completed".equalsIgnoreCase(status)
            || "Done".equalsIgnoreCase(status)
            || "Closed".equalsIgnoreCase(status);
    }

    /**
     * Check if issue has reached Done (QA finished testing).
     */
    private boolean hasReachedDone(Issue issue) {
        if (issue.getFields() != null && issue.getFields().getStatus() != null) {
            String currentStatus = issue.getFields().getStatus().getName();
            if (isDoneStatus(currentStatus)) {
                return true;
            }
        }
        if (issue.getChangelog() != null && issue.getChangelog().getHistories() != null) {
            return issue.getChangelog().getHistories().stream()
                .flatMap(history -> history.getItems().stream())
                .anyMatch(item -> "status".equalsIgnoreCase(item.getField())
                    && item.getToString() != null
                    && isDoneStatus(item.getToString()));
        }
        return false;
    }

    private boolean isDoneStatus(String status) {
        if (status == null) return false;
        return "Completed".equalsIgnoreCase(status)
            || "Ready for merge".equalsIgnoreCase(status)
            || "Monitoring".equalsIgnoreCase(status)
            || "Done".equalsIgnoreCase(status)
            || "Closed".equalsIgnoreCase(status);
    }

    private Map<String, List<Issue>> groupIssuesByFixVersion(List<Issue> issues) {
        Map<String, List<Issue>> grouped = new HashMap<>();
        
        for (Issue issue : issues) {
            List<String> versions = extractFixVersions(issue);
            // Assign issue to each fix version it belongs to
            for (String version : versions) {
                grouped.computeIfAbsent(version, k -> new ArrayList<>()).add(issue);
            }
        }
        
        return grouped;
    }
    
    @SuppressWarnings("unchecked")
    private List<String> extractFixVersions(Issue issue) {
        if (issue.getFields() == null) {
            return Collections.emptyList();
        }
        
        Object fixVersionsField = issue.getFields().getCustomField("fixVersions");
        if (fixVersionsField == null) {
            fixVersionsField = issue.getFields().getCustomFields().get("fixVersions");
        }
        
        if (fixVersionsField instanceof List) {
            List<?> versions = (List<?>) fixVersionsField;
            return versions.stream()
                .filter(v -> v instanceof Map)
                .map(v -> ((Map<String, Object>) v).get("name"))
                .filter(Objects::nonNull)
                .map(Object::toString)
                .collect(Collectors.toList());
        }
        
        return Collections.emptyList();
    }
    
    private boolean hasFixVersion(Issue issue, String versionName) {
        return extractFixVersions(issue).stream()
            .anyMatch(v -> versionName.equals(v));
    }
    
    private FixVersionSummary calculateVersionSummary(String versionName, List<Issue> issues) {
        if (issues.isEmpty()) {
            return null;
        }
        
        int totalIssues = issues.size();
        int totalBugs = (int) issues.stream().filter(this::isBug).count();
        int totalStories = (int) issues.stream().filter(this::isStory).count();
        int totalTasks = (int) issues.stream().filter(this::isTask).count();
        int totalSubTasks = (int) issues.stream().filter(this::isSubTask).count();
        int totalOther = totalIssues - totalBugs - totalStories - totalTasks - totalSubTasks;
        
        int completedIssues = (int) issues.stream().filter(this::isCompleted).count();
        double completionPercentage = totalIssues == 0 ? 0 : (completedIssues * 100.0) / totalIssues;
        
        int deliveredStories = (int) issues.stream()
            .filter(this::isStory)
            .filter(this::isCompleted)
            .count();
        double deliveryPercentage = totalStories == 0 ? 0 : (deliveredStories * 100.0) / totalStories;
        
        int totalQaTested = (int) issues.stream().filter(this::wasQaTested).count();
        int qaFailed = (int) issues.stream().filter(this::hasQaFailure).count();
        double qaFailureRatio = totalQaTested == 0 ? 0 : (qaFailed * 100.0) / totalQaTested;
        
        int inProgressIssues = (int) issues.stream().filter(this::isInProgress).count();
        
        return new FixVersionSummary(
            versionName, totalIssues, totalBugs, totalStories, totalTasks, totalSubTasks,
            totalOther, completedIssues, completionPercentage, deliveredStories,
            deliveryPercentage, totalQaTested, qaFailed, qaFailureRatio, inProgressIssues
        );
    }
    
    // Helper methods (same logic as SprintAnalysisService)
    private boolean isBug(Issue issue) {
        return hasIssueType(issue, "Bug");
    }
    
    private boolean isStory(Issue issue) {
        return hasIssueType(issue, "Story");
    }
    
    private boolean isTask(Issue issue) {
        return hasIssueType(issue, "Task");
    }
    
    private boolean isSubTask(Issue issue) {
        return hasIssueType(issue, "Sub-task");
    }
    
    private boolean hasIssueType(Issue issue, String type) {
        return issue.getFields() != null 
            && issue.getFields().getIssuetype() != null
            && type.equalsIgnoreCase(issue.getFields().getIssuetype().getName());
    }
    
    private boolean isCompleted(Issue issue) {
        if (issue.getFields() == null || issue.getFields().getStatus() == null) return false;
        String status = issue.getFields().getStatus().getName();
        return "Done".equalsIgnoreCase(status) || "Completed".equalsIgnoreCase(status) 
            || "Closed".equalsIgnoreCase(status);
    }
    
    private boolean isInProgress(Issue issue) {
        if (issue.getFields() == null || issue.getFields().getStatus() == null) return false;
        String status = issue.getFields().getStatus().getName().toLowerCase();
        return status.contains("progress") || status.contains("review") || status.contains("testing");
    }
    
    private boolean wasQaTested(Issue issue) {
        if (issue.getChangelog() == null || issue.getChangelog().getHistories() == null) return false;
        return issue.getChangelog().getHistories().stream()
            .flatMap(h -> h.getItems().stream())
            .anyMatch(item -> "status".equalsIgnoreCase(item.getField())
                && item.getToString() != null
                && (item.getToString().contains("QA") || item.getToString().contains("Testing")));
    }
    
    private boolean hasQaFailure(Issue issue) {
        if (issue.getChangelog() == null || issue.getChangelog().getHistories() == null) return false;
        return issue.getChangelog().getHistories().stream()
            .flatMap(h -> h.getItems().stream())
            .anyMatch(item -> "status".equalsIgnoreCase(item.getField())
                && item.getToString() != null
                && (item.getToString().contains("QA Failed") || item.getToString().contains("Failed QA")
                    || item.getToString().contains("Rejected")));
    }
}

