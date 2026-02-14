# Engineering Metrics Service

> A Spring Boot service that analyzes Jira sprint data to compute comprehensive engineering metrics for sprint-level and developer-level performance analysis.

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

The **Engineering Metrics Service** is a lightweight Spring Boot application designed to provide actionable insights into your team's engineering performance. Using file-based Jira data ingestion, it computes metrics such as:

- **QA Failure Rate** - Track quality issues
- **Velocity** - Measure story points delivered
- **Bug Density** - Assess code quality
- **Sprint Completion** - Monitor delivery performance
- **Issue Type Distribution** - Analyze work breakdown
- **QA Trends** - Historical quality analysis

### Key Characteristics

- ✅ **File-Based** - No API tokens required, uses browser session authentication
- ✅ **Sprint Master Database** - Single JSON file with complete sprint data
- ✅ **In-Memory** - Fast analysis with intelligent caching
- ✅ **On-Demand** - Metrics computed when requested
- ✅ **Clean Architecture** - Layered design for maintainability

---

## ✨ Features

### Sprint Metrics

- Total issues, stories, and bugs
- QA failure rate and count
- Completion percentage
- Issue type distribution (Story, Bug, Task, Sub-task)
- Sprint duration and dates
- Changelog analysis for QA failures

### Trend Analysis

- QA failure rate trends over multiple sprints
- Sprint-by-sprint comparison
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
- **Browser access to Jira** (for session authentication)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/engineering-metrics-service.git
cd engineering-metrics-service
```

### 2. Set Up Browser Session

Create `tools/.jira-session` with your browser cookies:

```bash
cd tools
cp .jira-session.template .jira-session
# Edit .jira-session with your browser cookies
```

See [Data Fetching Guide](docs/data-fetching/QUICK_REFERENCE.md) for details.

### 3. Fetch Sprint Data

```bash
cd tools
source .jira-session
./add-sprint.sh <sprintId>
```

### 4. Build and Run

```bash
# Build the project
./gradlew clean build

# Run the application
./gradlew bootRun
```

The service will start on `http://localhost:8080`.

### 5. Test the API

```bash
# Get all sprint summaries
curl "http://localhost:8080/api/sprints" | jq .

# Get QA analysis
curl "http://localhost:8080/api/test/qa-analysis/summary" | jq .
```

---

## ⚙️ Configuration

### Application Configuration

The application uses file-based data ingestion. No API tokens required!

Configuration in `src/main/resources/application.yml`:

```yaml
# File-based Jira data ingestion
# Data is loaded from jira-sprint-database.json in the tools/ directory
# No API tokens or external API calls required

feature:
  persistence-enabled: false
```

### Data Source

- **Primary**: `tools/jira-sprint-database.json` - Sprint Master Database
- **Fallback**: `tools/jira-export-*.json` - Individual export files

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

## 📚 Documentation

All documentation is organized in the `/docs` directory:

- **[Setup & Configuration](docs/setup/)** - Initial setup, Jira access, configuration
- **[Data Fetching](docs/data-fetching/)** - Sprint database, data fetching tools, update strategies
- **[Analysis & Results](docs/analysis/)** - QA metrics, sprint analysis, findings
- **[Archive](docs/archive/)** - Historical documentation

**Quick Links:**
- [Quick Reference](docs/data-fetching/QUICK_REFERENCE.md) - Common commands
- [Add Sprint Guide](docs/data-fetching/ADD_SPRINT_GUIDE.md) - How to add completed sprints
- [QA Analysis Results](docs/analysis/QA_ANALYSIS_FIXED_RESULTS.md) - Latest QA metrics

---

## 🙏 Acknowledgments

- **Spring Boot** - Application framework
- **Caffeine** - High-performance caching
- **Jira Cloud** - Issue tracking integration
- **GitHub** - Code review integration

---

**Built with ❤️ by the Engineering Team**

