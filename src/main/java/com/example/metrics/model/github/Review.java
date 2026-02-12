package com.example.metrics.model.github;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * GitHub Pull Request Review model.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Review {
    private String state;
    
    @JsonProperty("submitted_at")
    private String submittedAt;

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(String submittedAt) {
        this.submittedAt = submittedAt;
    }
}

