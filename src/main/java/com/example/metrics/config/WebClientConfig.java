package com.example.metrics.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.client.RestClient;

@Configuration
public class WebClientConfig {
    @Bean("jiraRestClient")
    public RestClient jiraRestClient(JiraProperties jiraProperties) {
        return RestClient.builder()
                .baseUrl(jiraProperties.baseUrl())
                .defaultHeaders(headers -> headers.setBasicAuth(
                        jiraProperties.email(),
                        jiraProperties.apiToken()))
                .build();
    }

    @Bean("githubRestClient")
    public RestClient githubRestClient(GitHubProperties gitHubProperties) {
        return RestClient.builder()
                .baseUrl("https://api.github.com")
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + gitHubProperties.token())
                .build();
    }
}
