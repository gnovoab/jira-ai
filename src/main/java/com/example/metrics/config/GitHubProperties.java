package com.example.metrics.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "github")
public record GitHubProperties(
        String token,
        String repoOwner,
        String repoName
) {
}
