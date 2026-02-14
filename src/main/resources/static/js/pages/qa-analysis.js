// QA Analysis Page
const QaAnalysis = {
    async render(container) {
        try {
            const [qaSummary, topFailuresResponse, sprints] = await Promise.all([
                API.getQaSummary(),
                API.getTopFailures(),
                API.getAllSprints()
            ]);

            // Extract the array from the response object
            const topFailures = topFailuresResponse.topFailures || [];

            const html = `
                <!-- Summary Cards -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Overall Failure Rate</p>
                                <p class="text-3xl font-bold text-red-600">${(qaSummary.overallQaFailureRate || 0).toFixed(1)}%</p>
                            </div>
                            <div class="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Total Failures</p>
                                <p class="text-3xl font-bold text-gray-900">${qaSummary.totalQaFailed || 0}</p>
                            </div>
                            <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-bug text-orange-600 text-xl"></i>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                        <div class="flex items-center justify-between">
                            <div>
                                <p class="text-sm text-gray-500 mb-1">Total Tested</p>
                                <p class="text-3xl font-bold text-gray-900">${qaSummary.totalQaTested || 0}</p>
                            </div>
                            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <i class="fas fa-check-circle text-blue-600 text-xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Top Failures -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Problem Sprints</h3>
                    ${this.renderTopFailures(topFailures)}
                </div>
                
                <!-- Sprint-by-Sprint Breakdown -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Sprint-by-Sprint QA Analysis</h3>
                    <div class="overflow-x-auto">
                        ${this.renderSprintBreakdown(sprints)}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('QA Analysis render error:', error);
            throw error;
        }
    },
    
    renderTopFailures(topFailures) {
        if (!topFailures || topFailures.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No QA failures detected</p>';
        }
        
        return `
            <div class="space-y-3">
                ${topFailures.map((sprint, index) => `
                    <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                        <div class="flex-shrink-0 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm mr-4">
                            ${index + 1}
                        </div>
                        <div class="flex-1">
                            <h4 class="text-sm font-semibold text-gray-900">${sprint.sprintName}</h4>
                            <p class="text-xs text-gray-500 mt-1">
                                ${sprint.qaFailed || 0} failures out of ${sprint.totalQaTested || 0} tested issues
                            </p>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-bold text-red-600">${(sprint.qaFailureRate || 0).toFixed(1)}%</p>
                            <p class="text-xs text-gray-500">Failure Rate</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },
    
    renderSprintBreakdown(sprints) {
        const sortedSprints = [...sprints].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        
        return `
            <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sprint</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tested</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failures</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failure Rate</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${sortedSprints.map(sprint => {
                        const qaFailureRate = sprint.qaFailureRatio || 0;
                        const badgeClass = qaFailureRate > 30 ? 'badge-danger' :
                                          qaFailureRate > 10 ? 'badge-warning' : 'badge-success';

                        return `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="text-sm font-medium text-gray-900">${sprint.sprintName}</div>
                                    <div class="text-xs text-gray-500">${App.formatDate(sprint.startDate)}</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${sprint.totalQaTested || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">${sprint.qaFailed || 0}</td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="badge ${badgeClass}">${qaFailureRate.toFixed(1)}%</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    ${qaFailureRate === 0 ?
                                        '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>Clean</span>' :
                                        '<span class="text-red-600"><i class="fas fa-exclamation-circle mr-1"></i>Issues</span>'}
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
};

