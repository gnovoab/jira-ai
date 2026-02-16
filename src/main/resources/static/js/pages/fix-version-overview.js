// Fix Version Overview Page - Lovable Design
const FixVersionOverview = {
    selectedVersion: null,
    versionsData: [],
    currentIssues: [],  // Store issues for modal access
    
    async render(container) {
        try {
            const versions = await API.getAllFixVersions();
            this.versionsData = versions;
            
            const html = `
                <div class="max-w-7xl mx-auto space-y-6">
                    <!-- Header -->
                    <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 class="text-2xl font-bold tracking-tight text-gray-900">Fix Version Metrics</h1>
                            <p id="version-subtitle" class="text-sm text-gray-500 mt-1">Release version analysis and QA metrics</p>
                        </div>
                        <select id="version-selector" class="w-52 px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500" onchange="FixVersionOverview.loadVersionDetails(this.value)">
                            <option value="">All Versions Overview</option>
                            ${versions.map(v => `<option value="${v.versionName}">${v.versionName}</option>`).join('')}
                        </select>
                    </header>
                    
                    <!-- Content -->
                    <div id="fix-version-content">
                        ${this.renderAllVersionsOverview(versions)}
                    </div>
                </div>
            `;
            
            container.innerHTML = html;
            
            // Render charts after DOM update
            setTimeout(() => this.renderOverviewCharts(), 100);
            
        } catch (error) {
            console.error('Fix Version Overview render error:', error);
            throw error;
        }
    },
    
    async loadVersionDetails(versionName) {
        const contentContainer = document.getElementById('fix-version-content');
        
        if (!versionName) {
            // Show all versions overview
            contentContainer.innerHTML = this.renderAllVersionsOverview(this.versionsData);
            setTimeout(() => this.renderOverviewCharts(), 100);
            return;
        }
        
        this.selectedVersion = versionName;
        contentContainer.innerHTML = App.getLoadingHTML();
        
        try {
            const version = await API.getFixVersionById(versionName);
            document.getElementById('version-subtitle').textContent = `Release ${versionName} - ${version.totalIssues} issues`;
            contentContainer.innerHTML = this.renderVersionDetails(version);
            setTimeout(() => this.renderVersionCharts(version), 100);

            // Load and render issues
            this.loadVersionIssues(versionName);
        } catch (error) {
            console.error('Error loading version details:', error);
            contentContainer.innerHTML = App.getErrorHTML(error.message);
        }
    },

    async loadVersionIssues(versionName) {
        const issuesContainer = document.getElementById('version-issues-container');
        const workDistContainer = document.getElementById('version-work-distribution');

        try {
            const issues = await API.getFixVersionIssues(versionName);
            this.currentIssues = issues;  // Store for modal access

            if (issuesContainer) {
                issuesContainer.innerHTML = this.renderIssueList(issues);
            }
            if (workDistContainer) {
                workDistContainer.innerHTML = this.renderWorkDistribution(issues);
            }
        } catch (error) {
            console.error('Error loading version issues:', error);
            if (issuesContainer) {
                issuesContainer.innerHTML = `<p class="text-red-500 text-sm">Failed to load issues: ${error.message}</p>`;
            }
            if (workDistContainer) {
                workDistContainer.innerHTML = `<p class="text-red-500 text-sm">Failed to load team distribution</p>`;
            }
        }
    },

    renderIssueList(issues) {
        if (!issues || issues.length === 0) {
            return '<p class="text-gray-500 text-sm">No issues found for this version.</p>';
        }

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

        const rows = issues.map((issue, index) => `
            <tr class="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                onclick="FixVersionOverview.showIssueModal(${index})">
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
        `).join('');

        return `
            <!-- Issue Modal -->
            <div id="issue-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div id="issue-modal-content"></div>
                </div>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Key</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Summary</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Type</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Status</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Assignee</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Dev Delivery</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">QA Delivery</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
            <p class="text-xs text-gray-400 mt-3">Click on a row to view details • ${issues.length} issues total</p>
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
                    <button onclick="FixVersionOverview.closeIssueModal()"
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
                <button onclick="FixVersionOverview.closeIssueModal()"
                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors">
                    Close
                </button>
            </div>
        `;

        const modal = document.getElementById('issue-modal');
        const modalContentEl = document.getElementById('issue-modal-content');
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
        const modal = document.getElementById('issue-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
        document.removeEventListener('keydown', this.handleEscapeKey);
    },

    handleEscapeKey(e) {
        if (e.key === 'Escape') {
            FixVersionOverview.closeIssueModal();
            FixVersionOverview.closeMemberModal();
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
                    devDelivered: 0,
                    qaDelivered: 0,
                    bugs: 0,
                    stories: 0
                };
            }
            grouped[assignee].issues.push(issue);

            // Count metrics
            if (issue.status === 'Completed' || issue.status === 'Done' || issue.status === 'Ready for merge') {
                grouped[assignee].completed++;
            } else if (issue.status === 'In Progress' || issue.status === 'QA' || issue.status === 'Ready for Test') {
                grouped[assignee].inProgress++;
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
                     onclick="FixVersionOverview.showMemberModal('${member.name.replace(/'/g, "\\'")}')">
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
                    <div class="grid grid-cols-4 gap-2 text-center">
                        <div>
                            <div class="text-lg font-bold text-gray-900">${member.completed}</div>
                            <div class="text-xs text-gray-500">Done</div>
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
                    </div>
                </div>
            `;
        }).join('');

        return `
            <!-- Member Modal -->
            <div id="version-member-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                <div class="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                    <div id="version-member-modal-content"></div>
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

        const issueRows = memberIssues.map(issue => `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
                <td class="py-2 px-3">
                    <span class="text-blue-600 font-medium text-sm">${issue.key}</span>
                </td>
                <td class="py-2 px-3 text-sm text-gray-700 max-w-xs truncate" title="${issue.summary}">${issue.summary}</td>
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
                    <button onclick="FixVersionOverview.closeMemberModal()"
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
                <button onclick="FixVersionOverview.closeMemberModal()"
                        class="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors">
                    Close
                </button>
            </div>
        `;

        const modal = document.getElementById('version-member-modal');
        const modalContentEl = document.getElementById('version-member-modal-content');
        if (modal && modalContentEl) {
            modalContentEl.innerHTML = modalContent;
            modal.classList.remove('hidden');
            modal.onclick = (e) => {
                if (e.target === modal) this.closeMemberModal();
            };
        }
    },

    closeMemberModal() {
        const modal = document.getElementById('version-member-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    },

    renderAllVersionsOverview(versions) {
        const totalIssues = versions.reduce((sum, v) => sum + v.totalIssues, 0);
        const totalCompleted = versions.reduce((sum, v) => sum + v.completedIssues, 0);
        const totalQaFailed = versions.reduce((sum, v) => sum + v.qaFailed, 0);
        const avgCompletion = totalIssues > 0 ? (totalCompleted / totalIssues * 100) : 0;
        
        return `
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                ${this.renderMetricCard('Total Versions', versions.length, '', 'fas fa-tags')}
                ${this.renderMetricCard('Total Issues', totalIssues, `${totalCompleted} completed`, 'fas fa-tasks')}
                ${this.renderMetricCard('Avg Completion', `${avgCompletion.toFixed(0)}%`, '', 'fas fa-bullseye')}
                ${this.renderMetricCard('QA Failures', totalQaFailed, 'across all versions', 'fas fa-times-circle')}
            </div>
            
            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Issues by Version -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Issues by Version</h3>
                    <div class="h-64">
                        <canvas id="version-issues-chart"></canvas>
                    </div>
                </div>
                
                <!-- Completion by Version -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Completion Rate by Version</h3>
                    <div class="h-64">
                        <canvas id="version-completion-chart"></canvas>
                    </div>
                </div>
            </div>
            
            <!-- Versions Table -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">All Fix Versions</h3>
                ${this.renderVersionsTable(versions)}
            </div>
        `;
    },
    
    renderVersionDetails(version) {
        return `
            <!-- Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                ${this.renderMetricCard('Total Issues', version.totalIssues, '', 'fas fa-tasks')}
                ${this.renderMetricCard('Completion', `${version.completionPercentage.toFixed(0)}%`, `${version.completedIssues}/${version.totalIssues}`, 'fas fa-bullseye')}
                ${this.renderMetricCard('Bugs', version.totalBugs, 'in this version', 'fas fa-bug')}
                ${this.renderMetricCard('QA Failed', version.qaFailed, `${version.qaFailureRatio.toFixed(1)}% rate`, 'fas fa-times-circle')}
            </div>
            
            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <!-- Status Distribution -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Status Distribution</h3>
                    <div class="flex items-center gap-6">
                        <div class="h-44 w-44 flex-shrink-0">
                            <canvas id="version-status-chart"></canvas>
                        </div>
                        <div class="flex flex-col gap-2 flex-1">
                            ${this.renderStatusLegend(version)}
                        </div>
                    </div>
                </div>
                
                <!-- Issue Type Breakdown -->
                <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Issue Type Breakdown</h3>
                    <div class="space-y-3">
                        ${this.renderIssueTypeRow('Story', version.totalStories, version.totalIssues, '#3b82f6', '📘')}
                        ${this.renderIssueTypeRow('Bug', version.totalBugs, version.totalIssues, '#ef4444', '🐛')}
                        ${this.renderIssueTypeRow('Task', version.totalTasks, version.totalIssues, '#10b981', '✅')}
                        ${this.renderIssueTypeRow('Sub-task', version.totalSubTasks, version.totalIssues, '#8b5cf6', '📎')}
                    </div>
                </div>
            </div>
            
            <!-- Summary Table -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Version Summary</h3>
                ${this.renderSummaryTable(version)}
            </div>

            <!-- Work Distribution by Team Member -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Work Distribution by Team Member</h3>
                <div id="version-work-distribution">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span class="ml-3 text-gray-500">Loading team distribution...</span>
                    </div>
                </div>
            </div>

            <!-- Version Issues List -->
            <div class="bg-white rounded-lg border border-gray-200 p-5 shadow-sm mt-6">
                <h3 class="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-4">Version Issues</h3>
                <div id="version-issues-container">
                    <div class="flex items-center justify-center py-8">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span class="ml-3 text-gray-500">Loading issues...</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderMetricCard(label, value, subtitle, icon) {
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
            </div>
        `;
    },

    renderStatusLegend(version) {
        const completed = version.completedIssues || 0;
        const inProgress = version.inProgressIssues || 0;
        const total = version.totalIssues || 1;
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

    renderVersionsTable(versions) {
        return `
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead>
                        <tr class="border-b border-gray-100">
                            <th class="text-left text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Version</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Issues</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Bugs</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Stories</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Completed</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">QA Failed</th>
                            <th class="text-right text-xs font-semibold uppercase tracking-wider text-gray-500 py-3">Completion %</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${versions.map(v => `
                            <tr class="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onclick="document.getElementById('version-selector').value='${v.versionName}'; FixVersionOverview.loadVersionDetails('${v.versionName}')">
                                <td class="py-3 text-sm font-medium text-blue-600">${v.versionName}</td>
                                <td class="py-3 text-sm text-gray-900 text-right">${v.totalIssues}</td>
                                <td class="py-3 text-sm text-gray-900 text-right">${v.totalBugs}</td>
                                <td class="py-3 text-sm text-gray-900 text-right">${v.totalStories}</td>
                                <td class="py-3 text-sm text-gray-900 text-right">${v.completedIssues}</td>
                                <td class="py-3 text-sm text-right ${v.qaFailed > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}">${v.qaFailed}</td>
                                <td class="py-3 text-sm font-semibold text-right ${v.completionPercentage >= 80 ? 'text-green-600' : v.completionPercentage >= 50 ? 'text-yellow-600' : 'text-red-600'}">${v.completionPercentage.toFixed(0)}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderSummaryTable(version) {
        const rows = [
            { label: 'Total Issues', value: version.totalIssues, icon: 'fas fa-tasks' },
            { label: 'Stories', value: version.totalStories, icon: 'fas fa-book' },
            { label: 'Bugs', value: version.totalBugs, icon: 'fas fa-bug' },
            { label: 'Tasks', value: version.totalTasks, icon: 'fas fa-check' },
            { label: 'Completed', value: version.completedIssues, icon: 'fas fa-check-circle' },
            { label: 'In Progress', value: version.inProgressIssues, icon: 'fas fa-spinner' },
            { label: 'QA Tested', value: version.totalQaTested, icon: 'fas fa-vial' },
            { label: 'QA Failed', value: version.qaFailed, icon: 'fas fa-times-circle' },
            { label: 'Completion Rate', value: `${version.completionPercentage.toFixed(1)}%`, icon: 'fas fa-percentage' },
            { label: 'QA Failure Rate', value: `${version.qaFailureRatio.toFixed(1)}%`, icon: 'fas fa-exclamation-triangle' }
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

    renderOverviewCharts() {
        this.renderVersionIssuesChart();
        this.renderVersionCompletionChart();
    },

    renderVersionIssuesChart() {
        const ctx = document.getElementById('version-issues-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.versionsData.map(v => v.versionName),
                datasets: [{
                    label: 'Total Issues',
                    data: this.versionsData.map(v => v.totalIssues),
                    backgroundColor: '#3b82f6',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#6b7280' } },
                    y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, color: '#6b7280' } }
                }
            }
        });
    },

    renderVersionCompletionChart() {
        const ctx = document.getElementById('version-completion-chart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.versionsData.map(v => v.versionName),
                datasets: [{
                    label: 'Completion %',
                    data: this.versionsData.map(v => v.completionPercentage),
                    backgroundColor: this.versionsData.map(v =>
                        v.completionPercentage >= 80 ? '#10b981' :
                        v.completionPercentage >= 50 ? '#f59e0b' : '#ef4444'
                    ),
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#6b7280' } },
                    y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, color: '#6b7280' }, max: 100 }
                }
            }
        });
    },

    renderVersionCharts(version) {
        const ctx = document.getElementById('version-status-chart');
        if (!ctx) return;

        const completed = version.completedIssues || 0;
        const inProgress = version.inProgressIssues || 0;
        const total = version.totalIssues || 1;
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
                plugins: { legend: { display: false } }
            }
        });
    }
};

