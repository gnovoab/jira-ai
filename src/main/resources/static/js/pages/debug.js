// Debug Tools Page
const DebugTools = {
    selectedSprintId: null,
    
    async render(container) {
        try {
            const sprints = await API.getAllSprints();
            
            const html = `
                <!-- Sprint Selector -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Select Sprint for Debugging</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${sprints.map(sprint => `
                            <button onclick="DebugTools.selectSprint('${sprint.sprintId}')" 
                                    class="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left">
                                <div class="font-semibold text-gray-900">${sprint.sprintName}</div>
                                <div class="text-sm text-gray-500 mt-1">ID: ${sprint.sprintId}</div>
                                <div class="text-xs text-gray-400 mt-1">${sprint.totalIssues} issues</div>
                            </button>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Debug Results -->
                <div id="debug-results" class="space-y-6">
                    <div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                        <i class="fas fa-mouse-pointer text-gray-400 text-4xl mb-4"></i>
                        <p class="text-gray-500">Select a sprint above to view debug information</p>
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Debug Tools render error:', error);
            throw error;
        }
    },
    
    async selectSprint(sprintId) {
        this.selectedSprintId = sprintId;
        const resultsContainer = document.getElementById('debug-results');

        resultsContainer.innerHTML = App.getLoadingHTML();

        try {
            const [transitionsResponse, failuresResponse] = await Promise.all([
                API.getStatusTransitions(sprintId),
                API.getQaFailures(sprintId, 20)
            ]);

            // Extract arrays from response objects
            const transitions = transitionsResponse.transitions || [];
            const failures = failuresResponse.sampleIssues || [];

            const html = `
                <!-- Status Transitions -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-exchange-alt text-blue-600 mr-2"></i>
                        Status Transitions (${transitions.length} issues)
                    </h3>
                    ${this.renderStatusTransitions(transitions)}
                </div>

                <!-- QA Failures -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">
                        <i class="fas fa-bug text-red-600 mr-2"></i>
                        QA Failures (${failures.length} issues)
                    </h3>
                    ${this.renderQaFailures(failures)}
                </div>
            `;

            resultsContainer.innerHTML = html;

        } catch (error) {
            console.error('Error loading debug data:', error);
            resultsContainer.innerHTML = App.getErrorHTML(error.message);
        }
    },
    
    // Define workflow order for sorting transitions
    statusOrder: [
        'Backlog', 'To Do', 'Blocked', 'In Progress', 'In Review',
        'Ready for merge', 'Monitoring', 'Ready for Test', 'QA',
        'QA Failed', 'Completed'
    ],

    getStatusIndex(status) {
        const idx = this.statusOrder.indexOf(status);
        return idx === -1 ? 999 : idx;
    },

    sortTransitions(transitions) {
        return [...transitions].sort((a, b) => {
            // Extract "from" status from transition string (e.g., "To Do → In Progress")
            const fromA = (a.transition || '').split(' → ')[0];
            const fromB = (b.transition || '').split(' → ')[0];
            const toA = (a.transition || '').split(' → ')[1];
            const toB = (b.transition || '').split(' → ')[1];

            // Sort by "from" status first, then by "to" status
            const fromDiff = this.getStatusIndex(fromA) - this.getStatusIndex(fromB);
            if (fromDiff !== 0) return fromDiff;
            return this.getStatusIndex(toA) - this.getStatusIndex(toB);
        });
    },

    renderStatusTransitions(transitions) {
        if (!transitions || transitions.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No status transitions found</p>';
        }

        const sortedTransitions = this.sortTransitions(transitions);

        return `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transition</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${sortedTransitions.map(item => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4">
                                    <span class="text-sm font-medium text-gray-900">${item.transition || 'Unknown'}</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="badge badge-info">${item.count || 0}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderQaFailures(failures) {
        if (!failures || failures.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No QA failures found</p>';
        }

        return `
            <div class="space-y-4">
                ${failures.map(failure => `
                    <div class="border border-red-200 rounded-lg p-4 bg-red-50">
                        <div class="flex items-start justify-between mb-2">
                            <div class="flex-1">
                                <h4 class="text-sm font-semibold text-gray-900">${failure.key || 'Unknown'}</h4>
                                <p class="text-sm text-gray-700 mt-1">${failure.summary || 'No summary'}</p>
                            </div>
                            <span class="badge badge-danger ml-4">QA Failed</span>
                        </div>

                        <div class="mt-3 space-y-2">
                            <div class="text-xs text-gray-600">
                                <strong>Current Status:</strong> ${failure.currentStatus || 'Unknown'}
                            </div>
                            <div class="text-xs text-gray-600">
                                <strong>Status Changes:</strong>
                                <div class="mt-1 flex flex-wrap gap-1">
                                    ${(failure.statusChanges || []).map(t => `
                                        <span class="px-2 py-1 bg-white border border-red-200 rounded text-xs">
                                            ${t.from} → ${t.to}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
};

