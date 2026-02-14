// Dashboard Page
const Dashboard = {
    async render(container) {
        try {
            // Fetch all required data
            const [sprints, qaSummary, dbStatus] = await Promise.all([
                API.getAllSprints(),
                API.getQaSummary(),
                API.getDatabaseStatus()
            ]);
            
            const html = `
                <!-- Stats Cards -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    ${this.renderStatCard('Total Sprints', sprints.length, 'fas fa-running', 'stat-card')}
                    ${this.renderStatCard('Total Issues', dbStatus.totalIssues, 'fas fa-tasks', 'stat-card-success')}
                    ${this.renderStatCard('QA Failure Rate', `${(qaSummary.overallQaFailureRate || 0).toFixed(1)}%`, 'fas fa-bug', 'stat-card-warning')}
                    ${this.renderStatCard('Tested Issues', qaSummary.totalQaTested || 0, 'fas fa-check-circle', 'stat-card-danger')}
                </div>
                
                <!-- Charts Row -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- QA Failure Trend Chart -->
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">QA Failure Trend</h3>
                        <canvas id="qa-trend-chart"></canvas>
                    </div>
                    
                    <!-- Sprint Completion Chart -->
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Sprint Completion</h3>
                        <canvas id="completion-chart"></canvas>
                    </div>
                </div>
                
                <!-- Recent Sprints Table -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Recent Sprints</h3>
                        <a href="#" class="text-blue-600 hover:text-blue-700 text-sm font-medium" onclick="App.loadPage('sprints'); return false;">
                            View All <i class="fas fa-arrow-right ml-1"></i>
                        </a>
                    </div>
                    <div class="overflow-x-auto">
                        ${this.renderSprintsTable(sprints.slice(0, 5))}
                    </div>
                </div>
                
                <!-- Top QA Failures -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mt-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Top Problem Sprints</h3>
                        <a href="#" class="text-blue-600 hover:text-blue-700 text-sm font-medium" onclick="App.loadPage('qa-analysis'); return false;">
                            View Details <i class="fas fa-arrow-right ml-1"></i>
                        </a>
                    </div>
                    ${this.renderTopFailures(sprints)}
                </div>
            `;
            
            container.innerHTML = html;
            
            // Render charts after DOM is updated
            setTimeout(() => {
                this.renderQaTrendChart(sprints);
                this.renderCompletionChart(sprints);
            }, 100);
            
        } catch (error) {
            console.error('Dashboard render error:', error);
            throw error;
        }
    },
    
    renderStatCard(title, value, icon, colorClass) {
        return `
            <div class="${colorClass} rounded-lg p-6 text-white card">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-sm opacity-90 mb-1">${title}</p>
                        <p class="text-3xl font-bold">${value}</p>
                    </div>
                    <div class="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                        <i class="${icon} text-2xl"></i>
                    </div>
                </div>
            </div>
        `;
    },
    
    renderSprintsTable(sprints) {
        if (!sprints || sprints.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No sprints available</p>';
        }
        
        return `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QA Failures</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${sprints.map(sprint => `
                        <tr class="hover:bg-gray-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-gray-900">${sprint.sprintName}</div>
                                <div class="text-xs text-gray-500">${App.formatDate(sprint.startDate)} - ${App.formatDate(sprint.endDate)}</div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sprint.totalIssues}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="flex items-center">
                                    <span class="text-sm font-medium text-gray-900 mr-2">${(sprint.completionPercentage || 0).toFixed(0)}%</span>
                                    <div class="w-24 progress-bar">
                                        <div class="progress-fill bg-blue-600" style="width: ${sprint.completionPercentage || 0}%"></div>
                                    </div>
                                </div>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="badge ${(sprint.qaFailureRatio || 0) > 30 ? 'badge-danger' : (sprint.qaFailureRatio || 0) > 10 ? 'badge-warning' : 'badge-success'}">
                                    ${sprint.qaFailed || 0} (${(sprint.qaFailureRatio || 0).toFixed(1)}%)
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="badge badge-success">Active</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    renderTopFailures(sprints) {
        const topFailures = sprints
            .filter(s => (s.qaFailed || 0) > 0)
            .sort((a, b) => (b.qaFailureRatio || 0) - (a.qaFailureRatio || 0))
            .slice(0, 5);

        if (topFailures.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No QA failures detected</p>';
        }

        return `
            <div class="space-y-4">
                ${topFailures.map(sprint => `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div class="flex-1">
                            <h4 class="text-sm font-semibold text-gray-900">${sprint.sprintName}</h4>
                            <p class="text-xs text-gray-500 mt-1">${sprint.qaFailed || 0} failures out of ${sprint.totalQaTested || 0} tested</p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold text-red-600">${(sprint.qaFailureRatio || 0).toFixed(1)}%</p>
                            <p class="text-xs text-gray-500">Failure Rate</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    renderQaTrendChart(sprints) {
        const ctx = document.getElementById('qa-trend-chart');
        if (!ctx) return;

        const sortedSprints = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sortedSprints.map(s => s.sprintName),
                datasets: [{
                    label: 'QA Failure Rate (%)',
                    data: sortedSprints.map(s => s.qaFailureRatio || 0),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Failure Rate (%)' } }
                }
            }
        });
    },

    renderCompletionChart(sprints) {
        const ctx = document.getElementById('completion-chart');
        if (!ctx) return;

        const sortedSprints = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedSprints.map(s => s.sprintName),
                datasets: [{
                    label: 'Completion %',
                    data: sortedSprints.map(s => s.completionPercentage || 0),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true, max: 100, title: { display: true, text: 'Completion (%)' } }
                }
            }
        });
    }
};

