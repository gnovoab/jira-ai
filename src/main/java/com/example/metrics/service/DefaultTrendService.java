package com.example.metrics.service;

import com.example.metrics.calculator.MetricsCalculator;
import com.example.metrics.model.dto.QaTrendResponse;
import com.example.metrics.model.dto.SprintMetricsResponse;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.util.TrendAnalyzer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Service for analyzing QA failure rate trends across multiple sprints.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DefaultTrendService implements TrendService {

    private final JiraService jiraService;
    private final GitHubService gitHubService;
    private final MetricsCalculator metricsCalculator;
    private final TrendAnalyzer trendAnalyzer;

    @Override
    @Cacheable(value = "qaTrend", key = "#lastNSprints")
    public QaTrendResponse getTrend(int lastNSprints) {
        log.info("Calculating QA trend for last {} sprints", lastNSprints);

        // Validate input
        if (lastNSprints <= 0 || lastNSprints > 10) {
            log.warn("Invalid lastNSprints value: {}. Must be between 1 and 10.", lastNSprints);
            return new QaTrendResponse("STABLE", 0.0, 0.0, 0.0, List.of());
        }

        // Fetch sprint IDs (for now, we'll use sequential IDs)
        // In a real implementation, you'd fetch actual sprint IDs from Jira
        List<String> sprintIds = generateSprintIds(lastNSprints);

        List<SprintMetricsResponse> sprintMetrics = new ArrayList<>();
        List<Double> prApprovalHours = gitHubService.fetchApprovalHours();

        for (String sprintId : sprintIds) {
            try {
                List<Issue> issues = jiraService.fetchIssuesForSprint(sprintId);

                SprintMetricsResponse metrics = metricsCalculator.calculateSprintMetrics(
                        sprintId,
                        issues,
                        prApprovalHours,
                        jiraService.getStoryPointsField()
                );

                sprintMetrics.add(metrics);
            } catch (Exception e) {
                log.warn("Error fetching metrics for sprint {}: {}", sprintId, e.getMessage());
                // Continue with other sprints
            }
        }

        if (sprintMetrics.isEmpty()) {
            log.warn("No sprint metrics available for trend analysis");
            return new QaTrendResponse("STABLE", 0.0, 0.0, 0.0, List.of());
        }

        QaTrendResponse trend = trendAnalyzer.analyze(sprintMetrics);
        log.info("Trend analysis complete: direction={}, change={}%",
            trend.trendDirection(), trend.changePercentage());

        return trend;
    }

    /**
     * Generates sprint IDs for trend analysis.
     *
     * Note: This is a simplified implementation that assumes sequential sprint IDs.
     * In a production system, you would fetch actual sprint IDs from Jira's board API:
     * GET /rest/agile/1.0/board/{boardId}/sprint
     *
     * @param count Number of sprint IDs to generate
     * @return List of sprint IDs
     */
    private List<String> generateSprintIds(int count) {
        List<String> sprintIds = new ArrayList<>();

        // For now, we'll assume the user provides valid sprint IDs
        // This is a placeholder - in production, fetch from Jira Agile API
        for (int i = count; i > 0; i--) {
            sprintIds.add(String.valueOf(i));
        }

        log.debug("Generated sprint IDs: {}", sprintIds);
        return sprintIds;
    }
}
