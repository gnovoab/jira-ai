package com.example.metrics.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

/**
 * Configuration for Spring Retry.
 * Enables retry logic for external API calls with exponential backoff.
 */
@Configuration
@EnableRetry
public class RetryConfig {
    // Retry is enabled via @EnableRetry annotation
    // Individual methods can use @Retryable annotation
}

