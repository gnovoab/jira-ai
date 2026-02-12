package com.example.metrics.service;

import com.example.metrics.config.JiraProperties;
import com.example.metrics.model.dto.DeveloperMetrics;
import com.example.metrics.model.jira.History;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.model.jira.Item;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeveloperMetricsService {

    private final JiraProperties jiraProperties;

    public List<DeveloperMetrics> calculateDeveloperMetrics(List<Issue> issues) {

        Map<String, List<Issue>> byDeveloper =
                issues.stream()
                        .filter(i -> i.getFields().getAssignee() != null)
                        .collect(Collectors.groupingBy(
                                i -> i.getFields()
                                        .getAssignee()
                                        .getDisplayName()
                        ));

        return byDeveloper.entrySet().stream()
                .map(entry -> buildMetrics(entry.getKey(), entry.getValue()))
                .toList();
    }

    private DeveloperMetrics buildMetrics(
            String developer,
            List<Issue> issues) {

        long qaFailures = issues.stream()
                .filter(this::hasQaFailure)
                .count();

        double storyPoints = issues.stream()
                .filter(this::isDone)
                .map(i -> getStoryPoints(i))
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();

        long totalBugs = issues.stream()
                .filter(this::isBug)
                .count();

        Map<String, Long> priorityBreakdown = issues.stream()
                .filter(this::isBug)
                .filter(i -> i.getFields().getPriority() != null)
                .collect(Collectors.groupingBy(
                        i -> i.getFields().getPriority().getName(),
                        Collectors.counting()
                ));

        double qaFailureRate = issues.isEmpty() ? 0 : (qaFailures * 100.0) / issues.size();

        return new DeveloperMetrics(
                developer,
                issues.size(),
                (int) qaFailures,
                qaFailureRate,
                storyPoints,
                (int) totalBugs,
                priorityBreakdown.getOrDefault("Highest", 0L).intValue(),
                priorityBreakdown.getOrDefault("High", 0L).intValue(),
                priorityBreakdown.getOrDefault("Medium", 0L).intValue(),
                priorityBreakdown.getOrDefault("Low", 0L).intValue(),
                0.0  // TODO: Calculate average PR approval hours per developer
        );
    }

    /** Helper: check if an issue is a Bug */
    private boolean isBug(Issue issue) {
        return "Bug".equalsIgnoreCase(issue.getFields().getIssuetype().getName());
    }

    /** Helper: check if issue is Done */
    private boolean isDone(Issue issue) {
        return "Done".equalsIgnoreCase(issue.getFields().getStatus().getName());
    }

    /** Helper: extract story points from custom field */
    private Double getStoryPoints(Issue issue) {
        Object value = issue.getFields().getCustomField(jiraProperties.storyPointsField());
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return null;
    }

    /** Helper: check if issue has QA failure */
    private boolean hasQaFailure(Issue issue) {
        if (issue.getChangelog() == null || issue.getChangelog().getHistories() == null) {
            return false;
        }
        for (History h : issue.getChangelog().getHistories()) {
            for (Item i : h.getItems()) {
                if ("status".equalsIgnoreCase(i.getField())
                        && "QA".equalsIgnoreCase(i.getFromString())
                        && "QA Failed".equalsIgnoreCase(i.getToString())) {
                    return true;
                }
            }
        }
        return false;
    }
}

