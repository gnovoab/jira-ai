// Sprints Page
const Sprints = {
    async render(container) {
        try {
            const sprints = await API.getAllSprints();
            
            const html = `
                <!-- Sprints Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${sprints.map(sprint => this.renderSprintCard(sprint)).join('')}
                </div>
            `;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Sprints render error:', error);
            throw error;
        }
    },
    
    renderSprintCard(sprint) {
        const completionPct = sprint.completionPercentage || 0;
        const qaFailureRate = sprint.qaFailureRatio || 0;

        const completionColor = completionPct >= 80 ? 'bg-green-600' :
                                completionPct >= 50 ? 'bg-blue-600' : 'bg-yellow-600';

        const qaColor = qaFailureRate > 30 ? 'text-red-600' :
                       qaFailureRate > 10 ? 'text-yellow-600' : 'text-green-600';
        
        return `
            <div class="bg-white rounded-lg shadow-sm p-6 card">
                <!-- Header -->
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900 mb-1">${sprint.sprintName}</h3>
                        <p class="text-xs text-gray-500">
                            <i class="far fa-calendar mr-1"></i>
                            ${App.formatDate(sprint.startDate)} - ${App.formatDate(sprint.endDate)}
                        </p>
                    </div>
                    <span class="badge badge-success">Active</span>
                </div>

                <!-- Completion Progress -->
                <div class="mb-4">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-sm font-medium text-gray-700">Completion</span>
                        <span class="text-sm font-bold text-gray-900">${completionPct.toFixed(0)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill ${completionColor}" style="width: ${completionPct}%"></div>
                    </div>
                </div>
                
                <!-- Stats Grid -->
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 mb-1">Total Issues</p>
                        <p class="text-2xl font-bold text-gray-900">${sprint.totalIssues}</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs text-gray-500 mb-1">Completed</p>
                        <p class="text-2xl font-bold text-green-600">${sprint.completedIssues}</p>
                    </div>
                </div>
                
                <!-- Issue Breakdown -->
                <div class="space-y-2 mb-4">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600"><i class="fas fa-book text-blue-500 w-4"></i> Stories</span>
                        <span class="font-medium text-gray-900">${sprint.totalStories}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600"><i class="fas fa-bug text-red-500 w-4"></i> Bugs</span>
                        <span class="font-medium text-gray-900">${sprint.totalBugs}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600"><i class="fas fa-tasks text-green-500 w-4"></i> Tasks</span>
                        <span class="font-medium text-gray-900">${sprint.totalTasks}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-gray-600"><i class="fas fa-sitemap text-purple-500 w-4"></i> Sub-tasks</span>
                        <span class="font-medium text-gray-900">${sprint.totalSubTasks}</span>
                    </div>
                </div>
                
                <!-- QA Metrics -->
                <div class="border-t border-gray-200 pt-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-xs text-gray-500 mb-1">QA Failures</p>
                            <p class="text-lg font-bold ${qaColor}">${sprint.qaFailed || 0} / ${sprint.totalQaTested || 0}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500 mb-1">Failure Rate</p>
                            <p class="text-lg font-bold ${qaColor}">${qaFailureRate.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

