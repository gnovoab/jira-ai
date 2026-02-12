package com.example.metrics.model.dto;

public record SprintQaData(
        String sprintId,
        double failureRate
) {
}
