package com.example.metrics.controller;

import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.JiraDataLoaderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for testing with exported Jira data.
 */
@RestController
@RequestMapping("/api/test")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Data Test", description = "Test endpoints using exported Jira data")
public class DataTestController {

    private final JiraDataLoaderService dataLoaderService;

    @GetMapping("/load-latest")
    @Operation(summary = "Load and analyze the latest exported Jira data")
    public ResponseEntity<Map<String, Object>> loadLatestExport() {
        try {
            log.info("Loading latest export file...");
            String filePath = dataLoaderService.findLatestExportFile();
            List<Issue> issues = dataLoaderService.loadIssuesFromFile(filePath);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("filePath", filePath);
            response.put("totalIssues", issues.size());
            response.put("qaFailures", dataLoaderService.countQaFailures(issues));
            response.put("summary", dataLoaderService.getSummary(issues));
            
            // Sample issue keys
            List<String> sampleKeys = issues.stream()
                .limit(10)
                .map(Issue::getKey)
                .toList();
            response.put("sampleIssueKeys", sampleKeys);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to load export file", e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/load-file")
    @Operation(summary = "Load and analyze a specific exported Jira data file")
    public ResponseEntity<Map<String, Object>> loadSpecificFile(
            @Parameter(description = "Path to the export file (relative to project root)")
            @RequestParam String filePath) {
        try {
            log.info("Loading export file: {}", filePath);
            List<Issue> issues = dataLoaderService.loadIssuesFromFile(filePath);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("filePath", filePath);
            response.put("totalIssues", issues.size());
            response.put("qaFailures", dataLoaderService.countQaFailures(issues));
            response.put("summary", dataLoaderService.getSummary(issues));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to load export file: {}", filePath, e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/analyze-issue/{issueKey}")
    @Operation(summary = "Analyze a specific issue from the latest export")
    public ResponseEntity<Map<String, Object>> analyzeIssue(
            @Parameter(description = "Issue key (e.g., DISCCMS-5256)")
            @PathVariable String issueKey) {
        try {
            String filePath = dataLoaderService.findLatestExportFile();
            List<Issue> issues = dataLoaderService.loadIssuesFromFile(filePath);
            
            Issue issue = issues.stream()
                .filter(i -> issueKey.equals(i.getKey()))
                .findFirst()
                .orElse(null);
            
            if (issue == null) {
                log.warn("Issue not found: {}", issueKey);
                return ResponseEntity.notFound().build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("key", issue.getKey());

            if (issue.getFields() != null) {
                response.put("summary", issue.getFields().getSummary());
                if (issue.getFields().getStatus() != null) {
                    response.put("status", issue.getFields().getStatus().getName());
                }
            }
            
            if (issue.getChangelog() != null) {
                response.put("totalChanges", issue.getChangelog().getTotal());
                if (issue.getChangelog().getHistories() != null) {
                    response.put("historyCount", issue.getChangelog().getHistories().size());

                    // Check for QA failures
                    boolean hasQaFailure = issue.getChangelog().getHistories().stream()
                        .flatMap(history -> history.getItems().stream())
                        .anyMatch(item ->
                            "status".equals(item.getField())
                                && "QA Failed".equalsIgnoreCase(item.getToString())
                        );
                    response.put("hasQaFailure", hasQaFailure);
                }
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to analyze issue: {}", issueKey, e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}

