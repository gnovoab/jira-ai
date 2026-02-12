package com.example.metrics.model.dto;

import java.util.List;

public record ExtendedSprintMetricsResponse(
        SprintMetricsResponse sprintMetrics,
        List<DeveloperMetrics> developerMetrics
) {
}
