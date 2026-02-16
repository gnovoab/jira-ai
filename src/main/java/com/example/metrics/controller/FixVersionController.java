package com.example.metrics.controller;

import com.example.metrics.model.dto.FixVersionSummary;
import com.example.metrics.model.dto.IssueDetail;
import com.example.metrics.service.FixVersionAnalysisService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/fix-versions")
@RequiredArgsConstructor
@Tag(name = "Fix Version Analysis", description = "Fix version metrics and analysis endpoints")
public class FixVersionController {
    
    private final FixVersionAnalysisService fixVersionAnalysisService;
    
    @GetMapping
    @Operation(summary = "Get all fix version summaries")
    public ResponseEntity<List<FixVersionSummary>> getAllFixVersions() {
        try {
            List<FixVersionSummary> summaries = fixVersionAnalysisService.getAllFixVersionSummaries();
            return ResponseEntity.ok(summaries);
        } catch (IOException e) {
            log.error("Error fetching fix version summaries", e);
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/{versionName}")
    @Operation(summary = "Get summary for a specific fix version")
    public ResponseEntity<FixVersionSummary> getFixVersion(@PathVariable String versionName) {
        try {
            FixVersionSummary summary = fixVersionAnalysisService.getFixVersionSummary(versionName);
            if (summary == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(summary);
        } catch (IOException e) {
            log.error("Error fetching fix version summary for {}", versionName, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/{versionName}/issues")
    @Operation(summary = "Get all issues for a specific fix version")
    public ResponseEntity<List<IssueDetail>> getFixVersionIssues(@PathVariable String versionName) {
        try {
            List<IssueDetail> issues = fixVersionAnalysisService.getFixVersionIssues(versionName);
            return ResponseEntity.ok(issues);
        } catch (IOException e) {
            log.error("Error fetching fix version issues for {}", versionName, e);
            return ResponseEntity.internalServerError().build();
        }
    }
}

