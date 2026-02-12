package com.example.metrics.persistence;

import com.example.metrics.model.dto.ExtendedSprintMetricsResponse;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        name = "feature.persistence-enabled",
        havingValue = "false",
        matchIfMissing = true
)
public class NoOpMetricsPersistence implements MetricsPersistence {
    @Override
    public void save(ExtendedSprintMetricsResponse response) {
    }
}
