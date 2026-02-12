package com.example.metrics.calculator;

import com.example.metrics.model.dto.SprintMetricsResponse;
import com.example.metrics.model.jira.History;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.model.jira.Item;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Component
public class MetricsCalculator {

    public SprintMetricsResponse calculateSprintMetrics(
            String sprintId,
            List<Issue> issues,
            List<Double> prApprovalHours,
            String storyPointsField) {

        long qaFailures = issues.stream()
                .filter(this::hasQaFailure)
                .count();

        long totalBugs = issues.stream()
                .filter(this::isBug)
                .count();

        Map<String, Long> priorityBreakdown = calculatePriorityBreakdown(issues);

        double velocity = calculateVelocity(issues, storyPointsField);

        long totalStories = issues.stream()
                .filter(i -> "Story".equalsIgnoreCase(i.getFields().getIssuetype().getName()))
                .count();

        long deliveredStories = issues.stream()
                .filter(i -> "Story".equalsIgnoreCase(i.getFields().getIssuetype().getName()))
                .filter(this::isDone)
                .count();

        double deliveredPercentage = totalStories == 0 ? 0
                : (deliveredStories * 100.0) / totalStories;

        double qaFailureRate = issues.isEmpty() ? 0 : (qaFailures * 100.0) / issues.size();

        double committedStoryPoints = calculateCommittedStoryPoints(issues, storyPointsField);
        double completionRate = committedStoryPoints == 0 ? 0 : (velocity / committedStoryPoints) * 100.0;

        double averagePrApprovalHours = prApprovalHours.isEmpty() ? 0
                : prApprovalHours.stream().mapToDouble(Double::doubleValue).average().orElse(0);

        double medianPrApprovalHours = calculateMedian(prApprovalHours);

        return new SprintMetricsResponse(
                sprintId,
                issues.size(),
                (int) qaFailures,
                qaFailureRate,
                (int) totalStories,
                (int) deliveredStories,
                deliveredPercentage,
                velocity,
                committedStoryPoints,
                completionRate,
                (int) totalBugs,
                priorityBreakdown.getOrDefault("Highest", 0L).intValue(),
                priorityBreakdown.getOrDefault("High", 0L).intValue(),
                priorityBreakdown.getOrDefault("Medium", 0L).intValue(),
                priorityBreakdown.getOrDefault("Low", 0L).intValue(),
                velocity == 0 ? 0 : (double) totalBugs / velocity,
                averagePrApprovalHours,
                medianPrApprovalHours
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

    /** Helper: calculate velocity (sum of story points for Done stories) */
    private double calculateVelocity(List<Issue> issues, String storyPointsField) {
        return issues.stream()
                .filter(i -> "Story".equalsIgnoreCase(i.getFields().getIssuetype().getName()))
                .filter(this::isDone)
                .map(i -> getStoryPoints(i, storyPointsField))
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
    }

    /** Helper: calculate committed story points (sum of all story points for stories) */
    private double calculateCommittedStoryPoints(List<Issue> issues, String storyPointsField) {
        return issues.stream()
                .filter(i -> "Story".equalsIgnoreCase(i.getFields().getIssuetype().getName()))
                .map(i -> getStoryPoints(i, storyPointsField))
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
    }

    /** Helper: extract story points from custom field */
    private Double getStoryPoints(Issue issue, String storyPointsField) {
        Object value = issue.getFields().getCustomField(storyPointsField);
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
        return null;
    }

    /** Helper: calculate median of a list of doubles */
    private double calculateMedian(List<Double> values) {
        if (values.isEmpty()) {
            return 0;
        }
        List<Double> sorted = values.stream()
                .sorted()
                .toList();
        int size = sorted.size();
        if (size % 2 == 0) {
            return (sorted.get(size / 2 - 1) + sorted.get(size / 2)) / 2.0;
        } else {
            return sorted.get(size / 2);
        }
    }

    /** Helper: calculate count per priority (P1–P4) */
    private Map<String, Long> calculatePriorityBreakdown(List<Issue> issues) {
        return issues.stream()
                .filter(i -> i.getFields().getPriority() != null)
                .collect(Collectors.groupingBy(
                        i -> i.getFields().getPriority().getName(),
                        Collectors.counting()
                ));
    }

    /** QA failure detection (already in skeleton) */
    private boolean hasQaFailure(Issue issue) {
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
