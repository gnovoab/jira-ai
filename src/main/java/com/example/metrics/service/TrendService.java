package com.example.metrics.service;

import com.example.metrics.model.dto.QaTrendResponse;

public interface TrendService {
    QaTrendResponse getTrend(int lastNSprints);
}
