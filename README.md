# Engineering Metrics Service

> A Spring Boot service with a modern web UI that analyzes Jira sprint data to compute comprehensive engineering metrics for sprint-level and developer-level performance analysis.

[![Java](https://img.shields.io/badge/Java-21+-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.2-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![Gradle](https://img.shields.io/badge/Gradle-9.3.0-blue.svg)](https://gradle.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Web UI](#-web-ui)
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

The **Engineering Metrics Service** is a Spring Boot application with a modern web dashboard designed to provide actionable insights into your team's engineering performance. Using file-based Jira data ingestion, it computes metrics such as:

- **QA Failure Rate** - Track quality issues
- **Velocity** - Measure story points delivered
- **Bug Density** - Assess code quality
- **Sprint Completion** - Monitor delivery performance
- **Issue Type Distribution** - Analyze work breakdown
- **QA Trends** - Historical quality analysis
- **Team Member Performance** - Cards assigned and delivered per developer

### Key Characteristics

- ✅ **Modern Web UI** - Interactive dashboard with charts and modals
- ✅ **File-Based** - No API tokens required, uses browser session authentication
- ✅ **Sprint Master Database** - Single JSON file with complete sprint data (10 sprints, 484 issues)
- ✅ **In-Memory** - Fast analysis with intelligent caching
- ✅ **On-Demand** - Metrics computed when requested
- ✅ **Clean Architecture** - Layered design for maintainability

---

## ✨ Features

### Sprint Metrics

- Total issues, stories, bugs, tasks, and sub-tasks
- QA failure rate and count
- Completion percentage (Dev and QA delivery rates)
- Issue type distribution with stacked charts
- Sprint duration and dates
- Changelog analysis for QA failures

### Trend Analysis

- QA failure rate trends over multiple sprints
- Sprint-by-sprint comparison
- Historical sprint data visualization
- Team member performance trends

### Interactive Features

- Clickable charts with drill-down modals
- Search, filter, and sort on issue tables
- Jira links for all issues
- Sprint and Fix Version grouping

---

## 🖥️ Web UI

The application includes a modern single-page application (SPA) built with:
- **Tailwind CSS** - Utility-first styling
- **Chart.js** - Interactive charts
- **Font Awesome** - Icons

### Pages

| Page | Description |
|------|-------------|
| **Dashboard** | Overview with charts carousel (8 charts), Sprint Summary with clickable cards |
| **Sprint Overview** | Detailed sprint metrics, issue breakdown, work distribution by team member |
| **Fix Versions** | Metrics grouped by release version (2.40, 2.41, etc.) |
| **Sprints** | Sprint list with comparison features |
| **QA Analysis** | QA failure analysis and trends |
| **Trends** | Historical performance trends |
| **Database** | Sprint database status, Jira fetch with session credentials |
| **Debug Tools** | Advanced debugging and data inspection |

### Dashboard Features

- **Charts Carousel** (4 slides, 8 charts):
  - Total Cards in Sprint (stacked by type) - Clickable!
  - Cards Delivered per Sprint
  - Sprint Completion Rate
  - QA Failure Trend
  - Bug Count per Sprint
  - Dev vs QA Delivery Rate
  - Cards Assigned per Team Member
  - Cards Delivered per Team Member

- **Sprint Summary** (clickable cards):
  - Total Delivered → Shows delivered cards with Jira links
  - Completion Rate → Shows completed (green) and pending (pulse animation) cards
  - QA Failure Rate → Shows QA failed cards
  - Total Bugs → Shows all bugs

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Web Browser (SPA)                        │
│  Dashboard │ Sprint Overview │ Fix Versions │ Database      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    REST Controllers                          │
│  SprintAnalysisController │ FixVersionController │ Admin    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     Service Layer                            │
│  SprintAnalysisService │ FixVersionAnalysisService          │
│  JiraFetchService │ DataImportService                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Sprint Master Database (JSON)                   │
│              tools/jira-sprint-database.json                 │
│              10 sprints │ 484 issues                         │
└─────────────────────────────────────────────────────────────┘
```

### Layers

1. **Web UI** - Single-page application (Tailwind CSS, Chart.js)
2. **Controller** - REST endpoints for sprints, fix versions, admin
3. **Service** - Business logic, analysis, and data processing
4. **Data** - File-based JSON database with sprint data

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

The service runs on `http://localhost:8081` by default.

### Sprint Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sprints` | GET | Get all sprint summaries |
| `/api/sprints/{sprintName}/issues` | GET | Get all issues for a sprint |

### Fix Version Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/fix-versions` | GET | Get all fix version summaries |
| `/api/fix-versions/{version}/issues` | GET | Get all issues for a fix version |

### QA Analysis Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/test/qa-analysis/summary` | GET | Get QA analysis summary |
| `/api/test/sprint-database/status` | GET | Get database status |

### Admin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/fetch` | POST | Fetch data from Jira using session credentials |
| `/api/admin/status` | GET | Get database and fetch status |

### Example: Get All Sprints

```bash
curl "http://localhost:8081/api/sprints" | jq .
```

**Response:**
```json
[
  {
    "sprintName": "Calandria Sprint 8",
    "sprintId": "82346",
    "startDate": "2026-02-09T11:26:12.151Z",
    "endDate": "2026-02-23T11:26:12.151Z",
    "totalIssues": 52,
    "completedIssues": 28,
    "completionPercentage": 53.8,
    "totalStories": 15,
    "totalBugs": 12,
    "totalTasks": 8,
    "qaFailed": 5,
    "qaFailureRatio": 9.6,
    "devDeliveryPercentage": 65.4,
    "qaDeliveryPercentage": 53.8
  }
]
```

### Example: Get Sprint Issues

```bash
curl "http://localhost:8081/api/sprints/Calandria%20Sprint%208/issues" | jq .
```

**Response:**
```json
[
  {
    "key": "CAL-1234",
    "summary": "Implement user authentication",
    "issueType": "Story",
    "status": "Done",
    "priority": "High",
    "assignee": "John Doe",
    "devDelivered": true,
    "qaDelivered": true
  }
]
```

### Legacy Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/metrics?sprintId={id}` | GET | Get sprint metrics (legacy) |
| `/metrics/trend?lastNSprints={n}` | GET | Get QA trend analysis (legacy)

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
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY build/libs/*.jar app.jar
COPY tools/jira-sprint-database.json tools/
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Build and run:

```bash
# Build the JAR
./gradlew clean build

# Build Docker image
docker build -t engineering-metrics-service .

# Run container
docker run -p 8081:8081 engineering-metrics-service
```

Access the dashboard at `http://localhost:8081`

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Page shows "Total Issues undefined"

**Cause:** Data not loaded properly

**Solution:**
- Ensure `tools/jira-sprint-database.json` exists and contains valid data
- Check browser console for API errors
- Hard refresh the page (Cmd+Shift+R)

#### 2. Charts not rendering

**Cause:** Chart.js not loaded or data format issue

**Solution:**
- Check browser console for JavaScript errors
- Verify the API returns valid JSON data
- Clear browser cache and reload

#### 3. Jira fetch fails with 401

**Cause:** Session cookies expired

**Solution:**
- Get fresh cookies from browser DevTools
- Update JSESSIONID, account XSRF token, and tenant session token
- Use the Database page to enter new credentials

#### 4. Server won't start

**Cause:** Port 8081 already in use

**Solution:**
```bash
# Find process using port 8081
lsof -i :8081

# Kill the process
kill -9 <PID>

# Or change port in application.yml
server:
  port: 8082
```

### Debugging

Enable debug logging:

```yaml
logging:
  level:
    com.example.metrics: DEBUG
```

---

## 📄 License

This project is licensed under the MIT License.

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

- **Spring Boot 3.4.2** - Application framework
- **Tailwind CSS** - UI styling
- **Chart.js** - Interactive charts
- **Font Awesome** - Icons
- **Caffeine** - High-performance caching

---

**Built with ❤️ by the Engineering Team**

**Last Updated:** 2026-02-16

