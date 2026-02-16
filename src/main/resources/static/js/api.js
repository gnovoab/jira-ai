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

    async getSprintIssues(sprintName) {
        return await this.request(`/api/sprints/${encodeURIComponent(sprintName)}/issues`);
    },

    // Fix Version Endpoints
    async getAllFixVersions() {
        return await this.request('/api/fix-versions');
    },

    async getFixVersionById(versionName) {
        return await this.request(`/api/fix-versions/${encodeURIComponent(versionName)}`);
    },

    async getFixVersionIssues(versionName) {
        return await this.request(`/api/fix-versions/${encodeURIComponent(versionName)}/issues`);
    },

    // Debug Endpoints
    async getStatusTransitions(sprintId) {
        return await this.request(`/api/debug/qa/status-transitions/${sprintId}`);
    },

    async getQaFailures(sprintId, limit = 10) {
        return await this.request(`/api/debug/qa/qa-failures/${sprintId}?limit=${limit}`);
    },

    // Admin Endpoints
    async getAdminStatus() {
        return await this.request('/api/admin/status');
    },

    async refreshCache() {
        return await this.request('/api/admin/refresh', { method: 'POST' });
    },

    async importFile(formData) {
        const response = await fetch(`${this.baseUrl}/api/admin/import`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return await response.json();
    },

    // Jira Fetch Endpoints
    async deltaUpdate(credentials) {
        return await this.request('/api/admin/delta-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
    },

    async fetchNewSprints(credentials) {
        return await this.request('/api/admin/fetch-new', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
    }
};

