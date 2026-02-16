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
        double prBlockingRate,
        // New delivery metrics
        int devDeliveredStories,      // Stories that reached QA or beyond (dev finished)
        double devDeliveryPercentage,
        int qaDeliveredStories,       // Stories that reached Done (QA finished)
        double qaDeliveryPercentage,
        int inProgressIssues
) {
}
