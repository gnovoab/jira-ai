package com.example.metrics.controller;

import com.example.metrics.model.jira.Issue;
import com.example.metrics.service.DataImportService;
import com.example.metrics.service.JiraFetchService;
import com.example.metrics.service.JiraFetchService.JiraCredentials;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

/**
 * Admin controller for database management operations.
 * Provides endpoints for importing data, checking status, refreshing cache,
 * and fetching data directly from Jira using session credentials.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DataImportService dataImportService;
    private final JiraFetchService jiraFetchService;
    private final ObjectMapper objectMapper;

    /**
     * Get database status including sprint counts and last update time.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDatabaseStatus() {
        try {
            Map<String, Object> status = dataImportService.getDatabaseStatus();
            return ResponseEntity.ok(status);
        } catch (IOException e) {
            log.error("Failed to get database status", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Refresh the in-memory cache from the database file.
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, Object>> refreshCache() {
        Map<String, Object> result = dataImportService.refreshCache();
        return ResponseEntity.ok(result);
    }

    /**
     * Import a Jira export JSON file.
     * The file should contain issues in the format exported by JiraHistoryExporter.
     */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importJiraExport(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "sprintId", required = false) String sprintId) {
        
        try {
            log.info("Importing file: {} ({} bytes)", file.getOriginalFilename(), file.getSize());
            
            JsonNode root = objectMapper.readTree(file.getInputStream());
            
            // Check if it's a direct issues array or wrapped in an object
            JsonNode issuesNode;
            if (root.isArray()) {
                issuesNode = root;
            } else {
                issuesNode = root.path("issues");
                if (issuesNode.isMissingNode() || !issuesNode.isArray()) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Invalid format: expected 'issues' array"));
                }
            }
            
            // Parse issues
            List<Issue> issues = new ArrayList<>();
            for (JsonNode issueNode : issuesNode) {
                try {
                    Issue issue = objectMapper.treeToValue(issueNode, Issue.class);
                    issues.add(issue);
                } catch (Exception e) {
                    log.warn("Failed to parse issue: {}", issueNode.path("key").asText(), e);
                }
            }
            
            if (issues.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "No valid issues found in file"));
            }
            
            // Determine sprint ID
            String targetSprintId = sprintId;
            if (targetSprintId == null || targetSprintId.isBlank()) {
                // Try to extract from first issue's sprint field
                targetSprintId = extractSprintId(issues.get(0));
                if (targetSprintId == null) {
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Could not determine sprint ID. Please provide sprintId parameter."));
                }
            }
            
            // Import
            Map<String, Object> result = dataImportService.importSprint(targetSprintId, issues);
            return ResponseEntity.ok(result);
            
        } catch (IOException e) {
            log.error("Failed to import file", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to import: " + e.getMessage()));
        }
    }

    /**
     * Extract sprint ID from an issue's sprint field.
     */
    private String extractSprintId(Issue issue) {
        if (issue.getFields() == null) return null;

        Object sprintField = issue.getFields().getCustomField("customfield_10020");
        if (sprintField instanceof List<?> sprintList && !sprintList.isEmpty()) {
            Object firstSprint = sprintList.get(0);
            if (firstSprint instanceof Map<?, ?> sprintMap) {
                Object id = sprintMap.get("id");
                return id != null ? id.toString() : null;
            }
        }
        return null;
    }

    // ========== Jira Fetch Endpoints ==========

    /**
     * DTO for receiving credentials from the UI.
     * Jira Cloud uses atlassian.xsrf.token instead of JSESSIONID.
     */
    public record CredentialsRequest(
            String xsrfToken,
            String accountXsrfToken,
            String tenantSessionToken
    ) {}

    /**
     * Update active sprints (delta update).
     * Fetches only active sprints from Jira and updates the database.
     */
    @PostMapping("/delta-update")
    public ResponseEntity<Map<String, Object>> deltaUpdate(@RequestBody CredentialsRequest request) {
        try {
            log.info("Starting delta update with provided credentials");

            if (request.xsrfToken() == null || request.xsrfToken().isBlank() ||
                request.accountXsrfToken() == null || request.accountXsrfToken().isBlank() ||
                request.tenantSessionToken() == null || request.tenantSessionToken().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "All three credentials are required: xsrfToken, accountXsrfToken, tenantSessionToken"));
            }

            JiraCredentials credentials = new JiraCredentials(
                    request.xsrfToken(),
                    request.accountXsrfToken(),
                    request.tenantSessionToken()
            );

            Map<String, Object> result = jiraFetchService.updateActiveSprints(credentials);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Delta update failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Delta update failed: " + e.getMessage()));
        }
    }

    /**
     * Fetch new sprints that are not in the database.
     * Discovers all sprints from Jira and fetches only new ones.
     */
    @PostMapping("/fetch-new")
    public ResponseEntity<Map<String, Object>> fetchNewSprints(@RequestBody CredentialsRequest request) {
        try {
            log.info("Starting fetch new sprints with provided credentials");

            if (request.xsrfToken() == null || request.xsrfToken().isBlank() ||
                request.accountXsrfToken() == null || request.accountXsrfToken().isBlank() ||
                request.tenantSessionToken() == null || request.tenantSessionToken().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "All three credentials are required: xsrfToken, accountXsrfToken, tenantSessionToken"));
            }

            JiraCredentials credentials = new JiraCredentials(
                    request.xsrfToken(),
                    request.accountXsrfToken(),
                    request.tenantSessionToken()
            );

            Map<String, Object> result = jiraFetchService.fetchNewSprints(credentials);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Fetch new sprints failed", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Fetch new sprints failed: " + e.getMessage()));
        }
    }
}

