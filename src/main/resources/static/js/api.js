// API Client for Engineering Metrics Service
const API = {
    baseUrl: window.location.origin,
    
    // Helper method for making API calls
    async request(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },
    
    // Health Check
    async getHealth() {
        return await this.request('/actuator/health');
    },
    
    // Sprint Analysis Endpoints
    async getAllSprints() {
        return await this.request('/api/sprints');
    },
    
    // QA Analysis Endpoints
    async getQaSummary() {
        return await this.request('/api/test/qa-analysis/summary');
    },
    
    async getTopFailures() {
        return await this.request('/api/test/qa-analysis/top-failures');
    },
    
    // Sprint Database Endpoints
    async getDatabaseStatus() {
        return await this.request('/api/test/sprint-database/status');
    },
    
    async getAllIssues() {
        return await this.request('/api/test/sprint-database/issues');
    },
    
    async getSprintById(sprintId) {
        return await this.request(`/api/test/sprint-database/sprint/${sprintId}`);
    },
    
    // Debug Endpoints
    async getStatusTransitions(sprintId) {
        return await this.request(`/api/debug/qa/status-transitions/${sprintId}`);
    },
    
    async getQaFailures(sprintId, limit = 10) {
        return await this.request(`/api/debug/qa/qa-failures/${sprintId}?limit=${limit}`);
    }
};

