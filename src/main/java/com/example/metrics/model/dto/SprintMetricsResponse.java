package com.example.metrics.model.dto;

public record SprintMetricsResponse(
        String sprintId,
        int totalIssues,
        int qaFailures,
        double qaFailureRate,
        int totalStories,
        int deliveredStories,
        double deliveredPercentage,
        double velocity,
        double committedStoryPoints,
        double completionRate,
        int totalBugs,
        int p1Bugs,
        int p2Bugs,
        int p3Bugs,
        int p4Bugs,
        double bugDensity,
        double averagePrApprovalHours,
        double medianPrApprovalHours
) {
}
