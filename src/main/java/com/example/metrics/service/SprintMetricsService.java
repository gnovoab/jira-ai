package com.example.metrics.service;

import com.example.metrics.model.dto.ExtendedSprintMetricsResponse;

public interface SprintMetricsService {
    ExtendedSprintMetricsResponse getExtendedMetrics(String sprintId);
}
