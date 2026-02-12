package com.example.metrics.controller;

import com.example.metrics.model.dto.ExtendedSprintMetricsResponse;
import com.example.metrics.model.dto.QaTrendResponse;
import com.example.metrics.service.SprintMetricsService;
import com.example.metrics.service.TrendService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for engineering metrics.
 * Provides endpoints for sprint metrics and QA trend analysis.
 */
@Tag(name = "Metrics", description = "Engineering metrics API for sprint and developer performance analysis")
@RestController
@RequestMapping("/metrics")
@RequiredArgsConstructor
public class MetricsController {

    private final SprintMetricsService sprintMetricsService;
    private final TrendService trendService;

    @Operation(
        summary = "Get sprint metrics",
        description = "Retrieves comprehensive metrics for a specific sprint including "
                + "QA failure rate, velocity, bug density, PR approval time, "
                + "and developer-level metrics"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved sprint metrics"),
        @ApiResponse(responseCode = "400", description = "Invalid sprint ID"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping
    public ExtendedSprintMetricsResponse getMetrics(
            @Parameter(description = "Sprint identifier", required = true, example = "123")
            @RequestParam String sprintId) {
        return sprintMetricsService.getExtendedMetrics(sprintId);
    }

    @Operation(
        summary = "Get QA trend analysis",
        description = "Analyzes QA failure rate trends over multiple sprints "
                + "to identify quality improvements or degradations"
    )
    @ApiResponses(value = {
        @ApiResponse(responseCode = "200", description = "Successfully retrieved QA trend"),
        @ApiResponse(responseCode = "400", description = "Invalid number of sprints (must be 1-10)"),
        @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/trend")
    public QaTrendResponse getTrend(
            @Parameter(description = "Number of recent sprints to analyze (max: 10)", required = true, example = "5")
            @RequestParam int lastNSprints) {
        return trendService.getTrend(lastNSprints);
    }
}
