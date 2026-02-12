package com.example.metrics.service;

import com.example.metrics.calculator.MetricsCalculator;
import com.example.metrics.model.dto.DeveloperMetrics;
import com.example.metrics.model.dto.ExtendedSprintMetricsResponse;
import com.example.metrics.model.dto.SprintMetricsResponse;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.persistence.MetricsPersistence;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DefaultSprintMetricsService implements SprintMetricsService {

    private final JiraService jiraService;
    private final GitHubService gitHubService;
    private final MetricsCalculator metricsCalculator;
    private final DeveloperMetricsService developerMetricsService;
    private final MetricsPersistence metricsPersistence;

    @Override
    @Cacheable(value = "sprintMetrics", key = "#sprintId")
    public ExtendedSprintMetricsResponse getExtendedMetrics(String sprintId) {
        List<Issue> issues = jiraService.fetchIssuesForSprint(sprintId);
        List<Double> prApprovalHours = gitHubService.fetchApprovalHours();

        SprintMetricsResponse sprintMetrics = metricsCalculator.calculateSprintMetrics(
                sprintId,
                issues,
                prApprovalHours,
                jiraService.getStoryPointsField()
        );

        List<DeveloperMetrics> developerMetrics = developerMetricsService.calculateDeveloperMetrics(issues);
        ExtendedSprintMetricsResponse response = new ExtendedSprintMetricsResponse(sprintMetrics, developerMetrics);
        metricsPersistence.save(response);
        return response;
    }
}
