package com.example.metrics.service;

import com.example.metrics.config.JiraProperties;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.model.jira.JiraSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.ArrayList;
import java.util.List;

/**
 * Service for integrating with Jira Cloud REST API v3.
 * Fetches issues for a sprint with pagination and changelog expansion.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class JiraService {

    @Qualifier("jiraRestClient")
    private final RestClient jiraRestClient;
    private final JiraProperties jiraProperties;

    private static final int MAX_RESULTS_PER_PAGE = 100;
    private static final String SEARCH_ENDPOINT = "/rest/api/3/search";

    /**
     * Fetches all issues for a given sprint with pagination and changelog expansion.
     *
     * @param sprintId Sprint identifier
     * @return List of issues with full changelog data
     */
    public List<Issue> fetchIssuesForSprint(String sprintId) {
        log.info("Fetching issues for sprint: {}", sprintId);

        List<Issue> allIssues = new ArrayList<>();
        int startAt = 0;
        int total;

        do {
            JiraSearchResponse response = fetchPage(sprintId, startAt);

            if (response == null || response.getIssues() == null) {
                log.warn("Received null response or issues for sprint: {}", sprintId);
                break;
            }

            allIssues.addAll(response.getIssues());
            total = response.getTotal();
            startAt += response.getMaxResults();

            log.debug("Fetched {} issues, total: {}, startAt: {}",
                response.getIssues().size(), total, startAt);

        } while (startAt < total);

        log.info("Successfully fetched {} issues for sprint: {}", allIssues.size(), sprintId);
        return allIssues;
    }

    /**
     * Fetches a single page of issues from Jira.
     * Retries up to 3 times with exponential backoff on failure.
     *
     * @param sprintId Sprint identifier
     * @param startAt Pagination offset
     * @return JiraSearchResponse containing issues and pagination metadata
     */
    @Retryable(
        retryFor = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2.0)
    )
    private JiraSearchResponse fetchPage(String sprintId, int startAt) {
        String jql = buildJql(sprintId);

        log.debug("Executing JQL: {} (startAt: {})", jql, startAt);

        try {
            return jiraRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(SEARCH_ENDPOINT)
                            .queryParam("jql", jql)
                            .queryParam("startAt", startAt)
                            .queryParam("maxResults", MAX_RESULTS_PER_PAGE)
                            .queryParam("expand", "changelog")
                            .build())
                    .retrieve()
                    .body(JiraSearchResponse.class);
        } catch (Exception e) {
            log.error("Error fetching issues from Jira for sprint: {} at startAt: {}",
                sprintId, startAt, e);
            throw new RuntimeException("Failed to fetch issues from Jira: " + e.getMessage(), e);
        }
    }

    /**
     * Builds JQL query for fetching sprint issues.
     *
     * @param sprintId Sprint identifier
     * @return JQL query string
     */
    private String buildJql(String sprintId) {
        return String.format("project = %s AND sprint = %s ORDER BY created ASC",
                jiraProperties.projectKey(), sprintId);
    }

    public String getProjectKey() {
        return jiraProperties.projectKey();
    }

    public String getStoryPointsField() {
        return jiraProperties.storyPointsField();
    }
}
