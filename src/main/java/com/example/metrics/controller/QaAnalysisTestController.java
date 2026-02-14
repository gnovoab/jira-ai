package com.example.metrics.controller;

import com.example.metrics.model.dto.SprintSummary;
import com.example.metrics.service.SprintAnalysisService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Test controller to analyze QA failure trends from the Sprint Master Database.
 */
@Slf4j
@RestController
@RequestMapping("/api/test/qa-analysis")
@RequiredArgsConstructor
public class QaAnalysisTestController {
    
    private final SprintAnalysisService sprintAnalysisService;
    
    /**
     * Get QA failure summary across all sprints.
     */
    @GetMapping("/summary")
    public Map<String, Object> getQaSummary() {
        try {
            List<SprintSummary> allSprints = sprintAnalysisService.getAllSprintSummaries();
            
            // Filter sprints with QA data
            List<SprintSummary> sprintsWithQa = allSprints.stream()
                    .filter(s -> s.totalQaTested() > 0)
                    .sorted(Comparator.comparing(SprintSummary::sprintId))
                    .toList();
            
            // Calculate overall statistics
            int totalIssuesAcrossAllSprints = sprintsWithQa.stream()
                    .mapToInt(SprintSummary::totalIssues)
                    .sum();
            
            int totalQaTested = sprintsWithQa.stream()
                    .mapToInt(SprintSummary::totalQaTested)
                    .sum();
            
            int totalQaFailed = sprintsWithQa.stream()
                    .mapToInt(SprintSummary::qaFailed)
                    .sum();
            
            double overallQaFailureRate = totalQaTested > 0 
                    ? (totalQaFailed * 100.0) / totalQaTested 
                    : 0.0;
            
            double averageQaFailureRate = sprintsWithQa.stream()
                    .mapToDouble(SprintSummary::qaFailureRatio)
                    .average()
                    .orElse(0.0);
            
            // Build sprint-by-sprint data
            List<Map<String, Object>> sprintData = sprintsWithQa.stream()
                    .map(sprint -> {
                        Map<String, Object> data = new LinkedHashMap<>();
                        data.put("sprintId", sprint.sprintId());
                        data.put("sprintName", sprint.sprintName());
                        data.put("totalIssues", sprint.totalIssues());
                        data.put("totalQaTested", sprint.totalQaTested());
                        data.put("qaFailed", sprint.qaFailed());
                        data.put("qaFailureRate", Math.round(sprint.qaFailureRatio() * 100.0) / 100.0);
                        data.put("qaPassed", sprint.totalQaTested() - sprint.qaFailed());
                        return data;
                    })
                    .collect(Collectors.toList());
            
            // Trend analysis
            String trendDirection = "STABLE";
            double trendChange = 0.0;
            
            if (sprintsWithQa.size() >= 2) {
                double firstRate = sprintsWithQa.get(0).qaFailureRatio();
                double lastRate = sprintsWithQa.get(sprintsWithQa.size() - 1).qaFailureRatio();
                trendChange = lastRate - firstRate;
                
                if (trendChange > 5) {
                    trendDirection = "UP (Worsening)";
                } else if (trendChange < -5) {
                    trendDirection = "DOWN (Improving)";
                }
            }
            
            // Build response
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("totalSprints", sprintsWithQa.size());
            response.put("totalIssuesAcrossAllSprints", totalIssuesAcrossAllSprints);
            response.put("totalQaTested", totalQaTested);
            response.put("totalQaFailed", totalQaFailed);
            response.put("totalQaPassed", totalQaTested - totalQaFailed);
            response.put("overallQaFailureRate", Math.round(overallQaFailureRate * 100.0) / 100.0);
            response.put("averageQaFailureRate", Math.round(averageQaFailureRate * 100.0) / 100.0);
            response.put("trendDirection", trendDirection);
            response.put("trendChange", Math.round(trendChange * 100.0) / 100.0);
            response.put("sprintData", sprintData);
            
            return response;
            
        } catch (IOException e) {
            log.error("Failed to analyze QA data", e);
            return Map.of("error", e.getMessage());
        }
    }
    
    /**
     * Get detailed QA failure analysis for a specific sprint.
     */
    @GetMapping("/top-failures")
    public Map<String, Object> getTopFailures() {
        try {
            List<SprintSummary> allSprints = sprintAnalysisService.getAllSprintSummaries();
            
            // Find sprints with highest QA failure rates
            List<Map<String, Object>> topFailures = allSprints.stream()
                    .filter(s -> s.totalQaTested() > 0)
                    .sorted(Comparator.comparingDouble(SprintSummary::qaFailureRatio).reversed())
                    .limit(5)
                    .map(sprint -> {
                        Map<String, Object> data = new LinkedHashMap<>();
                        data.put("sprintName", sprint.sprintName());
                        data.put("sprintId", sprint.sprintId());
                        data.put("qaFailureRate", Math.round(sprint.qaFailureRatio() * 100.0) / 100.0);
                        data.put("qaFailed", sprint.qaFailed());
                        data.put("totalQaTested", sprint.totalQaTested());
                        return data;
                    })
                    .collect(Collectors.toList());
            
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("description", "Top 5 sprints with highest QA failure rates");
            response.put("topFailures", topFailures);
            
            return response;
            
        } catch (IOException e) {
            log.error("Failed to analyze top failures", e);
            return Map.of("error", e.getMessage());
        }
    }
}

