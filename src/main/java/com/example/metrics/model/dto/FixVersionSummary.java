package com.example.metrics.model.dto;

/**
 * Summary metrics for a Fix Version (release version like 2.40, 2.41, etc.)
 */
public record FixVersionSummary(
    String versionName,
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
    int inProgressIssues
) {}

