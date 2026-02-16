// Sprint Overview Page - Lovable Design
const SprintOverview = {
    selectedSprintId: null,
    pendingSprintId: null,  // Sprint to select after render
    sprintsData: [],
    velocityData: [],
    currentIssues: [],  // Store issues for modal access

    async render(container) {
        try {
            const sprints = await API.getAllSprints();
            this.sprintsData = sprints;

            // Build velocity data from all sprints
            this.velocityData = sprints.map(s => ({
                sprint: s.sprintName.replace('Calandri ', 'S').replace('Calandria ', 'S'),
                points: s.completedIssues || 0
            })).reverse();

            const html = `
                <div class="max-w-7xl mx-auto space-y-6">
                    <!-- Header -->
                    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl font-bold tracking-tight text-gray-900">Sprint Metrics</h1>
                            <p id="sprint-subtitle" class="text-sm text-gray-500 mt-1">Select a sprint to view details</p>
                        </div>
                        <select id="sprint-selector" class="w-52 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="SprintOverview.loadSprintDetails(this.value)">
                            ${sprints.map(s => `<option value="${s.sprintId}">${s.sprintName}</option>`).join('')}
                        </select>
                    </header>

                    <!-- Sprint Overview Content -->
                    <div id="sprint-overview-content">
                        <div class="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                            <i class="fas fa-chart-line text-gray-400 text-5xl mb-4"></i>
                            <p class="text-gray-500 text-lg">Loading sprint data...</p>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;

            // Auto-select sprint: use pending sprint if set, otherwise most recent
            if (sprints.length > 0) {
                console.log('pendingSprintId:', this.pendingSprintId);
                const sprintToSelect = this.pendingSprintId || sprints[0].sprintId;
                console.log('sprintToSelect:', sprintToSelect);
                document.getElementById('sprint-selector').value = sprintToSelect;
                this.loadSprintDetails(sprintToSelect);
                this.pendingSprintId = null;  // Clear pending selection
            }

        } catch (error) {
            console.error('Sprint Overview render error:', error);
            throw error;
        }
    },

    // Navigate to Sprint Overview with a specific sprint pre-selected
    navigateToSprint(sprintId) {
        console.log('navigateToSprint called with:', sprintId);
        this.pendingSprintId = sprintId;
        App.loadPage('sprint-overview');
    },

    async loadSprintDetails(sprintId) {
        if (!sprintId) return;

        this.selectedSprintId = sprintId;
        const contentContainer = document.getElementById('sprint-overview-content');
        contentContainer.innerHTML = App.getLoadingHTML();

        try {
            // Find sprint from cached data (already loaded from API.getAllSprints)
            const sprint = this.sprintsData.find(s => s.sprintId === sprintId);
            if (!sprint) {
                throw new Error(`Sprint not found: ${sprintId}`);
            }

            // Update subtitle
            const subtitle = document.getElementById('sprint-subtitle');
            if (subtitle) {
                subtitle.textContent = `${App.formatDate(sprint.startDate)} → ${App.formatDate(sprint.endDate)}`;
            }

            contentContainer.innerHTML = this.renderSprintOverview(sprint);

            // Render charts after DOM update
            setTimeout(() => {
                this.renderStatusDistributionChart(sprint);
                this.renderVelocityChart();
                this.renderAssigneeChart(sprint);
            }, 100);

            // Load and render issues using sprintName
            this.loadSprintIssues(sprint.sprintName);

        } catch (error) {
            console.error('Error loading sprint details:', error);
            contentContainer.innerHTML = App.getErrorHTML(error.message);
        }
    },

    // Filter state
    issueFilters: {
        search: '',
        assignee: '',
        sortBy: 'key',
        sortDir: 'asc'
    },

    async loadSprintIssues(sprintName) {
        const issuesContainer = document.getElementById('sprint-issues-container');
        const workDistContainer = document.getElementById('sprint-work-distribution');

        try {
            const issues = await API.getSprintIssues(sprintName);
            this.currentIssues = issues;  // Store for modal access
            this.allIssues = issues;      // Store original list for filtering

            if (issuesContainer) {
                issuesContainer.innerHTML = this.renderIssueList(issues);
                this.setupIssueFilters();
            }
            if (workDistContainer) {
                workDistContainer.innerHTML = this.renderWorkDistribution(issues);
            }
        } catch (error) {
            console.error('Error loading sprint issues:', error);
            if (issuesContainer) {
                issuesContainer.innerHTML = `<p class="text-red-500 text-sm">Failed to load issues: ${error.message}</p>`;
            }
            if (workDistContainer) {
                workDistContainer.innerHTML = `<p class="text-red-500 text-sm">Failed to load team distribution</p>`;
            }
        }
    },

    setupIssueFilters() {
        // Search input
        document.getElementById('issue-search')?.addEventListener('input', (e) => {
            this.issueFilters.search = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Assignee filter
        document.getElementById('issue-assignee-filter')?.addEventListener('change', (e) => {
            this.issueFilters.assignee = e.target.value;
            this.applyFilters();
        });

        // Sort buttons
        document.querySelectorAll('[data-sort]').forEach(btn => {
            btn.addEventListener('click', () => {
                const sortBy = btn.dataset.sort;
                if (this.issueFilters.sortBy === sortBy) {
                    this.issueFilters.sortDir = this.issueFilters.sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.issueFilters.sortBy = sortBy;
                    this.issueFilters.sortDir = 'asc';
                }
                this.applyFilters();
            });
        });
    },

    applyFilters() {
        let filtered = [...this.allIssues];

        // Search filter
        if (this.issueFilters.search) {
            filtered = filtered.filter(issue =>
                issue.summary.toLowerCase().includes(this.issueFilters.search) ||
                issue.key.toLowerCase().includes(this.issueFilters.search)
            );
        }

        // Assignee filter
        if (this.issueFilters.assignee) {
            filtered = filtered.filter(issue => issue.assignee === this.issueFilters.assignee);
        }

        // Sorting
        filtered.sort((a, b) => {
            let valA = a[this.issueFilters.sortBy] || '';
            let valB = b[this.issueFilters.sortBy] || '';
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            let cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
            return this.issueFilters.sortDir === 'desc' ? -cmp : cmp;
        });

        this.currentIssues = filtered;
        this.renderFilteredIssues(filtered);
    },

    renderFilteredIssues(issues) {
        const tbody = document.getElementById('issues-tbody');
        if (!tbody) return;

        const rows = issues.map((issue, index) => this.renderIssueRow(issue, index)).join('');
        tbody.innerHTML = rows;

        // Update count
        const countEl = document.getElementById('issues-count');
        if (countEl) {
            countEl.textContent = `${issues.length} of ${this.allIssues.length} issues`;
        }
    },

    renderIssueRow(issue, index) {
        const getTypeIcon = (type) => {
            const icons = { 'Story': '📘', 'Bug': '🐛', 'Task': '✅', 'Sub-task': '📎' };
            return icons[type] || '📄';
        };

        const getStatusBadge = (status) => {
            const colors = {
                'Completed': 'bg-green-100 text-green-800',
                'Done': 'bg-green-100 text-green-800',
                'Ready for merge': 'bg-green-100 text-green-800',
                'Monitoring': 'bg-blue-100 text-blue-800',
                'QA': 'bg-purple-100 text-purple-800',
                'Ready for Test': 'bg-purple-100 text-purple-800',
                'In Progress': 'bg-yellow-100 text-yellow-800',
                'To Do': 'bg-gray-100 text-gray-800'
            };
            const colorClass = colors[status] || 'bg-gray-100 text-gray-800';
            return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${status}</span>`;
        };

        const getDeliveryBadge = (delivered, label) => {
            return delivered
                ? `<span class="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">✓ ${label}</span>`
                : `<span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-500">— ${label}</span>`;
        };

        return `
            <tr class="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                onclick="SprintOverview.showIssueModal(${index})">
                <td class="py-3 px-4">
                    <span class="text-blue-600 font-medium">${issue.key}</span>
                </td>
                <td class="py-3 px-4 text-sm text-gray-700 max-w-md truncate" title="${issue.summary}">${issue.summary}</td>
                <td class="py-3 px-4 text-sm">${getTypeIcon(issue.issueType)} ${issue.issueType}</td>
                <td class="py-3 px-4">${getStatusBadge(issue.status)}</td>
                <td class="py-3 px-4 text-sm text-gray-600">${issue.assignee}</td>
                <td class="py-3 px-4">${getDeliveryBadge(issue.devDelivered, 'Dev')}</td>
                <td class="py-3 px-4">${getDeliveryBadge(issue.qaDelivered, 'QA')}</td>
            </tr>
        `;
    },

    renderIssueList(issues) {
        if (!issues || issues.length === 0) {
            return '<p class="text-gray-500 text-sm">No issues found for this sprint.</p>';
        }

        // Get unique assignees for filter dropdown
        const assignees = [...new Set(issues.map(i => i.assignee).filter(a => a))].sort();

        const rows = issues.map((issue, index) => this.renderIssueRow(issue, index)).join('');

        return `
            <!-- Issue Modal -->
            <div id="sprint-issue-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div id="sprint-issue-modal-content"></div>
                </div>
            </div>

            <!-- Search and Filter Bar -->
            <div class="flex flex-wrap gap-4 mb-4 items-center">
                <div class="flex-1 min-w-[200px]">
                    <div class="relative">
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="issue-search" placeholder="Search by key or summary..."
                               class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
                    </div>
                </div>
                <div class="min-w-[180px]">
                    <select id="issue-assignee-filter" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="">All Assignees</option>
                        ${assignees.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                </div>
                <div class="text-sm text-gray-500">
                    <span id="issues-count">${issues.length} issues</span>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-blue-600" data-sort="key">
                                Key <i class="fas fa-sort ml-1 text-gray-300"></i>
                            </th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-blue-600" data-sort="summary">
                                Summary <i class="fas fa-sort ml-1 text-gray-300"></i>
                            </th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-blue-600" data-sort="issueType">
                                Type <i class="fas fa-sort ml-1 text-gray-300"></i>
                            </th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-blue-600" data-sort="status">
                                Status <i class="fas fa-sort ml-1 text-gray-300"></i>
                            </th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500 cursor-pointer hover:text-blue-600" data-sort="assignee">
                                Assignee <i class="fas fa-sort ml-1 text-gray-300"></i>
                            </th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Dev Delivery</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">QA Delivery</th>
                        </tr>
                    </thead>
                    <tbody id="issues-tbody">
                        ${rows}
                    </tbody>
                </table>
            </div>
            <p class="text-xs text-gray-400 mt-3">Click on a row to view details • Click column headers to sort</p>
        `;
    },

    showIssueModal(index) {
        const issue = this.currentIssues[index];
        if (!issue) return;

        const getTypeIcon = (type) => {
            const icons = { 'Story': '📘', 'Bug': '🐛', 'Task': '✅', 'Sub-task': '📎' };
            return icons[type] || '📄';
        };

        const getStatusBadge = (status) => {
            const colors = {
                'Completed': 'bg-green-100 text-green-800',
                'Done': 'bg-green-100 text-green-800',
                'Ready for merge': 'bg-green-100 text-green-800',
                'Monitoring': 'bg-blue-100 text-blue-800',
                'QA': 'bg-purple-100 text-purple-800',
                'Ready for Test': 'bg-purple-100 text-purple-800',
                'In Progress': 'bg-yellow-100 text-yellow-800',
                'To Do': 'bg-gray-100 text-gray-800'
            };
            const colorClass = colors[status] || 'bg-gray-100 text-gray-800';
            return `<span class="px-3 py-1.5 text-sm font-medium rounded-full ${colorClass}">${status}</span>`;
        };

        const getDeliveryStatus = (delivered, label) => {
            return delivered
                ? `<div class="flex items-center gap-2"><span class="w-3 h-3 bg-green-500 rounded-full"></span><span class="text-green-700 font-medium">${label} Delivered</span></div>`
                : `<div class="flex items-center gap-2"><span class="w-3 h-3 bg-gray-300 rounded-full"></span><span class="text-gray-500">${label} Not Delivered</span></div>`;
        };

        const getPriorityBadge = (priority) => {
            const colors = {
                'P0': 'bg-red-100 text-red-800 border-red-200',
                'P1': 'bg-orange-100 text-orange-800 border-orange-200',
                'P2': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                'P3': 'bg-blue-100 text-blue-800 border-blue-200'
            };
            const colorClass = colors[priority] || 'bg-gray-100 text-gray-800 border-gray-200';
            return `<span class="px-2 py-1 text-xs font-medium rounded border ${colorClass}">${priority}</span>`;
        };

        const modalContent = `
            <!-- Header -->
            <div class="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">${getTypeIcon(issue.issueType)}</span>
                        <div>
                            <h2 class="text-xl font-bold text-white">${issue.key}</h2>
                            <p class="text-blue-100 text-sm">${issue.issueType}</p>
                        </div>
                    </div>
                    <button onclick="SprintOverview.closeIssueModal()"
                            class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                <!-- Summary -->
                <div>
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Summary</h3>
                    <p class="text-gray-900 text-lg">${issue.summary}</p>
                </div>

                <!-- Status & Priority Row -->
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Status</h3>
                        ${getStatusBadge(issue.status)}
                    </div>
                    <div>
                        <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Priority</h3>
                        ${getPriorityBadge(issue.priority)}
                    </div>
                </div>

                <!-- Assignee -->
                <div>
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Assignee</h3>
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span class="text-blue-600 font-semibold">${issue.assignee.charAt(0).toUpperCase()}</span>
                        </div>
                        <span class="text-gray-900 font-medium">${issue.assignee}</span>
                    </div>
                </div>

                <!-- Delivery Status -->
                <div>
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Delivery Status</h3>
                    <div class="bg-gray-50 rounded-lg p-4 space-y-3">
                        ${getDeliveryStatus(issue.devDelivered, 'Dev')}
                        ${getDeliveryStatus(issue.qaDelivered, 'QA')}
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-6 py-4 flex justify-between items-center border-t">
                <a href="https://jira.example.com/browse/${issue.key}" target="_blank"
                   class="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                    Open in Jira
                </a>
                <button onclick="SprintOverview.closeIssueModal()"
                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors">
                    Close
                </button>
            </div>
        `;

        const modal = document.getElementById('sprint-issue-modal');
        const modalContentEl = document.getElementById('sprint-issue-modal-content');
        if (modal && modalContentEl) {
            modalContentEl.innerHTML = modalContent;
            modal.classList.remove('hidden');
            // Close on backdrop click
            modal.onclick = (e) => {
                if (e.target === modal) this.closeIssueModal();
            };
            // Close on Escape key
            document.addEventListener('keydown', this.handleEscapeKey);
        }
    },

    closeIssueModal() {
        const modal = document.getElementById('sprint-issue-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        document.removeEventListener('keydown', this.handleEscapeKey);
    },

    handleEscapeKey(e) {
        if (e.key === 'Escape') {
            SprintOverview.closeIssueModal();
            SprintOverview.closeMemberModal();
        }
    },

    // Group issues by assignee and calculate metrics
    groupIssuesByAssignee(issues) {
        const grouped = {};
        issues.forEach(issue => {
            const assignee = issue.assignee || 'Unassigned';
            if (!grouped[assignee]) {
                grouped[assignee] = {
                    name: assignee,
                    issues: [],
                    completed: 0,
                    inProgress: 0,
                    pending: 0,
                    devDelivered: 0,
                    qaDelivered: 0,
                    bugs: 0,
                    stories: 0
                };
            }
            grouped[assignee].issues.push(issue);

            // Count metrics
            const completedStatuses = ['Completed', 'Done', 'Ready for merge'];
            const activeStatuses = ['In Progress', 'QA', 'Ready for Test', 'Monitoring', 'Code Review'];

            if (completedStatuses.includes(issue.status)) {
                grouped[assignee].completed++;
            } else if (activeStatuses.includes(issue.status)) {
                grouped[assignee].inProgress++;
            } else {
                // Pending: anything not completed and not active (e.g., To Do, Backlog, Open, etc.)
                grouped[assignee].pending++;
            }
            if (issue.devDelivered) grouped[assignee].devDelivered++;
            if (issue.qaDelivered) grouped[assignee].qaDelivered++;
            if (issue.issueType === 'Bug') grouped[assignee].bugs++;
            if (issue.issueType === 'Story') grouped[assignee].stories++;
        });

        return Object.values(grouped).sort((a, b) => b.issues.length - a.issues.length);
    },

    renderWorkDistribution(issues) {
        if (!issues || issues.length === 0) {
            return '<p class="text-gray-500 text-sm">No issues to display.</p>';
        }

        const teamMembers = this.groupIssuesByAssignee(issues);

        const memberCards = teamMembers.map((member, index) => {
            const completionPct = member.issues.length > 0
                ? Math.round((member.completed / member.issues.length) * 100)
                : 0;
            const initials = member.name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);
            const avatarColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
            const avatarColor = avatarColors[index % avatarColors.length];

            return `
                <div class="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all"
                     onclick="SprintOverview.showMemberModal('${member.name.replace(/'/g, "\\'")}')">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 ${avatarColor} rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            ${initials}
                        </div>
                        <div class="flex-1 min-w-0">
                            <h4 class="font-semibold text-gray-900 truncate">${member.name}</h4>
                            <p class="text-xs text-gray-500">${member.issues.length} issues assigned</p>
                        </div>
                    </div>

                    <!-- Progress bar -->
                    <div class="mb-3">
                        <div class="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Completion</span>
                            <span>${completionPct}%</span>
                        </div>
                        <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-green-500 rounded-full transition-all" style="width: ${completionPct}%"></div>
                        </div>
                    </div>

                    <!-- Stats row -->
                    <div class="grid grid-cols-5 gap-1 text-center">
                        <div>
                            <div class="text-lg font-bold text-gray-400">${member.pending}</div>
                            <div class="text-xs text-gray-500">Pending</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold text-blue-600">${member.inProgress}</div>
                            <div class="text-xs text-gray-500">Active</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold text-green-600">${member.devDelivered}</div>
                            <div class="text-xs text-gray-500">Dev ✓</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold text-purple-600">${member.qaDelivered}</div>
                            <div class="text-xs text-gray-500">QA ✓</div>
                        </div>
                        <div>
                            <div class="text-lg font-bold text-gray-900">${member.completed}</div>
                            <div class="text-xs text-gray-500">Done</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <!-- Member Modal -->
            <div id="sprint-member-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <div id="sprint-member-modal-content"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${memberCards}
            </div>
            <p class="text-xs text-gray-400 mt-3">Click on a team member to view their tasks • ${teamMembers.length} team members</p>
        `;
    },

    showMemberModal(memberName) {
        const memberIssues = this.currentIssues.filter(issue => issue.assignee === memberName);
        if (memberIssues.length === 0) return;

        const member = this.groupIssuesByAssignee(memberIssues)[0];
        const initials = member.name.split(' ').map(n => n.charAt(0).toUpperCase()).join('').slice(0, 2);

        const getTypeIcon = (type) => {
            const icons = { 'Story': '📘', 'Bug': '🐛', 'Task': '✅', 'Sub-task': '📎' };
            return icons[type] || '📄';
        };

        const getStatusBadge = (status) => {
            const colors = {
                'Completed': 'bg-green-100 text-green-800',
                'Done': 'bg-green-100 text-green-800',
                'Ready for merge': 'bg-green-100 text-green-800',
                'Monitoring': 'bg-blue-100 text-blue-800',
                'QA': 'bg-purple-100 text-purple-800',
                'Ready for Test': 'bg-purple-100 text-purple-800',
                'In Progress': 'bg-yellow-100 text-yellow-800',
                'To Do': 'bg-gray-100 text-gray-800'
            };
            const colorClass = colors[status] || 'bg-gray-100 text-gray-800';
            return `<span class="px-2 py-1 text-xs font-medium rounded-full ${colorClass}">${status}</span>`;
        };

        const jiraBaseUrl = 'https://gspcloud.atlassian.net/browse/';

        const issueRows = memberIssues.map(issue => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-2 px-3">
                    <a href="${jiraBaseUrl}${issue.key}" target="_blank" rel="noopener noreferrer"
                       class="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline"
                       onclick="event.stopPropagation(); window.open('${jiraBaseUrl}${issue.key}', '_blank'); return false;">
                        ${issue.key}
                    </a>
                </td>
                <td class="py-2 px-3 text-sm text-gray-700 max-w-xs">
                    <a href="${jiraBaseUrl}${issue.key}" target="_blank" rel="noopener noreferrer"
                       class="hover:text-blue-600 hover:underline block truncate"
                       title="${issue.summary}"
                       onclick="event.stopPropagation(); window.open('${jiraBaseUrl}${issue.key}', '_blank'); return false;">
                        ${issue.summary}
                    </a>
                </td>
                <td class="py-2 px-3 text-sm">${getTypeIcon(issue.issueType)}</td>
                <td class="py-2 px-3">${getStatusBadge(issue.status)}</td>
                <td class="py-2 px-3 text-center">
                    ${issue.devDelivered ? '<span class="text-green-600">✓</span>' : '<span class="text-gray-300">—</span>'}
                </td>
                <td class="py-2 px-3 text-center">
                    ${issue.qaDelivered ? '<span class="text-green-600">✓</span>' : '<span class="text-gray-300">—</span>'}
                </td>
            </tr>
        `).join('');

        const modalContent = `
            <!-- Header -->
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-xl">
                            ${initials}
                        </div>
                        <div>
                            <h2 class="text-xl font-bold text-white">${member.name}</h2>
                            <p class="text-indigo-100">${member.issues.length} issues assigned</p>
                        </div>
                    </div>
                    <button onclick="SprintOverview.closeMemberModal()"
                            class="text-white hover:bg-white/20 rounded-full p-2 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Stats Summary -->
            <div class="grid grid-cols-5 gap-4 p-4 bg-gray-50 border-b">
                <div class="text-center">
                    <div class="text-2xl font-bold text-gray-900">${member.issues.length}</div>
                    <div class="text-xs text-gray-500 uppercase">Total</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-green-600">${member.completed}</div>
                    <div class="text-xs text-gray-500 uppercase">Done</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-blue-600">${member.inProgress}</div>
                    <div class="text-xs text-gray-500 uppercase">Active</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-orange-600">${member.bugs}</div>
                    <div class="text-xs text-gray-500 uppercase">Bugs</div>
                </div>
                <div class="text-center">
                    <div class="text-2xl font-bold text-purple-600">${member.stories}</div>
                    <div class="text-xs text-gray-500 uppercase">Stories</div>
                </div>
            </div>

            <!-- Issues Table -->
            <div class="p-4 overflow-y-auto max-h-[50vh]">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="py-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Key</th>
                            <th class="py-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Summary</th>
                            <th class="py-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Type</th>
                            <th class="py-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Status</th>
                            <th class="py-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500 text-center">Dev</th>
                            <th class="py-2 px-3 text-xs font-semibold uppercase tracking-widest text-gray-500 text-center">QA</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${issueRows}
                    </tbody>
                </table>
            </div>

            <!-- Footer -->
            <div class="bg-gray-50 px-6 py-4 flex justify-end border-t">
                <button onclick="SprintOverview.closeMemberModal()"
                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors">
                    Close
                </button>
            </div>
        `;

        const modal = document.getElementById('sprint-member-modal');
        const modalContentEl = document.getElementById('sprint-member-modal-content');
        if (modal && modalContentEl) {
            modalContentEl.innerHTML = modalContent;
            modal.classList.remove('hidden');
            modal.onclick = (e) => {
                if (e.target === modal) this.closeMemberModal();
            };
        }
    },

    closeMemberModal() {
        const modal = document.getElementById('sprint-member-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    renderSprintOverview(sprint) {
        const completionPct = sprint.completionPercentage || 0;
        const totalIssues = sprint.totalIssues || 0;
        const completed = sprint.completedIssues || 0;
        const qaFailed = sprint.qaFailed || 0;
        const bugs = sprint.totalBugs || 0;
        const totalStories = sprint.totalStories || 0;
        const devDelivered = sprint.devDeliveredStories || 0;
        const devDeliveryPct = sprint.devDeliveryPercentage || 0;
        const qaDelivered = sprint.qaDeliveredStories || 0;
        const qaDeliveryPct = sprint.qaDeliveryPercentage || 0;

        return `
            <!-- Metric Cards Row 1 -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                ${this.renderMetricCard('Velocity', completed, `/ ${totalIssues} issues`, 'fas fa-chart-line', null)}
                ${this.renderMetricCard('Completion', `${completionPct.toFixed(0)}%`, `${completed}/${totalIssues} issues`, 'fas fa-bullseye', null)}
                ${this.renderMetricCard('Bugs', bugs, `in sprint`, 'fas fa-bug', null)}
            </div>

            <!-- Metric Cards Row 2: Delivery Metrics -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                ${this.renderMetricCard('Dev Delivery', `${devDeliveryPct.toFixed(0)}%`, `${devDelivered}/${totalStories} stories to QA`, 'fas fa-code', null)}
                ${this.renderMetricCard('QA Delivery', `${qaDeliveryPct.toFixed(0)}%`, `${qaDelivered}/${totalStories} stories done`, 'fas fa-check-double', null)}
                ${this.renderMetricCard('QA Failed', qaFailed, `${(sprint.qaFailureRatio || 0).toFixed(1)}% rate`, 'fas fa-times-circle', null)}
            </div>

            <!-- Charts Row 1: Status Distribution + Velocity -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Status Distribution -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Status Distribution</h3>
                    <div class="flex items-center gap-6">
                        <div class="h-44 w-44 flex-shrink-0">
                            <canvas id="status-distribution-chart"></canvas>
                        </div>
                        <div class="flex flex-col gap-2 flex-1">
                            ${this.renderStatusLegend(sprint)}
                        </div>
                    </div>
                </div>

                <!-- Velocity Trend -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Velocity Trend</h3>
                    <div class="h-56">
                        <canvas id="velocity-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Charts Row 2: Issue Types + Assignee Workload -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Issue Type Breakdown -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Issue Type Breakdown</h3>
                    <div class="space-y-3">
                        ${this.renderIssueTypeRow('Story', sprint.totalStories || 0, totalIssues, '#3b82f6', '📘')}
                        ${this.renderIssueTypeRow('Bug', sprint.totalBugs || 0, totalIssues, '#ef4444', '🐛')}
                        ${this.renderIssueTypeRow('Task', sprint.totalTasks || 0, totalIssues, '#10b981', '✅')}
                        ${this.renderIssueTypeRow('Sub-task', sprint.totalSubTasks || 0, totalIssues, '#8b5cf6', '📎')}
                    </div>
                </div>

                <!-- Workload by Assignee -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">QA Metrics</h3>
                    <div class="h-56">
                        <canvas id="assignee-chart"></canvas>
                    </div>
                </div>
            </div>

            <!-- Sprint Backlog Table -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Sprint Summary</h3>
                ${this.renderSprintSummaryTable(sprint)}
            </div>

            <!-- Work Distribution by Team Member -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Work Distribution by Team Member</h3>
                <div id="sprint-work-distribution">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span class="ml-3 text-gray-500">Loading team distribution...</span>
                    </div>
                </div>
            </div>

            <!-- Sprint Issues List -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Sprint Issues</h3>
                <div id="sprint-issues-container">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span class="ml-3 text-gray-500">Loading issues...</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderMetricCard(label, value, subtitle, icon, trend) {
        const trendHtml = trend && trend.value !== 0 ? `
            <div class="flex items-center gap-1.5 mt-2">
                <span class="text-xs font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-600'}">
                    ${trend.value >= 0 ? '↑' : '↓'} ${Math.abs(trend.value)}%
                </span>
                <span class="text-xs text-gray-400">${trend.label}</span>
            </div>
        ` : '';

        return `
            <div class="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 transition-colors shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold uppercase tracking-widest text-gray-500">${label}</span>
                    <i class="${icon} text-gray-400"></i>
                </div>
                <div class="flex items-end gap-2">
                    <span class="text-3xl font-bold text-gray-900">${value}</span>
                    ${subtitle ? `<span class="text-sm text-gray-400 mb-0.5">${subtitle}</span>` : ''}
                </div>
                ${trendHtml}
            </div>
        `;
    },

    renderStatusLegend(sprint) {
        const completed = sprint.completedIssues || 0;
        const inProgress = sprint.inProgressIssues || 0;
        const total = sprint.totalIssues || 1;
        const remaining = Math.max(0, total - completed - inProgress);

        const statuses = [
            { name: 'Completed', value: completed, color: '#10b981' },
            { name: 'In Progress', value: inProgress, color: '#3b82f6' },
            { name: 'Remaining', value: remaining, color: '#6b7280' }
        ];

        return statuses.map(s => `
            <div class="flex items-center gap-2 text-sm">
                <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${s.color}"></div>
                <span class="text-gray-500">${s.name}</span>
                <span class="font-semibold text-gray-900 ml-auto">${s.value}</span>
                <span class="text-xs text-gray-400">(${Math.round((s.value / total) * 100)}%)</span>
            </div>
        `).join('');
    },

    renderIssueTypeRow(type, count, total, color, emoji) {
        const pct = total > 0 ? (count / total * 100) : 0;
        return `
            <div class="flex items-center gap-3">
                <span class="text-lg">${emoji}</span>
                <span class="text-sm text-gray-600 w-20">${type}</span>
                <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" style="width: ${pct}%; background-color: ${color}"></div>
                </div>
                <span class="text-sm font-semibold text-gray-900 w-8 text-right">${count}</span>
                <span class="text-xs text-gray-400 w-12">(${pct.toFixed(0)}%)</span>
            </div>
        `;
    },

    renderSprintSummaryTable(sprint) {
        const rows = [
            { label: 'Total Issues', value: sprint.totalIssues || 0, icon: 'fas fa-tasks' },
            { label: 'Stories', value: sprint.totalStories || 0, icon: 'fas fa-book' },
            { label: 'Bugs', value: sprint.totalBugs || 0, icon: 'fas fa-bug' },
            { label: 'Tasks', value: sprint.totalTasks || 0, icon: 'fas fa-check' },
            { label: 'In Progress', value: sprint.inProgressIssues || 0, icon: 'fas fa-spinner' },
            { label: 'Completed', value: sprint.completedIssues || 0, icon: 'fas fa-check-circle' },
            { label: 'Dev Delivery (To QA)', value: `${sprint.devDeliveredStories || 0}/${sprint.totalStories || 0} (${(sprint.devDeliveryPercentage || 0).toFixed(1)}%)`, icon: 'fas fa-code' },
            { label: 'QA Delivery (Done)', value: `${sprint.qaDeliveredStories || 0}/${sprint.totalStories || 0} (${(sprint.qaDeliveryPercentage || 0).toFixed(1)}%)`, icon: 'fas fa-check-double' },
            { label: 'QA Tested', value: sprint.totalQaTested || 0, icon: 'fas fa-vial' },
            { label: 'QA Failed', value: sprint.qaFailed || 0, icon: 'fas fa-times-circle' },
            { label: 'Completion Rate', value: `${(sprint.completionPercentage || 0).toFixed(1)}%`, icon: 'fas fa-percentage' },
            { label: 'QA Failure Rate', value: `${(sprint.qaFailureRatio || 0).toFixed(1)}%`, icon: 'fas fa-exclamation-triangle' }
        ];

        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-100">
                            <th class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Metric</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr class="border-b border-gray-50 hover:bg-gray-50">
                                <td class="py-3 text-sm text-gray-600">
                                    <i class="${r.icon} text-gray-400 mr-2 w-4"></i>
                                    ${r.label}
                                </td>
                                <td class="py-3 text-sm font-semibold text-gray-900 text-right">${r.value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderStatusDistributionChart(sprint) {
        const ctx = document.getElementById('status-distribution-chart');
        if (!ctx) return;

        const completed = sprint.completedIssues || 0;
        const inProgress = sprint.inProgressIssues || 0;
        const total = sprint.totalIssues || 1;
        const remaining = Math.max(0, total - completed - inProgress);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress', 'Remaining'],
                datasets: [{
                    data: [completed, inProgress, remaining],
                    backgroundColor: ['#10b981', '#3b82f6', '#6b7280'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { display: false }
                }
            }
        });
    },

    renderVelocityChart() {
        const ctx = document.getElementById('velocity-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.velocityData.map(d => d.sprint),
                datasets: [{
                    label: 'Completed Issues',
                    data: this.velocityData.map(d => d.points),
                    backgroundColor: '#14b8a6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 }, color: '#6b7280' }
                    },
                    y: {
                        grid: { color: '#f3f4f6' },
                        ticks: { font: { size: 11 }, color: '#6b7280' }
                    }
                }
            }
        });
    },

    renderAssigneeChart(sprint) {
        const ctx = document.getElementById('assignee-chart');
        if (!ctx) return;

        const qaPassed = (sprint.totalQaTested || 0) - (sprint.qaFailed || 0);
        const qaFailed = sprint.qaFailed || 0;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['QA Results'],
                datasets: [
                    {
                        label: 'Passed',
                        data: [qaPassed],
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Failed',
                        data: [qaFailed],
                        backgroundColor: '#ef4444',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, padding: 15, font: { size: 11 } }
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { color: '#f3f4f6' },
                        ticks: { font: { size: 11 }, color: '#6b7280' }
                    },
                    y: {
                        stacked: true,
                        grid: { display: false },
                        ticks: { font: { size: 11 }, color: '#6b7280' }
                    }
                }
            }
        });
    }
};
