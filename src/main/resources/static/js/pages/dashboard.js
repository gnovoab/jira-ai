// Dashboard Page
const Dashboard = {
    currentSlide: 0,
    totalSlides: 4,  // 4 slides with 2 charts each
    chartInstances: {},
    allIssuesOriginal: [],  // Store all issues (unfiltered)
    allIssues: [],   // Store filtered issues for modals
    allSprintsData: [],  // Store all sprints (unfiltered)
    filteredSprintsData: [],  // Store filtered sprints
    fromSprintIndex: 0,  // Starting sprint index (0 = all)

    async render(container) {
        try {
            // Fetch all required data
            const [sprints, qaSummary, dbStatus] = await Promise.all([
                API.getAllSprints(),
                API.getQaSummary(),
                API.getDatabaseStatus()
            ]);

            // Sort sprints by date for consistent ordering
            const sortedSprints = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

            // Store all sprints (unfiltered)
            this.allSprintsData = sortedSprints;
            this.filteredSprintsData = sortedSprints;
            this.sprintsData = sortedSprints;

            // Fetch all issues from all sprints for team member charts
            const issuePromises = sortedSprints.map(s => API.getSprintIssues(s.sprintName).catch(() => []));
            const issueArrays = await Promise.all(issuePromises);
            // Store issues with sprint name for filtering
            this.allIssuesOriginal = issueArrays.flatMap((issues, i) =>
                issues.map(issue => ({ ...issue, _sprintName: sortedSprints[i].sprintName }))
            );
            this.allIssues = this.allIssuesOriginal;

            // Calculate total issues from filtered sprints
            const totalIssuesCount = sortedSprints.reduce((sum, s) => sum + (s.totalIssues || 0), 0);

            const html = `
                <!-- Sprint Range Filter -->
                <div class="bg-white rounded-lg shadow-sm p-4 mb-6 card">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="flex items-center gap-2">
                            <i class="fas fa-filter text-gray-500"></i>
                            <span class="text-sm font-medium text-gray-700">Data Range:</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-sm text-gray-600">From:</label>
                            <select id="from-sprint-select" onchange="Dashboard.applySprintFilter()"
                                    class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <option value="0">All Sprints (Beginning)</option>
                                ${sortedSprints.map((s, i) => `<option value="${i}">${s.sprintName.replace('Calandria ', '')}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex items-center gap-2">
                            <label class="text-sm text-gray-600">To:</label>
                            <select id="to-sprint-select" onchange="Dashboard.applySprintFilter()"
                                    class="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                ${sortedSprints.map((s, i) => `<option value="${i}" ${i === sortedSprints.length - 1 ? 'selected' : ''}>${s.sprintName.replace('Calandria ', '')}</option>`).join('')}
                            </select>
                        </div>
                        <span id="sprint-range-info" class="text-sm text-gray-500 ml-auto">
                            Showing ${sortedSprints.length} sprints
                        </span>
                    </div>
                </div>

                <!-- Stats Cards -->
                <div id="stats-cards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    ${this.renderStatsCards(sortedSprints, qaSummary)}
                </div>

                <!-- Charts Carousel - 2 charts visible at a time -->
                <div class="mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Sprint Analytics</h3>
                        <div class="flex items-center gap-2">
                            <button onclick="Dashboard.prevSlide()" class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                                <i class="fas fa-chevron-left text-gray-600"></i>
                            </button>
                            <span id="carousel-indicator" class="text-sm text-gray-500 min-w-[60px] text-center">1 / 4</span>
                            <button onclick="Dashboard.nextSlide()" class="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                                <i class="fas fa-chevron-right text-gray-600"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Carousel Container -->
                    <div class="relative overflow-hidden">
                        <div id="carousel-slides" class="flex transition-transform duration-300 ease-in-out">
                            <!-- Slide 1: Total Cards in Sprint + Cards Delivered -->
                            <div class="carousel-slide w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Total Cards in the Sprint</h4>
                                        <canvas id="chart-total-cards"></canvas>
                                    </div>
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Cards Delivered per Sprint</h4>
                                        <canvas id="chart-cards-delivered"></canvas>
                                    </div>
                                </div>
                            </div>
                            <!-- Slide 2: Sprint Completion + QA Failure Trend -->
                            <div class="carousel-slide w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Sprint Completion</h4>
                                        <canvas id="chart-completion"></canvas>
                                    </div>
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">QA Failure Trend</h4>
                                        <canvas id="chart-qa-trend"></canvas>
                                    </div>
                                </div>
                            </div>
                            <!-- Slide 3: Bug Count + Dev vs QA Delivery -->
                            <div class="carousel-slide w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Bug Count per Sprint</h4>
                                        <canvas id="chart-bugs"></canvas>
                                    </div>
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Dev vs QA Delivery Rate</h4>
                                        <canvas id="chart-dev-qa"></canvas>
                                    </div>
                                </div>
                            </div>
                            <!-- Slide 4: Team Member Charts -->
                            <div class="carousel-slide w-full flex-shrink-0">
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Cards Assigned per Team Member</h4>
                                        <canvas id="chart-team-assigned"></canvas>
                                    </div>
                                    <div class="bg-white rounded-lg shadow-sm p-6 card">
                                        <h4 class="text-lg font-semibold text-gray-900 mb-4">Cards Delivered per Team Member</h4>
                                        <canvas id="chart-team-delivered"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Dot Indicators -->
                    <div class="flex justify-center gap-2 mt-4">
                        ${[0,1,2,3].map(i => `<button onclick="Dashboard.goToSlide(${i})" class="carousel-dot w-2.5 h-2.5 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-gray-300'} transition-colors" data-slide="${i}"></button>`).join('')}
                    </div>
                </div>

                <!-- Sprint Summary Section -->
                <div class="bg-white rounded-lg shadow-sm p-6 card mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Sprint Summary</h3>
                        <select id="summary-sprint-select" onchange="Dashboard.updateSprintSummary()"
                                class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                            <option value="all">All Sprints</option>
                            ${sprints.map(s => `<option value="${s.sprintId}">${s.sprintName}</option>`).join('')}
                        </select>
                    </div>
                    <div id="sprint-summary-content" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        ${this.renderSprintSummaryCards(sprints, 'all')}
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
                    ${this.renderTopFailures(sortedSprints)}
                </div>
            `;

            container.innerHTML = html;

            // Render all carousel charts after DOM is updated
            setTimeout(() => {
                this.renderAllCarouselCharts(sortedSprints);
            }, 100);

        } catch (error) {
            console.error('Dashboard render error:', error);
            throw error;
        }
    },

    // Render stats cards (extracted for reuse)
    renderStatsCards(sprints, qaSummary) {
        const totalIssuesCount = sprints.reduce((sum, s) => sum + (s.totalIssues || 0), 0);
        const avgQaFailure = qaSummary ? (qaSummary.overallQaFailureRate || 0) :
            (sprints.reduce((sum, s) => sum + (s.qaFailureRatio || 0), 0) / sprints.length);
        const totalQaTested = qaSummary ? (qaSummary.totalQaTested || 0) :
            sprints.reduce((sum, s) => sum + (s.totalIssues || 0), 0);

        return `
            ${this.renderStatCard('Total Sprints', sprints.length, 'fas fa-running', 'stat-card')}
            ${this.renderStatCard('Total Issues', totalIssuesCount, 'fas fa-tasks', 'stat-card-success')}
            ${this.renderStatCard('QA Failure Rate', `${avgQaFailure.toFixed(1)}%`, 'fas fa-bug', 'stat-card-warning')}
            ${this.renderStatCard('Tested Issues', totalQaTested, 'fas fa-check-circle', 'stat-card-danger')}
        `;
    },

    // Apply sprint range filter
    applySprintFilter() {
        const fromSelect = document.getElementById('from-sprint-select');
        const toSelect = document.getElementById('to-sprint-select');

        if (!fromSelect || !toSelect || !this.allSprintsData) return;

        let fromIndex = parseInt(fromSelect.value);
        let toIndex = parseInt(toSelect.value);

        // Ensure from <= to
        if (fromIndex > toIndex) {
            toIndex = fromIndex;
            toSelect.value = toIndex;
        }

        // Filter sprints
        this.filteredSprintsData = this.allSprintsData.slice(fromIndex, toIndex + 1);
        this.sprintsData = this.filteredSprintsData;

        // Filter issues to match filtered sprints
        const filteredSprintNames = new Set(this.filteredSprintsData.map(s => s.sprintName));
        this.allIssues = this.allIssuesOriginal.filter(issue => filteredSprintNames.has(issue._sprintName));

        // Update info text
        const infoSpan = document.getElementById('sprint-range-info');
        if (infoSpan) {
            if (fromIndex === 0 && toIndex === this.allSprintsData.length - 1) {
                infoSpan.textContent = `Showing all ${this.filteredSprintsData.length} sprints`;
            } else {
                infoSpan.textContent = `Showing ${this.filteredSprintsData.length} of ${this.allSprintsData.length} sprints`;
            }
        }

        // Update stats cards
        const statsContainer = document.getElementById('stats-cards');
        if (statsContainer) {
            // Calculate filtered QA summary
            const avgQaFailure = this.filteredSprintsData.reduce((sum, s) => sum + (s.qaFailureRatio || 0), 0) / this.filteredSprintsData.length;
            statsContainer.innerHTML = this.renderStatsCards(this.filteredSprintsData, {
                overallQaFailureRate: avgQaFailure,
                totalQaTested: this.filteredSprintsData.reduce((sum, s) => sum + (s.totalIssues || 0), 0)
            });
        }

        // Update sprint summary dropdown options
        const summarySelect = document.getElementById('summary-sprint-select');
        if (summarySelect) {
            summarySelect.innerHTML = `
                <option value="all">All Sprints</option>
                ${this.filteredSprintsData.map(s => `<option value="${s.sprintId}">${s.sprintName}</option>`).join('')}
            `;
        }

        // Update sprint summary content
        const summaryContent = document.getElementById('sprint-summary-content');
        if (summaryContent) {
            summaryContent.innerHTML = this.renderSprintSummaryCards(this.filteredSprintsData, 'all');
        }

        // Update recent sprints table
        const recentTable = document.querySelector('.overflow-x-auto');
        if (recentTable) {
            recentTable.innerHTML = this.renderSprintsTable(this.filteredSprintsData.slice(-5).reverse());
        }

        // Update top failures
        const topFailuresContainer = document.querySelector('.bg-white.rounded-lg.shadow-sm.p-6.card.mt-6');
        if (topFailuresContainer) {
            const failuresContent = topFailuresContainer.querySelector('div:last-child');
            if (failuresContent && failuresContent.classList.contains('space-y-3')) {
                failuresContent.outerHTML = this.renderTopFailures(this.filteredSprintsData);
            }
        }

        // Re-render charts with filtered data
        this.renderAllCarouselCharts(this.filteredSprintsData);
    },

    // Carousel Navigation
    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.totalSlides) % this.totalSlides;
        this.updateCarousel();
    },

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.totalSlides;
        this.updateCarousel();
    },

    goToSlide(index) {
        this.currentSlide = index;
        this.updateCarousel();
    },

    updateCarousel() {
        const slides = document.getElementById('carousel-slides');
        if (slides) {
            slides.style.transform = `translateX(-${this.currentSlide * 100}%)`;
        }

        // Update indicator
        const indicator = document.getElementById('carousel-indicator');
        if (indicator) {
            indicator.textContent = `${this.currentSlide + 1} / ${this.totalSlides}`;
        }

        // Update dots
        document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
            dot.classList.toggle('bg-blue-600', i === this.currentSlide);
            dot.classList.toggle('bg-gray-300', i !== this.currentSlide);
        });
    },

    // Sprint Summary Methods
    renderSprintSummaryCards(sprints, selectedSprintId) {
        let data;
        if (selectedSprintId === 'all') {
            data = {
                totalDelivered: sprints.reduce((sum, s) => sum + (s.completedIssues || 0), 0),
                avgCompletion: (sprints.reduce((sum, s) => sum + (s.completionPercentage || 0), 0) / sprints.length).toFixed(1),
                avgQaFailure: (sprints.reduce((sum, s) => sum + (s.qaFailureRatio || 0), 0) / sprints.length).toFixed(1),
                totalBugs: sprints.reduce((sum, s) => sum + (s.totalBugs || 0), 0)
            };
        } else {
            const sprint = sprints.find(s => s.sprintId === selectedSprintId);
            if (sprint) {
                data = {
                    totalDelivered: sprint.completedIssues || 0,
                    avgCompletion: (sprint.completionPercentage || 0).toFixed(1),
                    avgQaFailure: (sprint.qaFailureRatio || 0).toFixed(1),
                    totalBugs: sprint.totalBugs || 0
                };
            } else {
                data = { totalDelivered: 0, avgCompletion: '0.0', avgQaFailure: '0.0', totalBugs: 0 };
            }
        }

        return `
            <div class="flex justify-between items-center p-4 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors" onclick="Dashboard.showDeliveredModal('${selectedSprintId}')">
                <span class="text-sm text-gray-600">Total Delivered</span>
                <span class="text-2xl font-bold text-green-600">${data.totalDelivered}</span>
            </div>
            <div class="flex justify-between items-center p-4 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors" onclick="Dashboard.showCompletionModal('${selectedSprintId}')">
                <span class="text-sm text-gray-600">${selectedSprintId === 'all' ? 'Avg ' : ''}Completion Rate</span>
                <span class="text-2xl font-bold text-blue-600">${data.avgCompletion}%</span>
            </div>
            <div class="flex justify-between items-center p-4 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onclick="Dashboard.showQaFailuresModal('${selectedSprintId}')">
                <span class="text-sm text-gray-600">${selectedSprintId === 'all' ? 'Avg ' : ''}QA Failure Rate</span>
                <span class="text-2xl font-bold text-red-600">${data.avgQaFailure}%</span>
            </div>
            <div class="flex justify-between items-center p-4 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors" onclick="Dashboard.showBugsModal('${selectedSprintId}')">
                <span class="text-sm text-gray-600">Total Bugs</span>
                <span class="text-2xl font-bold text-yellow-600">${data.totalBugs}</span>
            </div>
        `;
    },

    updateSprintSummary() {
        const select = document.getElementById('summary-sprint-select');
        const content = document.getElementById('sprint-summary-content');
        if (select && content && this.sprintsData) {
            content.innerHTML = this.renderSprintSummaryCards(this.sprintsData, select.value);
        }
    },

    renderAllCarouselCharts(sprints) {
        const sortedSprints = [...sprints].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        const labels = sortedSprints.map(s => s.sprintName.replace('Calandria Sprint ', 'Sprint ').replace('Calandri Sprint ', 'Sprint '));

        // Destroy existing charts
        Object.values(this.chartInstances).forEach(chart => chart.destroy());
        this.chartInstances = {};

        // Chart 1: Total Cards in Sprint (stacked by type) - Clickable
        const totalCardsCtx = document.getElementById('chart-total-cards');
        this.chartInstances.totalCards = new Chart(totalCardsCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Stories', data: sortedSprints.map(s => s.totalStories || 0), backgroundColor: '#10b981', borderRadius: 2 },
                    { label: 'Bugs', data: sortedSprints.map(s => s.totalBugs || 0), backgroundColor: '#ef4444', borderRadius: 2 },
                    { label: 'Tasks', data: sortedSprints.map(s => s.totalTasks || 0), backgroundColor: '#3b82f6', borderRadius: 2 },
                    { label: 'Sub-tasks', data: sortedSprints.map(s => s.totalSubTasks || 0), backgroundColor: '#8b5cf6', borderRadius: 2 },
                    { label: 'Other', data: sortedSprints.map(s => s.totalOther || 0), backgroundColor: '#6b7280', borderRadius: 2 }
                ]
            },
            options: {
                ...this.getStackedChartOptions('Total Cards'),
                onClick: (event, elements) => {
                    if (elements.length > 0) {
                        const datasetIndex = elements[0].datasetIndex;
                        const index = elements[0].index;
                        const sprintName = sortedSprints[index].sprintName;
                        const issueType = ['Story', 'Bug', 'Task', 'Sub-task', 'Other'][datasetIndex];
                        this.showIssuesByTypeModal(sprintName, issueType);
                    }
                }
            }
        });
        totalCardsCtx.style.cursor = 'pointer';

        // Chart 2: Cards Delivered per Sprint
        this.chartInstances.delivered = new Chart(document.getElementById('chart-cards-delivered'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Delivered',
                    data: sortedSprints.map(s => s.completedIssues || 0),
                    backgroundColor: '#10b981',
                    borderRadius: 4
                }]
            },
            options: this.getChartOptions('Cards Delivered')
        });

        // Chart 3: Completion Rate
        this.chartInstances.completion = new Chart(document.getElementById('chart-completion'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Completion %',
                    data: sortedSprints.map(s => s.completionPercentage || 0),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions('Completion %', 100)
        });

        // Chart 4: QA Failure Trend
        this.chartInstances.qa = new Chart(document.getElementById('chart-qa-trend'), {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'QA Failure Rate %',
                    data: sortedSprints.map(s => s.qaFailureRatio || 0),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: this.getChartOptions('Failure Rate %')
        });

        // Chart 5: Bug Count
        this.chartInstances.bugs = new Chart(document.getElementById('chart-bugs'), {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Bugs',
                    data: sortedSprints.map(s => s.totalBugs || 0),
                    backgroundColor: '#f59e0b',
                    borderRadius: 4
                }]
            },
            options: this.getChartOptions('Bug Count')
        });

        // Chart 6: Dev vs QA Delivery
        this.chartInstances.devqa = new Chart(document.getElementById('chart-dev-qa'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Dev Delivery %',
                        data: sortedSprints.map(s => s.devDeliveryPercentage || 0),
                        backgroundColor: '#06b6d4',
                        borderRadius: 4
                    },
                    {
                        label: 'QA Delivery %',
                        data: sortedSprints.map(s => s.qaDeliveryPercentage || 0),
                        backgroundColor: '#ec4899',
                        borderRadius: 4
                    }
                ]
            },
            options: { ...this.getChartOptions('Delivery %', 100), plugins: { legend: { display: true } } }
        });

        // Chart 7 & 8: Team Member Charts
        this.renderTeamMemberCharts();
    },

    renderTeamMemberCharts() {
        if (!this.allIssues || this.allIssues.length === 0) return;

        // Group issues by assignee
        const teamData = {};
        this.allIssues.forEach(issue => {
            const assignee = issue.assignee || 'Unassigned';
            if (!teamData[assignee]) {
                teamData[assignee] = { assigned: 0, delivered: 0 };
            }
            teamData[assignee].assigned++;
            if (issue.status === 'Done' || issue.status === 'Completed' || issue.status === 'Ready for merge') {
                teamData[assignee].delivered++;
            }
        });

        // Sort by assigned count and take top 10
        const sortedTeam = Object.entries(teamData)
            .sort((a, b) => b[1].assigned - a[1].assigned)
            .slice(0, 10);

        const teamLabels = sortedTeam.map(([name]) => name.split(' ')[0]); // First name only
        const assignedData = sortedTeam.map(([, data]) => data.assigned);
        const deliveredData = sortedTeam.map(([, data]) => data.delivered);

        // Chart 7: Cards Assigned per Team Member
        const assignedCtx = document.getElementById('chart-team-assigned');
        if (assignedCtx) {
            this.chartInstances.teamAssigned = new Chart(assignedCtx, {
                type: 'bar',
                data: {
                    labels: teamLabels,
                    datasets: [{
                        label: 'Assigned',
                        data: assignedData,
                        backgroundColor: '#3b82f6',
                        borderRadius: 4
                    }]
                },
                options: this.getHorizontalChartOptions('Cards Assigned')
            });
        }

        // Chart 8: Cards Delivered per Team Member
        const deliveredCtx = document.getElementById('chart-team-delivered');
        if (deliveredCtx) {
            this.chartInstances.teamDelivered = new Chart(deliveredCtx, {
                type: 'bar',
                data: {
                    labels: teamLabels,
                    datasets: [{
                        label: 'Delivered',
                        data: deliveredData,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    }]
                },
                options: this.getHorizontalChartOptions('Cards Delivered')
            });
        }
    },

    getHorizontalChartOptions(title) {
        return {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, title: { display: true, text: title } },
                y: { ticks: { font: { size: 10 } } }
            }
        };
    },

    getChartOptions(yAxisLabel, max = null) {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    max: max,
                    title: { display: true, text: yAxisLabel }
                },
                x: {
                    ticks: { maxRotation: 45, minRotation: 45 }
                }
            }
        };
    },

    getStackedChartOptions(yAxisLabel) {
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 8, font: { size: 10 } }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: { display: true, text: yAxisLabel }
                },
                x: {
                    stacked: true,
                    ticks: { maxRotation: 45, minRotation: 45 }
                }
            }
        };
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

        // Debug: log sprint data
        console.log('Dashboard sprints:', sprints.map(s => ({ name: s.sprintName, id: s.sprintId })));

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
                        <tr class="hover:bg-blue-50 cursor-pointer transition-colors"
                            onclick="SprintOverview.navigateToSprint('${sprint.sprintId}')">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-blue-600 hover:text-blue-800">${sprint.sprintName}</div>
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

    // Modal Methods
    async showIssuesByTypeModal(sprintName, issueType) {
        const issues = await API.getSprintIssues(sprintName).catch(() => []);
        const typeMap = { 'Story': 'Story', 'Bug': 'Bug', 'Task': 'Task', 'Sub-task': 'Sub-task', 'Other': null };
        const targetType = typeMap[issueType];
        const filtered = targetType ? issues.filter(i => i.issueType === targetType) : issues.filter(i => !['Story', 'Bug', 'Task', 'Sub-task'].includes(i.issueType));

        this.showIssuesModal(`${issueType}s in ${sprintName}`, filtered);
    },

    async showDeliveredModal(selectedSprintId) {
        const issues = await this.getFilteredIssues(selectedSprintId);
        const delivered = issues.filter(i => i.status === 'Done' || i.status === 'Completed' || i.status === 'Ready for merge');
        this.showIssuesModal('Delivered Cards', delivered, 'green');
    },

    async showCompletionModal(selectedSprintId) {
        const issues = await this.getFilteredIssues(selectedSprintId);
        const completed = issues.filter(i => i.status === 'Done' || i.status === 'Completed' || i.status === 'Ready for merge');
        const pending = issues.filter(i => i.status !== 'Done' && i.status !== 'Completed' && i.status !== 'Ready for merge');
        this.showCompletionIssuesModal('Completion Status', completed, pending);
    },

    async showQaFailuresModal(selectedSprintId) {
        const issues = await this.getFilteredIssues(selectedSprintId);
        const failed = issues.filter(i => i.qaDelivered === false);
        this.showIssuesModal('QA Failed Cards', failed, 'red');
    },

    async showBugsModal(selectedSprintId) {
        const issues = await this.getFilteredIssues(selectedSprintId);
        const bugs = issues.filter(i => i.issueType === 'Bug');
        this.showIssuesModal('All Bugs', bugs, 'yellow');
    },

    async getFilteredIssues(selectedSprintId) {
        if (selectedSprintId === 'all') {
            return this.allIssues || [];
        }
        const sprint = this.sprintsData.find(s => s.sprintId === selectedSprintId);
        if (sprint) {
            return await API.getSprintIssues(sprint.sprintName).catch(() => []);
        }
        return [];
    },

    showIssuesModal(title, issues, color = 'blue') {
        const colorClasses = { green: 'bg-green-100 text-green-800', red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800', blue: 'bg-blue-100 text-blue-800' };
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-semibold">${title} (${issues.length})</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i></button>
                </div>
                <div class="overflow-y-auto max-h-[60vh] p-4">
                    ${issues.length === 0 ? '<p class="text-gray-500 text-center py-4">No issues found</p>' : `
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50"><tr>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                            </tr></thead>
                            <tbody class="divide-y divide-gray-200">
                                ${issues.map(i => `<tr class="hover:bg-gray-50">
                                    <td class="px-4 py-2"><a href="https://gspcloud.atlassian.net/browse/${i.key}" target="_blank" class="text-blue-600 hover:underline">${i.key}</a></td>
                                    <td class="px-4 py-2 text-sm">${i.summary || ''}</td>
                                    <td class="px-4 py-2"><span class="badge ${colorClasses[color]}">${i.issueType}</span></td>
                                    <td class="px-4 py-2 text-sm">${i.status}</td>
                                    <td class="px-4 py-2 text-sm">${i.assignee || 'Unassigned'}</td>
                                </tr>`).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    },

    showCompletionIssuesModal(title, completed, pending) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
                <div class="flex justify-between items-center p-4 border-b">
                    <h3 class="text-lg font-semibold">${title} - ${completed.length} Completed, ${pending.length} Pending</h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times"></i></button>
                </div>
                <div class="overflow-y-auto max-h-[60vh] p-4">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50"><tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Summary</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Assignee</th>
                        </tr></thead>
                        <tbody class="divide-y divide-gray-200">
                            ${completed.map(i => `<tr class="bg-green-50 hover:bg-green-100">
                                <td class="px-4 py-2"><a href="https://gspcloud.atlassian.net/browse/${i.key}" target="_blank" class="text-blue-600 hover:underline">${i.key}</a></td>
                                <td class="px-4 py-2 text-sm">${i.summary || ''}</td>
                                <td class="px-4 py-2"><span class="badge bg-green-100 text-green-800">${i.issueType}</span></td>
                                <td class="px-4 py-2 text-sm text-green-700 font-medium">${i.status}</td>
                                <td class="px-4 py-2 text-sm">${i.assignee || 'Unassigned'}</td>
                            </tr>`).join('')}
                            ${pending.map(i => `<tr class="hover:bg-yellow-50 animate-pulse-subtle">
                                <td class="px-4 py-2"><a href="https://gspcloud.atlassian.net/browse/${i.key}" target="_blank" class="text-blue-600 hover:underline">${i.key}</a></td>
                                <td class="px-4 py-2 text-sm">${i.summary || ''}</td>
                                <td class="px-4 py-2"><span class="badge bg-yellow-100 text-yellow-800">${i.issueType}</span></td>
                                <td class="px-4 py-2 text-sm text-yellow-700">${i.status}</td>
                                <td class="px-4 py-2 text-sm">${i.assignee || 'Unassigned'}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
        document.body.appendChild(modal);
    }
};

