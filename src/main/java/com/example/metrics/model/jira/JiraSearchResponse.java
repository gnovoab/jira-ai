package com.example.metrics.model.jira;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Response wrapper for Jira's /rest/api/3/search endpoint.
 * Supports pagination with startAt, maxResults, and total fields.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class JiraSearchResponse {
    private int startAt;
    private int maxResults;
    private int total;
    private List<Issue> issues;

    public int getStartAt() {
        return startAt;
    }

    public void setStartAt(int startAt) {
        this.startAt = startAt;
    }

    public int getMaxResults() {
        return maxResults;
    }

    public void setMaxResults(int maxResults) {
        this.maxResults = maxResults;
    }

    public int getTotal() {
        return total;
    }

    public void setTotal(int total) {
        this.total = total;
    }

    public List<Issue> getIssues() {
        return issues;
    }

    public void setIssues(List<Issue> issues) {
        this.issues = issues;
    }
}

