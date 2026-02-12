# Engineering Metrics Service

> A Spring Boot service that integrates with Jira Cloud and GitHub to compute comprehensive engineering metrics for sprint-level and developer-level performance analysis.

[![Java](https://img.shields.io/badge/Java-17+-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Gradle](https://img.shields.io/badge/Gradle-9.3.0-blue.svg)](https://gradle.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Metrics Explained](#-metrics-explained)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

The **Engineering Metrics Service** is a lightweight, stateless Spring Boot application designed to provide actionable insights into your team's engineering performance. By integrating with Jira Cloud and GitHub, it computes metrics such as:

- **QA Failure Rate** - Track quality issues
- **Velocity** - Measure story points delivered
- **Bug Density** - Assess code quality
- **PR Approval Time** - Monitor code review efficiency
- **Developer Performance** - Individual contributor metrics
- **QA Trends** - Historical quality analysis

### Key Characteristics

- ✅ **No Database** - Fully in-memory with intelligent caching
- ✅ **On-Demand** - Metrics computed when requested
- ✅ **Fast** - Caffeine cache for sub-second responses
- ✅ **Extensible** - Feature flags for custom persistence
- ✅ **Clean Architecture** - Layered design for maintainability

---

## ✨ Features

### Sprint Metrics

- Total issues, stories, and bugs
- QA failure rate and count
- Velocity and story delivery percentage
- Committed vs. delivered story points
- Bug priority breakdown (P1-P4)
- Bug density (bugs per story point)
- PR approval time (average and median)

### Developer Metrics

- Per-developer issue counts
- Individual QA failure rates
- Story points delivered per developer
- Bug counts and priority breakdown
- Average PR approval time per developer

### Trend Analysis

- QA failure rate trends over multiple sprints
- Trend direction (UP, DOWN, STABLE)
- Historical sprint data visualization

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ HTTP
       ▼
┌─────────────────────────────────────┐
│      MetricsController              │
│  (REST API Layer)                   │
└──────┬──────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│   Service Layer                     │
│  - SprintMetricsService             │
│  - TrendService                     │
│  - DeveloperMetricsService          │
└──────┬──────────────────────────────┘
       │
       ├──────────────┬─────────────────┐
       ▼              ▼                 ▼
┌──────────┐   ┌──────────┐   ┌──────────────┐
│  Jira    │   │ GitHub   │   │ Metrics      │
│ Service  │   │ Service  │   │ Calculator   │
└──────────┘   └──────────┘   └──────────────┘
       │              │
       ▼              ▼
┌──────────┐   ┌──────────┐
│   Jira   │   │  GitHub  │
│   API    │   │   API    │
└──────────┘   └──────────┘
```

### Layers

1. **Controller** - REST endpoints
2. **Service** - Business logic and orchestration
3. **Calculator** - Pure computation logic
4. **Integration** - External API calls (Jira, GitHub)
5. **Model** - DTOs and domain models

---

## 📦 Prerequisites

- **Java 21+** (tested with Java 21)
- **Gradle 9.3.0+**
- **Jira Cloud** account with API token
- **GitHub** Personal Access Token

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/engineering-metrics-service.git
cd engineering-metrics-service
```

### 2. Configure Credentials

Edit `src/main/resources/application.yml`:

```yaml
jira:
  base-url: https://your-domain.atlassian.net
  email: your-email@example.com
  api-token: your-jira-api-token
  project-key: YOUR_PROJECT
  story-points-field: customfield_10016

github:
  token: ghp_your_github_token
  repo-owner: your-organization
  repo-name: your-repository
```

### 3. Build and Run

```bash
# Build the project
./gradlew clean build

# Run the application
./gradlew bootRun
```

The service will start on `http://localhost:8080`.

### 4. Test the API

```bash
# Get sprint metrics
curl "http://localhost:8080/metrics?sprintId=123"

# Get QA trend
curl "http://localhost:8080/metrics/trend?lastNSprints=5"
```

---

## ⚙️ Configuration

### Jira Configuration

| Property | Description | Example |
|----------|-------------|---------|
| `jira.base-url` | Your Jira Cloud instance URL | `https://mycompany.atlassian.net` |
| `jira.email` | Email for Basic Auth | `user@example.com` |
| `jira.api-token` | Jira API token ([create one](https://id.atlassian.com/manage-profile/security/api-tokens)) | `ATATTxxxxx` |
| `jira.project-key` | Jira project key | `ABC` |
| `jira.story-points-field` | Custom field ID for story points | `customfield_10016` |

### GitHub Configuration

| Property | Description | Example |
|----------|-------------|---------|
| `github.token` | GitHub Personal Access Token ([create one](https://github.com/settings/tokens)) | `ghp_xxxxx` |
| `github.repo-owner` | GitHub organization or user | `mycompany` |
| `github.repo-name` | Repository name | `my-repo` |

**Required Scopes for GitHub Token:**
- `repo` (for private repositories)
- `public_repo` (for public repositories)

### Feature Flags

| Property | Description | Default |
|----------|-------------|---------|
| `feature.persistence-enabled` | Enable/disable persistence | `false` |

---

## 📚 API Documentation

### Endpoint 1: Get Sprint Metrics

**GET** `/metrics`

Retrieves comprehensive metrics for a specific sprint.

#### Request

**Query Parameters:**
- `sprintId` (required, string) - Sprint identifier

**Example:**
```bash
curl "http://localhost:8080/metrics?sprintId=123"
```

#### Response

**Status:** `200 OK`

**Body:**
```json
{
  "sprintMetrics": {
    "sprintId": "123",
    "totalIssues": 45,
    "qaFailures": 3,
    "qaFailureRate": 6.67,
    "totalStories": 20,
    "deliveredStories": 18,
    "deliveredPercentage": 90.0,
    "velocity": 55.0,
    "committedStoryPoints": 60.0,
    "completionRate": 91.67,
    "totalBugs": 8,
    "p1Bugs": 1,
    "p2Bugs": 3,
    "p3Bugs": 3,
    "p4Bugs": 1,
    "bugDensity": 0.145,
    "averagePrApprovalHours": 4.5,
    "medianPrApprovalHours": 3.2
  },
  "developerMetrics": [
    {
      "developerName": "John Doe",
      "totalIssues": 12,
      "qaFailures": 1,
      "qaFailureRate": 8.33,
      "storyPointsDelivered": 21.0,
      "totalBugs": 2,
      "p1Bugs": 0,
      "p2Bugs": 1,
      "p3Bugs": 1,
      "p4Bugs": 0,
      "averagePrApprovalHours": 3.8
    }
  ]
}
```

### Endpoint 2: Get QA Trend

**GET** `/metrics/trend`

Analyzes QA failure rate trends over multiple sprints.

#### Request

**Query Parameters:**
- `lastNSprints` (required, integer) - Number of recent sprints to analyze (max: 10)

**Example:**
```bash
curl "http://localhost:8080/metrics/trend?lastNSprints=5"
```

#### Response

**Status:** `200 OK`

**Body:**
```json
{
  "trendDirection": "DOWN",
  "changePercentage": -8.5,
  "averageFailureRate": 7.2,
  "latestFailureRate": 4.5,
  "sprintQaData": [
    {"sprintId": "119", "failureRate": 13.0},
    {"sprintId": "120", "failureRate": 9.5},
    {"sprintId": "121", "failureRate": 6.8},
    {"sprintId": "122", "failureRate": 5.2},
    {"sprintId": "123", "failureRate": 4.5}
  ]
}
```

**Trend Direction:**
- `UP` - QA failure rate increased by >5%
- `DOWN` - QA failure rate decreased by >5%
- `STABLE` - QA failure rate changed by ≤5%

---

## 📊 Metrics Explained

### QA Failure Rate

**Definition:** Percentage of issues that failed QA testing.

**Formula:** `(qaFailures / totalIssues) × 100`

**Interpretation:**
- **< 5%** - Excellent quality
- **5-10%** - Good quality
- **10-20%** - Needs improvement
- **> 20%** - Critical quality issues

### Velocity

**Definition:** Total story points delivered (completed) in the sprint.

**Formula:** Sum of story points for all stories with status "Done"

### Bug Density

**Definition:** Ratio of bugs to velocity (bugs per story point).

**Formula:** `totalBugs / velocity`

**Interpretation:**
- **< 0.1** - Excellent code quality
- **0.1-0.2** - Good code quality
- **0.2-0.5** - Needs improvement
- **> 0.5** - Critical quality issues


## 🛠️ Development

### Building from Source

```bash
# Clean build
./gradlew clean build

# Build without tests
./gradlew clean build -x test

# Run tests only
./gradlew test
```

### Code Style

- **Indentation:** 4 spaces
- **Line Length:** 120 characters
- **Naming:** camelCase for methods/variables, PascalCase for classes
- **Lombok:** Use `@RequiredArgsConstructor` for dependency injection
- **Records:** Use for immutable DTOs

---

## 🧪 Testing

### Running Tests

```bash
# Run all tests
./gradlew test

# Run specific test class
./gradlew test --tests "MetricsCalculatorTest"
```

---

## 🚢 Deployment

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and run:

```bash
# Build the JAR
./gradlew clean build

# Build Docker image
docker build -t engineering-metrics-service .

# Run container
docker run -p 8080:8080 \
  -e JIRA_BASE_URL=https://mycompany.atlassian.net \
  -e JIRA_EMAIL=user@example.com \
  -e JIRA_API_TOKEN=xxxxx \
  -e JIRA_PROJECT_KEY=ABC \
  -e GITHUB_TOKEN=ghp_xxxxx \
  -e GITHUB_REPO_OWNER=mycompany \
  -e GITHUB_REPO_NAME=my-repo \
  engineering-metrics-service
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. "401 Unauthorized" from Jira

**Cause:** Invalid Jira credentials

**Solution:**
- Verify `jira.email` and `jira.api-token` in `application.yml`
- Ensure API token is valid (regenerate if needed)

#### 2. "404 Not Found" from Jira

**Cause:** Invalid sprint ID or project key

**Solution:**
- Verify sprint ID exists in Jira
- Check `jira.project-key` matches your Jira project

#### 3. "403 Forbidden" from GitHub

**Cause:** GitHub rate limit exceeded or invalid token

**Solution:**
- Check GitHub token has required scopes (`repo` or `public_repo`)
- Wait for rate limit to reset (5000 requests/hour)

#### 4. Incorrect Story Points

**Cause:** Wrong custom field ID

**Solution:**
- Find correct field ID in Jira (inspect issue JSON)
- Update `jira.story-points-field` in `application.yml`

### Debugging

Enable debug logging:

```yaml
logging:
  level:
    com.example.metrics: DEBUG
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

For questions or issues:

- **Documentation:** See [ENGINEERING_METRICS_SERVICE_SPEC.md](ai/ENGINEERING_METRICS_SERVICE_SPEC.md)
- **Issues:** Open an issue on GitHub

---

## 🙏 Acknowledgments

- **Spring Boot** - Application framework
- **Caffeine** - High-performance caching
- **Jira Cloud** - Issue tracking integration
- **GitHub** - Code review integration

---

**Built with ❤️ by the Engineering Team**

