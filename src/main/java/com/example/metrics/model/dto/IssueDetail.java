package com.example.metrics.model.dto;

/**
 * DTO for issue details displayed in the UI.
 */
public record IssueDetail(
    String key,
    String summary,
    String issueType,
    String status,
    String priority,
    String assignee,
    boolean devDelivered,   // Reached QA or beyond
    boolean qaDelivered     // Reached Done
) {}

