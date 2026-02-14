// Trends Page
const Trends = {
    async render(container) {
        try {
            const sprints = await API.getAllSprints();
            
            const html = `
                <!-- Trend Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <!-- QA Failure Trend -->
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">QA Failure Rate Trend</h3>
                        <canvas id="qa-failure-trend"></canvas>
                    </div>
                    
                    <!-- Completion Trend -->
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Sprint Completion Trend</h3>
                        <canvas id="completion-trend"></canvas>
                    </div>
                </div>
                
                <!-- Issue Type Distribution -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Issue Type Distribution</h3>
                        <canvas id="issue-type-chart"></canvas>
                    </div>
                    
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Issues Per Sprint</h3>
                        <canvas id="issues-per-sprint"></canvas>
                    </div>
                </div>
                
                <!-- Trend Indicators -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Trend Indicators</h3>
                    ${this.renderTrendIndicators(sprints)}
                </div>
            `;
            
            container.innerHTML = html;
            
            // Render charts
            setTimeout(() => {
                this.renderQaFailureTrend(sprints);
                this.renderCompletionTrend(sprints);
                this.renderIssueTypeChart(sprints);
                this.renderIssuesPerSprint(sprints);
            }, 100);
            
        } catch (error) {
            console.error('Trends render error:', error);
            throw error;
        }
    },
    
    renderTrendIndicators(sprints) {
        const sortedSprints = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        // Calculate trends
        const qaRates = sortedSprints.map(s => s.qaFailureRatio || 0);
        const completionRates = sortedSprints.map(s => s.completionPercentage || 0);
        
        const qaTrend = this.calculateTrend(qaRates);
        const completionTrend = this.calculateTrend(completionRates);
        
        return `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">QA Failure Trend</p>
                            <p class="text-2xl font-bold ${qaTrend.direction === 'DOWN' ? 'text-green-600' : qaTrend.direction === 'UP' ? 'text-red-600' : 'text-gray-600'}">
                                ${qaTrend.direction}
                            </p>
                        </div>
                        <div class="text-3xl">
                            ${qaTrend.direction === 'DOWN' ? '📉' : qaTrend.direction === 'UP' ? '📈' : '➡️'}
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">${qaTrend.description}</p>
                </div>
                
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Completion Trend</p>
                            <p class="text-2xl font-bold ${completionTrend.direction === 'UP' ? 'text-green-600' : completionTrend.direction === 'DOWN' ? 'text-red-600' : 'text-gray-600'}">
                                ${completionTrend.direction}
                            </p>
                        </div>
                        <div class="text-3xl">
                            ${completionTrend.direction === 'UP' ? '📈' : completionTrend.direction === 'DOWN' ? '📉' : '➡️'}
                        </div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">${completionTrend.description}</p>
                </div>
                
                <div class="p-4 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-sm text-gray-500 mb-1">Average Issues</p>
                            <p class="text-2xl font-bold text-gray-900">
                                ${Math.round(sprints.reduce((sum, s) => sum + s.totalIssues, 0) / sprints.length)}
                            </p>
                        </div>
                        <div class="text-3xl">📊</div>
                    </div>
                    <p class="text-xs text-gray-500 mt-2">Per sprint average</p>
                </div>
            </div>
        `;
    },
    
    calculateTrend(values) {
        if (values.length < 2) return { direction: 'STABLE', description: 'Not enough data' };
        
        const recent = values.slice(-3);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const older = values.slice(0, -3);
        const oldAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : avg;
        
        const change = ((avg - oldAvg) / oldAvg) * 100;
        
        if (Math.abs(change) < 5) {
            return { direction: 'STABLE', description: 'Relatively stable performance' };
        } else if (change > 0) {
            return { direction: 'UP', description: `Increasing by ${Math.abs(change).toFixed(1)}%` };
        } else {
            return { direction: 'DOWN', description: `Decreasing by ${Math.abs(change).toFixed(1)}%` };
        }
    },
    
    renderQaFailureTrend(sprints) {
        const ctx = document.getElementById('qa-failure-trend');
        if (!ctx) return;

        const sorted = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(s => s.sprintName),
                datasets: [{
                    label: 'QA Failure Rate (%)',
                    data: sorted.map(s => s.qaFailureRatio || 0),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },
    
    renderCompletionTrend(sprints) {
        const ctx = document.getElementById('completion-trend');
        if (!ctx) return;

        const sorted = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: sorted.map(s => s.sprintName),
                datasets: [{
                    label: 'Completion %',
                    data: sorted.map(s => s.completionPercentage || 0),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true, max: 100 } }
            }
        });
    },
    
    renderIssueTypeChart(sprints) {
        const ctx = document.getElementById('issue-type-chart');
        if (!ctx) return;

        const totals = sprints.reduce((acc, s) => ({
            stories: acc.stories + (s.totalStories || 0),
            bugs: acc.bugs + (s.totalBugs || 0),
            tasks: acc.tasks + (s.totalTasks || 0),
            subtasks: acc.subtasks + (s.totalSubTasks || 0)
        }), { stories: 0, bugs: 0, tasks: 0, subtasks: 0 });
        
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Stories', 'Bugs', 'Tasks', 'Sub-tasks'],
                datasets: [{
                    data: [totals.stories, totals.bugs, totals.tasks, totals.subtasks],
                    backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    },
    
    renderIssuesPerSprint(sprints) {
        const ctx = document.getElementById('issues-per-sprint');
        if (!ctx) return;

        const sorted = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sorted.map(s => s.sprintName),
                datasets: [{
                    label: 'Total Issues',
                    data: sorted.map(s => s.totalIssues || 0),
                    backgroundColor: '#8b5cf6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }
};

