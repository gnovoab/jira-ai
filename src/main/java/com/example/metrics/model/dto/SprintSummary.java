package com.example.metrics.model.dto;

public record SprintSummary(
        String sprintName,
        String sprintId,
        String startDate,
        String endDate,
        int sprintLengthDays,
        int totalIssues,
        int totalBugs,
        int totalStories,
        int totalTasks,
        int totalSubTasks,
        int totalOther,
        int completedIssues,
        double completionPercentage,
        int deliveredStories,
        double deliveryPercentage,
        int totalQaTested,
        int qaFailed,
        double qaFailureRatio,
        int totalPRs,
        int prsWithBlockingComments,
        double prBlockingRate
) {
}
