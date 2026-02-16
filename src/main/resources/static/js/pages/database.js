// Database Page with Admin Functions
const Database = {
    async render(container) {
        try {
            const adminStatus = await API.getAdminStatus();

            const html = `
                <!-- Database Status -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-lg font-semibold text-gray-900">Database Status</h3>
                        <span class="badge ${adminStatus.exists ? 'badge-success' : 'badge-danger'}">
                            <i class="fas fa-circle mr-1"></i>
                            ${adminStatus.exists ? 'Available' : 'Unavailable'}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div class="p-4 bg-blue-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-blue-600 mb-1">Total Issues</p>
                                    <p class="text-3xl font-bold text-blue-900">${adminStatus.totalIssues || 0}</p>
                                </div>
                                <i class="fas fa-tasks text-blue-600 text-3xl"></i>
                            </div>
                        </div>

                        <div class="p-4 bg-green-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-green-600 mb-1">Total Sprints</p>
                                    <p class="text-3xl font-bold text-green-900">${adminStatus.totalSprints || 0}</p>
                                </div>
                                <i class="fas fa-running text-green-600 text-3xl"></i>
                            </div>
                        </div>

                        <div class="p-4 bg-purple-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-purple-600 mb-1">File Size</p>
                                    <p class="text-lg font-bold text-purple-900">${adminStatus.fileSizeMB || '0'} MB</p>
                                </div>
                                <i class="fas fa-database text-purple-600 text-3xl"></i>
                            </div>
                        </div>

                        <div class="p-4 bg-orange-50 rounded-lg">
                            <div class="flex items-center justify-between">
                                <div>
                                    <p class="text-sm text-orange-600 mb-1">Last Updated</p>
                                    <p class="text-sm font-bold text-orange-900">${this.formatDate(adminStatus.lastUpdated)}</p>
                                </div>
                                <i class="fas fa-clock text-orange-600 text-3xl"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Help Modal -->
                <div id="credentials-help-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden flex items-center justify-center p-4">
                    <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div class="p-6">
                            <div class="flex items-center justify-between mb-4">
                                <h3 class="text-xl font-bold text-gray-900">
                                    <i class="fas fa-question-circle text-blue-600 mr-2"></i>How to Get Jira Credentials
                                </h3>
                                <button onclick="Database.closeHelpModal()" class="text-gray-400 hover:text-gray-600">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            <div class="space-y-4 text-sm text-gray-700">
                                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p class="font-semibold text-blue-800 mb-2">📋 Quick Steps:</p>
                                    <ol class="list-decimal list-inside space-y-2 text-blue-900">
                                        <li>Log into <strong>Jira</strong> in your browser</li>
                                        <li>Open <strong>Developer Tools</strong> (F12 or Cmd+Option+I)</li>
                                        <li>Go to <strong>Application</strong> tab → <strong>Cookies</strong></li>
                                        <li>Select your Jira domain (e.g., gspcloud.atlassian.net)</li>
                                        <li>Copy the values for the 3 cookies below</li>
                                    </ol>
                                </div>

                                <div class="border border-gray-200 rounded-lg p-4">
                                    <p class="font-semibold text-gray-800 mb-3">🍪 Required Cookies:</p>
                                    <table class="w-full text-xs">
                                        <tr class="border-b">
                                            <td class="py-2 font-mono text-purple-700">atlassian.xsrf.token</td>
                                            <td class="py-2 text-gray-500">Short hash (e.g., ce90951e1db45bc...)</td>
                                        </tr>
                                        <tr class="border-b">
                                            <td class="py-2 font-mono text-purple-700">atlassian.account.xsrf.token</td>
                                            <td class="py-2 text-gray-500">UUID format (e.g., 4f579402-79a4-488a...)</td>
                                        </tr>
                                        <tr>
                                            <td class="py-2 font-mono text-purple-700">tenant.session.token</td>
                                            <td class="py-2 text-gray-500">Long JWT token (starts with eyJ...)</td>
                                        </tr>
                                    </table>
                                </div>

                                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <p class="font-semibold text-yellow-800 mb-2">⚠️ Important Notes:</p>
                                    <ul class="list-disc list-inside space-y-1 text-yellow-900">
                                        <li>Cookies expire when your Jira session ends</li>
                                        <li>You'll need to refresh them if you log out of Jira</li>
                                        <li>These credentials are only used for this request</li>
                                    </ul>
                                </div>

                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <p class="font-semibold text-gray-800 mb-2">🖼️ Where to Find:</p>
                                    <p class="text-gray-600">Chrome/Edge: DevTools → Application → Storage → Cookies</p>
                                    <p class="text-gray-600">Firefox: DevTools → Storage → Cookies</p>
                                </div>
                            </div>

                            <div class="mt-6 flex justify-end">
                                <button onclick="Database.closeHelpModal()"
                                        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    Got it!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Jira Fetch Section -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">
                            <i class="fab fa-jira text-blue-600 mr-2"></i>Fetch from Jira
                            <button onclick="Database.showHelpModal()" class="ml-2 text-gray-400 hover:text-blue-600" title="How to get credentials">
                                <i class="fas fa-question-circle"></i>
                            </button>
                        </h3>
                        <span class="text-xs text-gray-500">Enter your browser session credentials</span>
                    </div>

                    <!-- Credentials Form -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">atlassian.xsrf.token</label>
                            <input type="text" id="xsrf-token-input" placeholder="atlassian.xsrf.token cookie value"
                                   class="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">atlassian.account.xsrf.token</label>
                            <input type="text" id="account-xsrf-token-input" placeholder="atlassian.account.xsrf.token"
                                   class="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">tenant.session.token</label>
                            <input type="text" id="tenant-token-input" placeholder="tenant.session.token"
                                   class="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500">
                        </div>
                    </div>

                    <!-- Fetch Buttons -->
                    <div class="flex flex-wrap gap-4">
                        <button id="delta-update-btn" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            <i class="fas fa-sync-alt"></i> Update Active Sprints
                        </button>
                        <button id="fetch-new-btn" class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                            <i class="fas fa-download"></i> Fetch New Sprints
                        </button>
                    </div>

                    <div id="fetch-message" class="mt-4 hidden"></div>
                    <div id="fetch-progress" class="mt-4 hidden">
                        <div class="flex items-center gap-2 text-blue-600">
                            <i class="fas fa-spinner fa-spin"></i>
                            <span id="fetch-progress-text">Fetching data from Jira...</span>
                        </div>
                    </div>
                </div>

                <!-- Admin Actions -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Cache Management</h3>
                    <div class="flex flex-wrap gap-4">
                        <button id="refresh-cache-btn" class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
                            <i class="fas fa-sync-alt"></i> Refresh Cache
                        </button>
                    </div>
                    <div id="admin-message" class="mt-4 hidden"></div>
                </div>

                <!-- Sprint List -->
                <div class="bg-white rounded-lg shadow-sm p-6 card">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Sprints in Database</h3>
                    ${this.renderSprintList(adminStatus.sprints || [])}
                </div>
            `;

            container.innerHTML = html;
            this.setupEventListeners();

        } catch (error) {
            console.error('Database render error:', error);
            throw error;
        }
    },

    setupEventListeners() {
        // Refresh Cache button
        document.getElementById('refresh-cache-btn')?.addEventListener('click', async () => {
            await this.refreshCache();
        });

        // Delta Update button
        document.getElementById('delta-update-btn')?.addEventListener('click', async () => {
            await this.handleDeltaUpdate();
        });

        // Fetch New Sprints button
        document.getElementById('fetch-new-btn')?.addEventListener('click', async () => {
            await this.handleFetchNew();
        });
    },

    async refreshCache() {
        this.showMessage('Refreshing cache...', 'info');
        try {
            const result = await API.refreshCache();
            this.showMessage('Cache refreshed successfully!', 'success');
            // Reload page after short delay
            setTimeout(() => App.loadPage('database'), 1000);
        } catch (error) {
            this.showMessage(`Error: ${error.message}`, 'error');
        }
    },

    getCredentials() {
        const xsrfToken = document.getElementById('xsrf-token-input')?.value?.trim();
        const accountXsrfToken = document.getElementById('account-xsrf-token-input')?.value?.trim();
        const tenantSessionToken = document.getElementById('tenant-token-input')?.value?.trim();

        if (!xsrfToken || !accountXsrfToken || !tenantSessionToken) {
            return null;
        }

        return { xsrfToken, accountXsrfToken, tenantSessionToken };
    },

    async handleDeltaUpdate() {
        const credentials = this.getCredentials();
        if (!credentials) {
            this.showFetchMessage('Please enter all three credentials', 'error');
            return;
        }

        this.showFetchProgress('Checking for active sprints...');
        try {
            const result = await API.deltaUpdate(credentials);
            this.hideFetchProgress();

            if (result.updated === 0) {
                this.showFetchMessage(result.message || 'No active sprints found.', 'info');
            } else {
                const updates = result.updates || [];
                const summary = updates.map(u => `Sprint ${u.sprintId}: ${u.oldIssueCount} → ${u.newIssueCount} (${u.delta >= 0 ? '+' : ''}${u.delta})`).join(', ');
                this.showFetchMessage(`Updated ${result.updated} sprint(s): ${summary}`, 'success');
                setTimeout(() => App.loadPage('database'), 2000);
            }
        } catch (error) {
            this.hideFetchProgress();
            this.showFetchMessage(`Delta update failed: ${error.message}`, 'error');
        }
    },

    async handleFetchNew() {
        const credentials = this.getCredentials();
        if (!credentials) {
            this.showFetchMessage('Please enter all three credentials', 'error');
            return;
        }

        this.showFetchProgress('Discovering sprints from Jira...');
        try {
            const result = await API.fetchNewSprints(credentials);
            this.hideFetchProgress();

            if (result.totalFetched === 0) {
                this.showFetchMessage(result.message || 'All sprints already in database.', 'info');
            } else {
                const fetched = result.fetched || [];
                const summary = fetched.map(f => `Sprint ${f.sprintId} (${f.issueCount} issues)`).join(', ');
                this.showFetchMessage(`Fetched ${result.totalFetched} new sprint(s): ${summary}`, 'success');
                setTimeout(() => App.loadPage('database'), 2000);
            }
        } catch (error) {
            this.hideFetchProgress();
            this.showFetchMessage(`Fetch failed: ${error.message}`, 'error');
        }
    },

    showFetchProgress(text) {
        const progressEl = document.getElementById('fetch-progress');
        const textEl = document.getElementById('fetch-progress-text');
        if (progressEl) progressEl.classList.remove('hidden');
        if (textEl) textEl.textContent = text;
        document.getElementById('fetch-message')?.classList.add('hidden');
    },

    hideFetchProgress() {
        document.getElementById('fetch-progress')?.classList.add('hidden');
    },

    showFetchMessage(message, type) {
        const msgEl = document.getElementById('fetch-message');
        if (!msgEl) return;

        const colors = {
            'info': 'bg-blue-100 text-blue-800 border-blue-200',
            'success': 'bg-green-100 text-green-800 border-green-200',
            'error': 'bg-red-100 text-red-800 border-red-200'
        };

        msgEl.className = `mt-4 p-3 rounded-lg border ${colors[type] || colors.info}`;
        msgEl.textContent = message;
        msgEl.classList.remove('hidden');
    },

    showMessage(message, type) {
        const msgEl = document.getElementById('admin-message');
        if (!msgEl) return;

        const colors = {
            'info': 'bg-blue-100 text-blue-800 border-blue-200',
            'success': 'bg-green-100 text-green-800 border-green-200',
            'error': 'bg-red-100 text-red-800 border-red-200'
        };

        msgEl.className = `mt-4 p-3 rounded-lg border ${colors[type] || colors.info}`;
        msgEl.textContent = message;
        msgEl.classList.remove('hidden');
    },

    renderSprintList(sprints) {
        if (!sprints || sprints.length === 0) {
            return '<p class="text-gray-500 text-center py-4">No sprints in database</p>';
        }

        return `
            <div class="overflow-x-auto">
                <table class="w-full text-left">
                    <thead>
                        <tr class="border-b border-gray-200">
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Sprint ID</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Issues</th>
                            <th class="py-3 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">Fetched At</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sprints.map(sprint => `
                            <tr class="border-b border-gray-100 hover:bg-gray-50">
                                <td class="py-3 px-4 font-medium text-blue-600">${sprint.sprintId}</td>
                                <td class="py-3 px-4">${sprint.issueCount}</td>
                                <td class="py-3 px-4 text-sm text-gray-500">${this.formatDate(sprint.fetchedAt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    },

    showHelpModal() {
        document.getElementById('credentials-help-modal')?.classList.remove('hidden');
    },

    closeHelpModal() {
        document.getElementById('credentials-help-modal')?.classList.add('hidden');
    }
};

