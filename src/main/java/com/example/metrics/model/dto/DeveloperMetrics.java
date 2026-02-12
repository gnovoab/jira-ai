package com.example.metrics.model.dto;

public record DeveloperMetrics(
        String developerName,
        int totalIssues,
        int qaFailures,
        double qaFailureRate,
        double storyPointsDelivered,
        int totalBugs,
        int p1Bugs,
        int p2Bugs,
        int p3Bugs,
        int p4Bugs,
        double averagePrApprovalHours
) {
}
