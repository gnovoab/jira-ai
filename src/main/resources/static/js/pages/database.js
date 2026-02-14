// Database Page
const Database = {
    async render(container) {
        try {
            const [dbStatus, issuesResponse] = await Promise.all([
                API.getDatabaseStatus(),
                API.getAllIssues()
            ]);

            // Extract sample issue keys from the response
            const sampleKeys = issuesResponse.sampleIssueKeys || [];

            const html = `
                <!-- Database Status -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900">Database Status</h3>
                        <span class="badge ${dbStatus.available ? 'badge-success' : 'badge-danger'}">
                            <i class="fas fa-circle mr-1"></i>
                            ${dbStatus.available ? 'Available' : 'Unavailable'}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="p-4 bg-blue-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-blue-600 mb-1">Total Issues</p>
                                    <p class="text-3xl font-bold text-blue-900">${dbStatus.totalIssues}</p>
                                </div>
                                <i class="fas fa-tasks text-blue-600 text-3xl"></i>
                            </div>
                        </div>

                        <div class="p-4 bg-green-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-green-600 mb-1">Total Sprints</p>
                                    <p class="text-3xl font-bold text-green-900">${dbStatus.totalSprints}</p>
                                </div>
                                <i class="fas fa-running text-green-600 text-3xl"></i>
                            </div>
                        </div>

                        <div class="p-4 bg-purple-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-purple-600 mb-1">Data Source</p>
                                    <p class="text-lg font-bold text-purple-900">Sprint DB</p>
                                </div>
                                <i class="fas fa-database text-purple-600 text-3xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Sample Issues -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Sample Issue Keys</h3>
                    <div class="overflow-x-auto">
                        ${this.renderIssuesTable(sampleKeys)}
                    </div>
                    <div class="mt-4 text-center">
                        <p class="text-sm text-gray-500">Showing ${sampleKeys.length} sample keys of ${dbStatus.totalIssues} total issues</p>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            
        } catch (error) {
            console.error('Database render error:', error);
            throw error;
        }
    },
    
    renderIssuesTable(issueKeys) {
        if (!issueKeys || issueKeys.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No issues available</p>';
        }

        return `
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                ${issueKeys.map(key => `
                    <div class="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                        <span class="text-sm font-medium text-blue-600">${key}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

