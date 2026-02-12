package com.example.metrics.service;

import com.example.metrics.config.GitHubProperties;
import com.example.metrics.model.github.PullRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Unit tests for GitHubService.
 */
@ExtendWith(MockitoExtension.class)
class GitHubServiceTest {

    @Mock
    private RestClient githubRestClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private GitHubProperties gitHubProperties;
    private GitHubService gitHubService;

    @BeforeEach
    void setUp() {
        gitHubProperties = new GitHubProperties(
                "test-token",
                "test-owner",
                "test-repo"
        );
        gitHubService = new GitHubService(githubRestClient, gitHubProperties);
    }

    @Test
    void testFetchApprovalHoursEmptyPrList() {
        // Given
        when(githubRestClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(java.util.function.Function.class)))
                .thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(List.of());

        // When
        List<Double> approvalHours = gitHubService.fetchApprovalHours();

        // Then
        assertThat(approvalHours).isEmpty();
    }

    @Test
    void testFetchApprovalHoursPrWithoutJiraIssue() {
        // Given
        PullRequest pr = new PullRequest();
        pr.setNumber(1);
        pr.setTitle("Fix bug in code");
        pr.setCreatedAt("2024-01-01T10:00:00Z");

        when(githubRestClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(java.util.function.Function.class)))
                .thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class))).thenReturn(List.of(pr));

        // When
        List<Double> approvalHours = gitHubService.fetchApprovalHours();

        // Then
        assertThat(approvalHours).isEmpty();
    }

    @Test
    void testFetchApprovalHoursPrWithJiraIssueButNoApproval() {
        // Given
        PullRequest pr = new PullRequest();
        pr.setNumber(1);
        pr.setTitle("TEST-123: Fix bug in code");
        pr.setCreatedAt("2024-01-01T10:00:00Z");

        when(githubRestClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(java.util.function.Function.class)))
                .thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(List.of(pr))
                .thenReturn(List.of());

        // When
        List<Double> approvalHours = gitHubService.fetchApprovalHours();

        // Then
        assertThat(approvalHours).isEmpty();
    }

    @Test
    void testGetRepoOwner() {
        // When
        String repoOwner = gitHubService.getRepoOwner();

        // Then
        assertThat(repoOwner).isEqualTo("test-owner");
    }

    @Test
    void testGetRepoName() {
        // When
        String repoName = gitHubService.getRepoName();

        // Then
        assertThat(repoName).isEqualTo("test-repo");
    }
}

