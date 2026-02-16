# Engineering Metrics Service Specification

**Version:** 1.0
**Last Updated:** 2026-02-12
**Status:** Implementation Complete

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Build Configuration](#3-build-configuration)
4. [Application Configuration](#4-application-configuration)
5. [REST API Endpoints](#5-rest-api-endpoints)
6. [Metrics Definitions](#6-metrics-definitions)
7. [Project Structure](#7-project-structure)
8. [Caching Strategy](#8-caching-strategy)
9. [External Integrations](#9-external-integrations)
10. [Data Models](#10-data-models)
11. [Feature Flags](#11-feature-flags)
12. [Non-Functional Requirements](#12-non-functional-requirements)

---

## 1. Project Overview

### Purpose

Build a **Spring Boot (Java 17+) service** that integrates with Jira Cloud and GitHub to compute comprehensive engineering metrics for sprint-level and developer-level performance analysis.

### Key Features

- **On-demand metrics computation** via REST API
- **No database persistence** (in-memory only by default)
- **Intelligent caching** using Caffeine
- **Feature flag** for optional persistence
- **Clean architecture** with separation of concerns

### Integrations

- **Jira Cloud REST API v3** - Sprint and issue data
- **GitHub REST API** - Pull request and review data

### Design Constraints

- ✅ No database dependencies
- ✅ In-memory caching required (Caffeine)
- ✅ Feature flag for persistence (disabled by default)
- ✅ Single Jira project support
- ✅ RESTful API design
- ✅ Layered architecture (Controller → Service → Calculator → External APIs)

---

## 2. Technology Stack

### Core Framework

- **Spring Boot:** 3.4.2
- **Java:** 17+ (compiled with Java 25)
- **Build Tool:** Gradle 9.3.0 (Kotlin DSL)

### Dependencies

| Dependency | Purpose |
|------------|---------|
| `spring-boot-starter-web` | REST API and web layer |
| `spring-boot-starter-cache` | Caching abstraction |
| `caffeine` | High-performance in-memory cache |
| `jackson-databind` | JSON serialization/deserialization |
| `lombok` | Reduce boilerplate code |
| `spring-boot-starter-test` | Testing framework |

### No Database

This service intentionally **does not use** any database. All data is:
- Fetched on-demand from Jira and GitHub APIs
- Cached in-memory using Caffeine
- Optionally persisted via feature flag (custom implementation required)

---

## 3. Build Configuration

### Gradle Build File (`build.gradle.kts`)

```kotlin
plugins {
    java
    id("org.springframework.boot") version "3.4.2"
    id("io.spring.dependency-management") version "1.1.7"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("com.fasterxml.jackson.core:jackson-databind")

    compileOnly("org.projectlombok:lombok:1.18.40")
    annotationProcessor("org.projectlombok:lombok:1.18.40")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.named<Test>("test") {
    useJUnitPlatform()
}
```

---

## 4. Application Configuration

### Configuration File (`application.yml`)

```yaml
jira:
  base-url: https://your-domain.atlassian.net
  email: your-email@example.com
  api-token: your-jira-api-token
  project-key: ABC
  story-points-field: customfield_10016

github:
  token: your-github-personal-access-token
  repo-owner: your-organization
  repo-name: your-repository

feature:
  persistence-enabled: false
```

### Configuration Properties

#### Jira Configuration (`JiraProperties`)

- `base-url`: Jira Cloud instance URL
- `email`: User email for Basic Auth
- `api-token`: API token for authentication
- `project-key`: Jira project key (e.g., "ABC")
- `story-points-field`: Custom field ID for story points (e.g., "customfield_10016")

#### GitHub Configuration (`GitHubProperties`)

- `token`: GitHub Personal Access Token
- `repo-owner`: GitHub organization or user
- `repo-name`: Repository name

#### Feature Flags

- `persistence-enabled`: Enable/disable persistence (default: `false`)

---

## 5. REST API Endpoints

### 5.1 Get Sprint Metrics

**Endpoint:** `GET /metrics`

**Query Parameters:**
- `sprintId` (required): Sprint identifier

**Response:** `ExtendedSprintMetricsResponse` (JSON)

**Example:**
```bash
curl "http://localhost:8080/metrics?sprintId=123"
```

**Response Structure:**
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
  "developerMetrics": [...]
}
```


### 5.2 Get QA Trend

**Endpoint:** `GET /metrics/trend`

**Query Parameters:**
- `lastNSprints` (required): Number of recent sprints to analyze

**Response:** `QaTrendResponse` (JSON)

**Example:**
```bash
curl "http://localhost:8080/metrics/trend?lastNSprints=5"
```

**Response Structure:**
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

---

## 6. Metrics Definitions

### 6.1 QA Failure Rate

**Definition:** Percentage of issues that failed QA testing during the sprint.

**Calculation:**
1. Count issues where changelog contains transition: `QA` → `QA Failed`
2. Count each issue **only once** (ignore repeated failures)
3. Formula: `(qaFailures / totalIssues) * 100`

**Implementation:**
- Parse `issue.changelog.histories` for status transitions
- Check for `field = "status"`, `fromString = "QA"`, `toString = "QA Failed"`

### 6.2 Velocity

**Definition:** Total story points delivered (completed) in the sprint.

**Calculation:**
- Sum of story points for all issues where:
  - `issue.fields.issuetype.name = "Story"`
  - `issue.fields.status.name = "Done"`
- Story points extracted from custom field (e.g., `customfield_10016`)

### 6.3 Story Delivery Percentage

**Definition:** Percentage of stories successfully delivered.

**Formula:**
```
deliveredPercentage = (deliveredStories / totalStories) * 100
```

Where:
- `deliveredStories` = Stories with status "Done"
- `totalStories` = All stories in the sprint

### 6.4 PR Approval Time

**Definition:** Average and median time from PR creation to first approval.

**Calculation:**
1. Fetch all PRs from GitHub for the repository
2. Match PR to Jira issue via regex `[A-Z]+-\d+` in PR title
3. For each PR, get reviews and find first `APPROVED` review
4. Calculate: `approvalTime = approved_at - created_at` (in hours)
5. Compute average and median across all PRs

**Edge Cases:**
- Ignore PRs without approval
- Ignore PRs that don't match Jira issue pattern

### 6.5 Bugs Per Sprint

**Definition:** Total number of bugs in the sprint.

**Calculation:**
- Count issues where `issue.fields.issuetype.name = "Bug"`

### 6.6 Priority Breakdown

**Definition:** Distribution of bugs by priority level.

**Mapping:**
- `P1` = `issue.fields.priority.name = "Highest"`
- `P2` = `issue.fields.priority.name = "High"`
- `P3` = `issue.fields.priority.name = "Medium"`
- `P4` = `issue.fields.priority.name = "Low"`

**Output:** Count of bugs for each priority level (P1, P2, P3, P4)

### 6.7 Bug Density

**Definition:** Ratio of bugs to velocity (bugs per story point).

**Formula:**
```
bugDensity = totalBugs / velocity
```

**Interpretation:**
- Lower is better
- Indicates code quality relative to work delivered

### 6.8 QA Trend Analysis

**Definition:** Trend direction of QA failure rate over multiple sprints.

**Calculation:**
1. Fetch QA failure rates for last N sprints
2. Compare oldest vs. latest: `change = latest - oldest`
3. Determine trend:
   - `UP` if change > 5%
   - `DOWN` if change < -5%
   - `STABLE` otherwise

### 6.9 Developer Metrics

**Definition:** Per-developer performance metrics.

**Grouping:** By `issue.fields.assignee.displayName`

**Metrics per Developer:**
- `totalIssues`: Total issues assigned
- `qaFailures`: Issues that failed QA
- `qaFailureRate`: Percentage of issues that failed QA
- `storyPointsDelivered`: Total story points completed
- `totalBugs`: Total bugs assigned
- `p1Bugs`, `p2Bugs`, `p3Bugs`, `p4Bugs`: Bug priority breakdown
- `averagePrApprovalHours`: Average PR approval time for developer's PRs

---

## 7. Project Structure

```
com.example.metrics/
├── MetricsApplication.java              # Spring Boot main class
│
├── config/
│   ├── CacheConfig.java                 # Caffeine cache configuration
│   ├── WebClientConfig.java             # RestClient beans for Jira/GitHub
│   ├── JiraProperties.java              # @ConfigurationProperties for Jira
│   └── GitHubProperties.java            # @ConfigurationProperties for GitHub
│
├── controller/
│   └── MetricsController.java           # REST endpoints
│
├── service/
│   ├── SprintMetricsService.java        # Interface for sprint metrics
│   ├── DefaultSprintMetricsService.java # Implementation with caching
│   ├── TrendService.java                # Interface for trend analysis
│   ├── DefaultTrendService.java         # Implementation with caching
│   ├── DeveloperMetricsService.java     # Developer metrics computation
│   ├── JiraService.java                 # Jira API integration
│   └── GitHubService.java               # GitHub API integration
│
├── calculator/
│   └── MetricsCalculator.java           # Core metrics calculation logic
│
├── model/
│   ├── dto/
│   │   ├── SprintMetricsResponse.java   # Sprint-level metrics DTO (record)
│   │   ├── ExtendedSprintMetricsResponse.java  # Full response DTO (record)
│   │   ├── DeveloperMetrics.java        # Developer metrics DTO (record)
│   │   ├── QaTrendResponse.java         # Trend analysis DTO (record)
│   │   └── SprintQaData.java            # Sprint QA data point (record)
│   │
│   └── jira/
│       ├── Issue.java                   # Jira issue model
│       ├── Fields.java                  # Issue fields
│       ├── Changelog.java               # Issue changelog
│       ├── History.java                 # Changelog history entry
│       └── Item.java                    # History item (field change)
│
├── persistence/
│   ├── MetricsPersistence.java          # Persistence interface
│   └── NoOpMetricsPersistence.java      # No-op implementation (default)
│
└── util/
    └── TrendAnalyzer.java               # Trend analysis utilities
```

### Architecture Layers

1. **Controller Layer** - REST API endpoints
2. **Service Layer** - Business logic and orchestration
3. **Calculator Layer** - Pure computation logic
4. **Integration Layer** - External API calls (Jira, GitHub)
5. **Model Layer** - Data transfer objects and domain models

---


## 8. Caching Strategy

### Cache Configuration

**Implementation:** Caffeine (high-performance in-memory cache)

**Configuration:**
```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCacheNames(List.of("sprintMetrics", "qaTrend"));
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(Duration.ofMinutes(10))
                .maximumSize(100));
        return cacheManager;
    }
}
```

### Cache Parameters

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| **TTL** | 10 minutes | Balance between freshness and API call reduction |
| **Max Size** | 100 entries | Sufficient for typical usage patterns |
| **Eviction Policy** | LRU (Least Recently Used) | Automatic via Caffeine |

### Cached Methods

#### Sprint Metrics Cache

```java
@Cacheable(value = "sprintMetrics", key = "#sprintId")
public ExtendedSprintMetricsResponse getExtendedMetrics(String sprintId)
```

**Cache Key:** Sprint ID
**Invalidation:** Automatic after 10 minutes

#### QA Trend Cache

```java
@Cacheable(value = "qaTrend", key = "#lastNSprints")
public QaTrendResponse getTrend(int lastNSprints)
```

**Cache Key:** Number of sprints
**Invalidation:** Automatic after 10 minutes

### Cache Benefits

- ✅ Reduces API calls to Jira and GitHub
- ✅ Improves response time for repeated requests
- ✅ Prevents rate limiting issues
- ✅ No external dependencies (in-memory)

---

## 9. External Integrations

### 9.1 Jira Cloud Integration

#### Authentication

**Method:** HTTP Basic Authentication
**Credentials:** Email + API Token

```java
RestClient.builder()
    .baseUrl(jiraProperties.baseUrl())
    .defaultHeaders(headers -> headers.setBasicAuth(
        jiraProperties.email(),
        jiraProperties.apiToken()))
    .build();
```

#### API Endpoint

**URL:** `GET /rest/api/3/search`

**Query Parameters:**
- `jql`: JQL query string (e.g., `project = ABC AND sprint = 123`)
- `expand`: `changelog` (required for QA failure detection)
- `maxResults`: Pagination size (default: 50)
- `startAt`: Pagination offset

**Example Request:**
```
GET https://your-domain.atlassian.net/rest/api/3/search?jql=project=ABC AND sprint=123&expand=changelog
```

#### Response Parsing

Extract the following fields:

| Field Path | Usage |
|------------|-------|
| `issue.fields.assignee.displayName` | Developer grouping |
| `issue.fields.issuetype.name` | Issue type (Story, Bug, etc.) |
| `issue.fields.priority.name` | Bug priority (Highest, High, Medium, Low) |
| `issue.fields.status.name` | Issue status (Done, In Progress, etc.) |
| `issue.fields.customfield_XXXXX` | Story points (configurable field) |
| `issue.changelog.histories` | Status transitions for QA failures |

#### Pagination Handling

- Jira returns max 50-100 issues per request
- Implement pagination for sprints with >50 issues
- Use `startAt` parameter to fetch subsequent pages

#### Error Handling

- **401 Unauthorized:** Invalid credentials
- **404 Not Found:** Invalid sprint ID or project key
- **429 Too Many Requests:** Rate limiting (implement retry with backoff)

### 9.2 GitHub Integration

#### Authentication

**Method:** Bearer Token (Personal Access Token)

```java
RestClient.builder()
    .baseUrl("https://api.github.com")
    .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + gitHubProperties.token())
    .build();
```

#### API Endpoints

##### 1. List Pull Requests

**URL:** `GET /repos/{owner}/{repo}/pulls`

**Query Parameters:**
- `state`: `all` (include open and closed PRs)
- `per_page`: Pagination size (max: 100)
- `page`: Page number

**Example:**
```
GET https://api.github.com/repos/your-org/your-repo/pulls?state=all&per_page=100
```

##### 2. Get PR Reviews

**URL:** `GET /repos/{owner}/{repo}/pulls/{number}/reviews`

**Example:**
```
GET https://api.github.com/repos/your-org/your-repo/pulls/42/reviews
```

#### PR to Jira Matching

**Regex Pattern:** `[A-Z]+-\d+`

**Example PR Titles:**
- ✅ `ABC-123: Add new feature` → Matches `ABC-123`
- ✅ `Fix bug ABC-456` → Matches `ABC-456`
- ❌ `Update README` → No match (ignored)

#### Approval Time Calculation

1. Extract `created_at` from PR
2. Find first review with `state = "APPROVED"`
3. Extract `submitted_at` from approved review
4. Calculate: `approvalHours = (submitted_at - created_at) / 3600`

#### Error Handling

- **401 Unauthorized:** Invalid token
- **403 Forbidden:** Rate limit exceeded (5000 requests/hour)
- **404 Not Found:** Repository not found
- Implement exponential backoff for rate limiting

---

## 10. Data Models

### 10.1 Response DTOs (Records)

#### ExtendedSprintMetricsResponse

```java
public record ExtendedSprintMetricsResponse(
    SprintMetricsResponse sprintMetrics,
    List<DeveloperMetrics> developerMetrics
) {}
```

#### SprintMetricsResponse

```java
public record SprintMetricsResponse(
    String sprintId,
    int totalIssues,
    int qaFailures,
    double qaFailureRate,
    int totalStories,
    int deliveredStories,
    double deliveredPercentage,
    double velocity,
    double committedStoryPoints,
    double completionRate,
    int totalBugs,
    int p1Bugs,
    int p2Bugs,
    int p3Bugs,
    int p4Bugs,
    double bugDensity,
    double averagePrApprovalHours,
    double medianPrApprovalHours
) {}
```


#### DeveloperMetrics

```java
public record DeveloperMetrics(
    String developerName,
    int totalIssues,
    int qaFailures,
    double qaFailureRate,
    double storyPointsDelivered,
    int totalBugs,
    int p1Bugs,
    int p2Bugs,
    int p3Bugs,
    int p4Bugs,
    double averagePrApprovalHours
) {}
```

#### QaTrendResponse

```java
public record QaTrendResponse(
    String trendDirection,        // "UP", "DOWN", or "STABLE"
    double changePercentage,
    double averageFailureRate,
    double latestFailureRate,
    List<SprintQaData> sprintQaData
) {}
```

#### SprintQaData

```java
public record SprintQaData(
    String sprintId,
    double failureRate
) {}
```

### 10.2 Jira Domain Models

#### Issue

```java
public class Issue {
    private String id;
    private String key;
    private Fields fields;
    private Changelog changelog;
    // getters/setters
}
```

#### Fields

```java
public class Fields {
    private IssueType issuetype;
    private Status status;
    private Priority priority;
    private User assignee;
    private Map<String, Object> customFields;

    public Object getCustomField(String fieldName) {
        return customFields.get(fieldName);
    }
    // getters/setters
}
```

#### Changelog

```java
public class Changelog {
    private List<History> histories;
    // getters/setters
}
```

#### History

```java
public class History {
    private String created;
    private List<Item> items;
    // getters/setters
}
```

#### Item

```java
public class Item {
    private String field;
    private String fromString;
    private String toString;
    // getters/setters
}
```

---

## 11. Feature Flags

### 11.1 Persistence Feature Flag

**Purpose:** Enable/disable persistence of metrics data.

**Configuration:**
```yaml
feature:
  persistence-enabled: false  # Default: disabled
```

### 11.2 Implementation

#### Interface

```java
public interface MetricsPersistence {
    void save(ExtendedSprintMetricsResponse response);
}
```

#### No-Op Implementation (Default)

```java
@Service
@ConditionalOnProperty(
    name = "feature.persistence-enabled",
    havingValue = "false",
    matchIfMissing = true
)
public class NoOpMetricsPersistence implements MetricsPersistence {
    @Override
    public void save(ExtendedSprintMetricsResponse response) {
        // No-op: do nothing
    }
}
```

#### Custom Implementation (Optional)

To enable persistence:

1. Set `feature.persistence-enabled: true` in `application.yml`
2. Create a custom implementation:

```java
@Service
@ConditionalOnProperty(
    name = "feature.persistence-enabled",
    havingValue = "true"
)
public class DatabaseMetricsPersistence implements MetricsPersistence {
    @Override
    public void save(ExtendedSprintMetricsResponse response) {
        // Custom persistence logic (e.g., save to database, file, etc.)
    }
}
```

---

## 12. Non-Functional Requirements

### 12.1 Performance

| Requirement | Target | Notes |
|-------------|--------|-------|
| **Response Time** | < 2 seconds | For cached requests |
| **Response Time** | < 10 seconds | For uncached requests (first call) |
| **Sprint Size** | 50-200 issues | Typical sprint size |
| **Trend Analysis** | Up to 10 sprints | Maximum sprints for trend |
| **Concurrent Requests** | 10-50 | Typical load |

### 12.2 Scalability

- **Horizontal Scaling:** Stateless design allows multiple instances
- **Cache:** In-memory cache per instance (no shared cache)
- **API Rate Limits:**
  - Jira Cloud: ~100 requests/minute
  - GitHub: 5000 requests/hour (authenticated)

### 12.3 Reliability

#### Error Handling

- **Graceful Degradation:** If GitHub API fails, return metrics without PR data
- **Retry Logic:** Implement exponential backoff for transient failures
- **Logging:** Log all API errors with context

#### Fault Tolerance

- **Circuit Breaker:** Consider implementing for external API calls
- **Timeouts:** Set reasonable timeouts for HTTP requests (30 seconds)
- **Fallback:** Return partial data if some calculations fail

### 12.4 Security

- **Credentials:** Store API tokens in environment variables or secrets manager
- **HTTPS:** All external API calls use HTTPS
- **Authentication:** Basic Auth for Jira, Bearer Token for GitHub
- **No Sensitive Data:** Do not log API tokens or credentials

### 12.5 Observability

#### Logging

- **Level:** INFO for normal operations, ERROR for failures
- **Context:** Include sprint ID, developer name, API endpoint in logs
- **Format:** Structured logging (JSON) recommended

#### Metrics (Future Enhancement)

- API call duration
- Cache hit/miss ratio
- Error rates by API
- Request counts by endpoint

### 12.6 Maintainability

- **Clean Architecture:** Separation of concerns (Controller → Service → Calculator)
- **Testability:** Pure functions in Calculator layer
- **Documentation:** Inline comments for complex logic
- **Code Style:** Follow Java conventions, use Lombok to reduce boilerplate

---

## 13. Implementation Status

### ✅ Completed

#### Core Infrastructure
- [x] Project structure and architecture
- [x] Gradle build configuration (Kotlin DSL)
- [x] Spring Boot 3.4.2 setup with Java 21
- [x] Caffeine cache configuration
- [x] Data models (DTOs as records, Jira models)
- [x] Feature flag for persistence
- [x] Lombok integration for cleaner code

#### Data Layer
- [x] Sprint Master Database (`tools/jira-sprint-database.json`)
- [x] File-based data ingestion (no API tokens required)
- [x] DataImportService for JSON parsing
- [x] SprintAnalysisService for metrics calculation
- [x] FixVersionAnalysisService for release grouping
- [x] JiraFetchService for session-based data fetching

#### REST API
- [x] SprintAnalysisController (`/api/sprints`, `/api/sprints/{name}/issues`)
- [x] FixVersionController (`/api/fix-versions`, `/api/fix-versions/{version}/issues`)
- [x] AdminController (`/api/admin/fetch`, `/api/admin/status`)
- [x] QaAnalysisTestController (`/api/test/qa-analysis/summary`)
- [x] SprintDatabaseTestController (`/api/test/sprint-database/status`)

#### Web UI (Single Page Application)
- [x] Dashboard with charts carousel (8 charts, 4 slides)
- [x] Sprint Overview page with issue breakdown
- [x] Fix Versions page with release metrics
- [x] Sprints page with comparison features
- [x] QA Analysis page with failure trends
- [x] Trends page with historical data
- [x] Database page with Jira fetch functionality
- [x] Debug Tools page for data inspection

#### Interactive Features
- [x] Clickable charts with drill-down modals
- [x] Sprint Summary with clickable stat cards
- [x] Search, filter, and sort on issue tables
- [x] Jira links for all issues
- [x] Team member performance charts

### 🚧 Future Enhancements

- [ ] **GitHub Integration** - PR approval hours tracking
- [ ] **Velocity Tracking** - Story points analysis
- [ ] **Export Features** - PDF/Excel reports
- [ ] **Notifications** - Slack/email alerts for metrics thresholds
- [ ] **Historical Comparison** - Sprint-over-sprint trend analysis

---

## 14. Getting Started

### Prerequisites

- Java 21 or higher
- Gradle 9.3.0 or higher
- Browser access to Jira (for session authentication)

### Quick Start

1. **Build the project:**

```bash
./gradlew clean build
```

2. **Run the application:**

```bash
./gradlew bootRun
```

3. **Open the dashboard:**

```
http://localhost:8081
```

### Data Setup

The application uses file-based data from `tools/jira-sprint-database.json`. To update data:

1. Use the **Database** page in the UI to fetch fresh data from Jira
2. Or use the CLI tools in the `tools/` directory

---

## 15. Current State Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Web UI | ✅ Complete | 8 pages, interactive charts |
| Sprint API | ✅ Complete | Full CRUD operations |
| Fix Version API | ✅ Complete | Grouped by release |
| Data Import | ✅ Complete | JSON file-based |
| Jira Fetch | ✅ Complete | Session-based auth |
| Dashboard | ✅ Complete | 8 charts, clickable modals |
| QA Analysis | ✅ Complete | Failure tracking |

**Database:** 10 sprints, 484 issues
**Server Port:** 8081
**Last Updated:** 2026-02-16

---

**End of Specification**