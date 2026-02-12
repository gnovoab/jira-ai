package com.example.metrics.service;

import com.example.metrics.config.GitHubProperties;
import com.example.metrics.model.github.PullRequest;
import com.example.metrics.model.github.Review;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for integrating with GitHub REST API.
 * Fetches pull requests and calculates approval times.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GitHubService {

    @Qualifier("githubRestClient")
    private final RestClient githubRestClient;
    private final GitHubProperties gitHubProperties;

    private static final Pattern JIRA_ISSUE_PATTERN = Pattern.compile("[A-Z]+-\\d+");
    private static final int MAX_PRS_TO_FETCH = 100;

    /**
     * Fetches PR approval hours for all PRs that reference Jira issues.
     *
     * @return List of approval hours (time from PR creation to first approval)
     */
    public List<Double> fetchApprovalHours() {
        log.info("Fetching PR approval hours from GitHub");

        List<PullRequest> pullRequests = fetchPullRequests();
        List<Double> approvalHours = new ArrayList<>();

        for (PullRequest pr : pullRequests) {
            // Only process PRs that reference Jira issues
            if (!containsJiraIssue(pr.getTitle())) {
                continue;
            }

            try {
                Double hours = calculateApprovalHours(pr);
                if (hours != null) {
                    approvalHours.add(hours);
                }
            } catch (Exception e) {
                log.warn("Error calculating approval hours for PR #{}: {}",
                    pr.getNumber(), e.getMessage());
            }
        }

        log.info("Calculated approval hours for {} PRs", approvalHours.size());
        return approvalHours;
    }

    /**
     * Fetches pull requests from GitHub.
     * Retries up to 3 times with exponential backoff on failure.
     *
     * @return List of pull requests
     */
    @Retryable(
        retryFor = {RestClientException.class},
        maxAttempts = 3,
        backoff = @Backoff(delay = 1000, multiplier = 2.0)
    )
    private List<PullRequest> fetchPullRequests() {
        String endpoint = String.format("/repos/%s/%s/pulls",
                gitHubProperties.repoOwner(), gitHubProperties.repoName());

        try {
            List<PullRequest> prs = githubRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path(endpoint)
                            .queryParam("state", "all")
                            .queryParam("per_page", MAX_PRS_TO_FETCH)
                            .queryParam("sort", "created")
                            .queryParam("direction", "desc")
                            .build())
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<PullRequest>>() { });

            log.debug("Fetched {} pull requests from GitHub", prs != null ? prs.size() : 0);
            return prs != null ? prs : List.of();
        } catch (Exception e) {
            log.error("Error fetching pull requests from GitHub", e);
            return List.of();
        }
    }

    /**
     * Calculates approval hours for a pull request.
     *
     * @param pr Pull request
     * @return Hours from creation to first approval, or null if not approved
     */
    private Double calculateApprovalHours(PullRequest pr) {
        List<Review> reviews = fetchReviews(pr.getNumber());

        Review firstApproval = reviews.stream()
                .filter(r -> "APPROVED".equalsIgnoreCase(r.getState()))
                .findFirst()
                .orElse(null);

        if (firstApproval == null || pr.getCreatedAt() == null || firstApproval.getSubmittedAt() == null) {
            return null;
        }

        try {
            ZonedDateTime createdAt = ZonedDateTime.parse(pr.getCreatedAt());
            ZonedDateTime approvedAt = ZonedDateTime.parse(firstApproval.getSubmittedAt());

            Duration duration = Duration.between(createdAt, approvedAt);
            double hours = duration.toMinutes() / 60.0;

            log.debug("PR #{}: approval time = {} hours", pr.getNumber(), hours);
            return hours;
        } catch (Exception e) {
            log.warn("Error parsing dates for PR #{}: {}", pr.getNumber(), e.getMessage());
            return null;
        }
    }

    /**
     * Fetches reviews for a pull request.
     *
     * @param prNumber Pull request number
     * @return List of reviews
     */
    private List<Review> fetchReviews(int prNumber) {
        String endpoint = String.format("/repos/%s/%s/pulls/%d/reviews",
                gitHubProperties.repoOwner(), gitHubProperties.repoName(), prNumber);

        try {
            List<Review> reviews = githubRestClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Review>>() { });

            return reviews != null ? reviews : List.of();
        } catch (Exception e) {
            log.warn("Error fetching reviews for PR #{}: {}", prNumber, e.getMessage());
            return List.of();
        }
    }

    /**
     * Checks if a PR title contains a Jira issue key.
     *
     * @param title PR title
     * @return true if contains Jira issue pattern
     */
    private boolean containsJiraIssue(String title) {
        if (title == null) {
            return false;
        }
        Matcher matcher = JIRA_ISSUE_PATTERN.matcher(title);
        return matcher.find();
    }

    public String getRepoOwner() {
        return gitHubProperties.repoOwner();
    }

    public String getRepoName() {
        return gitHubProperties.repoName();
    }
}
