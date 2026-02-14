package com.example.metrics.controller;

import com.example.metrics.model.dto.SprintSummary;
import com.example.metrics.service.SprintAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/sprints")
@RequiredArgsConstructor
@Tag(name = "Sprint Analysis", description = "Sprint metrics and analysis endpoints")
public class SprintAnalysisController {
    
    private final SprintAnalysisService sprintAnalysisService;
    
    @GetMapping
    @Operation(summary = "Get all sprint summaries")
    public ResponseEntity<List<SprintSummary>> getAllSprints() {
        try {
            List<SprintSummary> summaries = sprintAnalysisService.getAllSprintSummaries();
            return ResponseEntity.ok(summaries);
        } catch (IOException e) {
            log.error("Error fetching sprint summaries", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/{sprintName}")
    @Operation(summary = "Get summary for a specific sprint")
    public ResponseEntity<SprintSummary> getSprintSummary(@PathVariable String sprintName) {
        try {
            SprintSummary summary = sprintAnalysisService.getSprintSummary(sprintName);
            if (summary == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(summary);
        } catch (IOException e) {
            log.error("Error fetching sprint summary for: {}", sprintName, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
