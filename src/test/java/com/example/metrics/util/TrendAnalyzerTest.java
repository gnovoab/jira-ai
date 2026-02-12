package com.example.metrics.util;

import com.example.metrics.model.dto.QaTrendResponse;
import com.example.metrics.model.dto.SprintMetricsResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrendAnalyzerTest {

    private TrendAnalyzer trendAnalyzer;

    @BeforeEach
    void setUp() {
        trendAnalyzer = new TrendAnalyzer();
    }

    @Test
    void testAnalyzeEmptyHistory() {
        QaTrendResponse response = trendAnalyzer.analyze(List.of());
        assertThat(response.trendDirection()).isEqualTo("STABLE");
        assertThat(response.changePercentage()).isEqualTo(0.0);
    }

    @Test
    void testAnalyzeUpwardTrend() {
        SprintMetricsResponse sprint1 = createSprintMetrics("1", 10.0);
        SprintMetricsResponse sprint2 = createSprintMetrics("2", 16.0);

        QaTrendResponse response = trendAnalyzer.analyze(List.of(sprint1, sprint2));
        assertThat(response.trendDirection()).isEqualTo("UP");
        assertThat(response.changePercentage()).isEqualTo(6.0);
    }

    @Test
    void testAnalyzeDownwardTrend() {
        SprintMetricsResponse sprint1 = createSprintMetrics("1", 20.0);
        SprintMetricsResponse sprint2 = createSprintMetrics("2", 10.0);

        QaTrendResponse response = trendAnalyzer.analyze(List.of(sprint1, sprint2));
        assertThat(response.trendDirection()).isEqualTo("DOWN");
        assertThat(response.changePercentage()).isEqualTo(-10.0);
    }

    @Test
    void testDetermineTrendStable() {
        String trend = trendAnalyzer.determineTrend(2.0);
        assertThat(trend).isEqualTo("STABLE");
    }

    private SprintMetricsResponse createSprintMetrics(String sprintId, double qaFailureRate) {
        return new SprintMetricsResponse(sprintId, 100, (int) qaFailureRate, qaFailureRate,
                50, 45, 90.0, 100.0, 120.0, 83.33, 10, 2, 3, 4, 1, 0.1, 24.0, 20.0);
    }
}

