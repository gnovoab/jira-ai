package com.example.metrics.model.dto;

import java.util.List;

public record QaTrendResponse(
        String trendDirection,
        double changePercentage,
        double averageFailureRate,
        double latestFailureRate,
        List<SprintQaData> sprintQaData
) {
}
