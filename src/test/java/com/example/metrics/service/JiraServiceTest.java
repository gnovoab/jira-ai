package com.example.metrics.service;

import com.example.metrics.config.JiraProperties;
import com.example.metrics.model.jira.Issue;
import com.example.metrics.model.jira.JiraSearchResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for JiraService.
 */
@ExtendWith(MockitoExtension.class)
class JiraServiceTest {

    @Mock
    private RestClient jiraRestClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    private JiraProperties jiraProperties;
    private JiraService jiraService;

    @BeforeEach
    void setUp() {
        jiraProperties = new JiraProperties(
                "https://test.atlassian.net",
                "test@example.com",
                "test-token",
                "TEST",
                "customfield_10016"
        );
        jiraService = new JiraService(jiraRestClient, jiraProperties);
    }

    @Test
    void testFetchIssuesForSprintEmptyResponse() {
        // Given
        String sprintId = "123";
        JiraSearchResponse emptyResponse = new JiraSearchResponse();
        emptyResponse.setIssues(List.of());
        emptyResponse.setTotal(0);
        emptyResponse.setMaxResults(100);

        when(jiraRestClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(java.util.function.Function.class)))
                .thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(JiraSearchResponse.class)).thenReturn(emptyResponse);

        // When
        List<Issue> issues = jiraService.fetchIssuesForSprint(sprintId);

        // Then
        assertThat(issues).isEmpty();
        verify(jiraRestClient, times(1)).get();
    }

    @Test
    void testFetchIssuesForSprintSinglePage() {
        // Given
        String sprintId = "123";
        Issue issue1 = new Issue();
        issue1.setKey("TEST-1");
        
        Issue issue2 = new Issue();
        issue2.setKey("TEST-2");

        JiraSearchResponse response = new JiraSearchResponse();
        response.setIssues(List.of(issue1, issue2));
        response.setTotal(2);
        response.setMaxResults(100);

        when(jiraRestClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(any(java.util.function.Function.class)))
                .thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(JiraSearchResponse.class)).thenReturn(response);

        // When
        List<Issue> issues = jiraService.fetchIssuesForSprint(sprintId);

        // Then
        assertThat(issues).hasSize(2);
        assertThat(issues.get(0).getKey()).isEqualTo("TEST-1");
        assertThat(issues.get(1).getKey()).isEqualTo("TEST-2");
        verify(jiraRestClient, times(1)).get();
    }

    @Test
    void testGetProjectKey() {
        // When
        String projectKey = jiraService.getProjectKey();

        // Then
        assertThat(projectKey).isEqualTo("TEST");
    }

    @Test
    void testGetStoryPointsField() {
        // When
        String storyPointsField = jiraService.getStoryPointsField();

        // Then
        assertThat(storyPointsField).isEqualTo("customfield_10016");
    }
}

