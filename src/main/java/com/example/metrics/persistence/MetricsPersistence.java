package com.example.metrics.persistence;

import com.example.metrics.model.dto.ExtendedSprintMetricsResponse;

public interface MetricsPersistence {
    void save(ExtendedSprintMetricsResponse response);
}
