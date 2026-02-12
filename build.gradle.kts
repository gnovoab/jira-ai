plugins {
    java
    id("org.springframework.boot") version "3.4.2"
    id("io.spring.dependency-management") version "1.1.7"
    checkstyle
    id("com.github.spotbugs") version "6.0.26"
    jacoco
    id("net.ltgt.errorprone") version "4.1.0"
}

group = "com.example"
version = "0.0.1-SNAPSHOT"
description = "jira-ai"

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

configurations.all {
    resolutionStrategy {
        // Resolve Guava/google-collections conflict
        force("com.google.guava:guava:33.3.1-jre")
        eachDependency {
            if (requested.group == "com.google.collections" && requested.name == "google-collections") {
                useTarget("com.google.guava:guava:33.3.1-jre")
                because("google-collections is deprecated and replaced by guava")
            }
        }
    }
}

dependencies {
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.retry:spring-retry")
    implementation("org.springframework:spring-aspects")
    implementation("com.github.ben-manes.caffeine:caffeine")
    implementation("com.fasterxml.jackson.core:jackson-databind")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.7.0")
    implementation("io.micrometer:micrometer-registry-prometheus")

    compileOnly("org.projectlombok:lombok:1.18.40")
    annotationProcessor("org.projectlombok:lombok:1.18.40")

    // Error Prone
    errorprone("com.google.errorprone:error_prone_core:2.35.1")

    // SpotBugs annotations
    compileOnly("com.github.spotbugs:spotbugs-annotations:4.8.6")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.mockito:mockito-core")
    testImplementation("org.mockito:mockito-junit-jupiter")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.named<Test>("test") {
    useJUnitPlatform()
    finalizedBy(tasks.jacocoTestReport) // Generate coverage report after tests
}

// ============================================
// Checkstyle Configuration
// ============================================
checkstyle {
    toolVersion = "10.12.5"
    configFile = file("${rootDir}/config/checkstyle/checkstyle.xml")
    isIgnoreFailures = false
    maxWarnings = 0
}

tasks.withType<Checkstyle> {
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}

// ============================================
// SpotBugs Configuration
// ============================================
spotbugs {
    toolVersion.set("4.8.6")
    effort.set(com.github.spotbugs.snom.Effort.MAX)
    reportLevel.set(com.github.spotbugs.snom.Confidence.MEDIUM) // Ignore low-priority warnings
    ignoreFailures.set(false)
    excludeFilter.set(file("${rootDir}/config/spotbugs/spotbugs-exclude.xml"))
}

tasks.withType<com.github.spotbugs.snom.SpotBugsTask> {
    reports.create("html") {
        required.set(true)
        outputLocation.set(file("${layout.buildDirectory.get()}/reports/spotbugs/spotbugs.html"))
    }
    reports.create("xml") {
        required.set(true)
    }
}

// ============================================
// JaCoCo Configuration
// ============================================
jacoco {
    toolVersion = "0.8.12"
}

tasks.jacocoTestReport {
    dependsOn(tasks.test)
    reports {
        xml.required.set(true)
        html.required.set(true)
        csv.required.set(false)
    }
}

tasks.jacocoTestCoverageVerification {
    violationRules {
        rule {
            limit {
                minimum = "0.30".toBigDecimal() // 30% coverage threshold (realistic for current state)
            }
        }
    }
}

tasks.check {
    dependsOn(tasks.jacocoTestCoverageVerification)
}

// ============================================
// Error Prone Configuration
// ============================================
// Error Prone is automatically applied by the plugin
// Additional configuration can be added here if needed
