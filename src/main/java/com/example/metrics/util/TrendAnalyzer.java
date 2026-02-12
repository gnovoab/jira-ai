package com.example.metrics.util;

import com.example.metrics.model.dto.QaTrendResponse;
import com.example.metrics.model.dto.SprintMetricsResponse;
import com.example.metrics.model.dto.SprintQaData;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class TrendAnalyzer {

    public QaTrendResponse analyze(
            List<SprintMetricsResponse> history) {

        if (history.isEmpty()) {
            return new QaTrendResponse("STABLE", 0.0, 0.0, 0.0, List.of());
        }

        double oldest = history.get(0).qaFailureRate();
        double latest = history.get(history.size() - 1).qaFailureRate();

        double change = latest - oldest;

        String direction;

        if (change > 5) {
            direction = "UP";
        } else if (change < -5) {
            direction = "DOWN";
        } else {
            direction = "STABLE";
        }

        double average = history.stream()
                .mapToDouble(SprintMetricsResponse::qaFailureRate)
                .average()
                .orElse(0.0);

        List<SprintQaData> sprintQaData = history.stream()
                .map(sprint -> new SprintQaData(sprint.sprintId(), sprint.qaFailureRate()))
                .collect(Collectors.toList());

        return new QaTrendResponse(
                direction,
                change,
                average,
                latest,
                sprintQaData
        );
    }

    public String determineTrend(double changePercentage) {
        if (changePercentage > 5) {
            return "UP";
        } else if (changePercentage < -5) {
            return "DOWN";
        } else {
            return "STABLE";
        }
    }
}

