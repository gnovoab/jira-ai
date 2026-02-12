package com.example.metrics.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuration for OpenAPI/Swagger documentation.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Engineering Metrics Service API")
                        .version("1.0.0")
                        .description("""
                                A Spring Boot service that integrates with Jira Cloud and GitHub
                                to compute comprehensive engineering metrics for sprint-level
                                and developer-level performance analysis.
                                
                                **Features:**
                                - Sprint metrics (QA failure rate, velocity, bug density, PR approval time)
                                - Developer-level metrics
                                - QA trend analysis across multiple sprints
                                - Intelligent caching with Caffeine
                                - Retry logic with exponential backoff
                                """)
                        .contact(new Contact()
                                .name("Engineering Team")
                                .email("support@example.com"))
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")))
                .servers(List.of(
                        new Server()
                                .url("http://localhost:8080")
                                .description("Local development server"),
                        new Server()
                                .url("https://api.example.com")
                                .description("Production server")
                ));
    }
}

