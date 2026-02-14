// Main Application Logic
const App = {
    currentPage: 'dashboard',
    
    init() {
        console.log('🚀 Engineering Metrics Dashboard initialized');
        this.setupNavigation();
        this.setupRefreshButton();
        this.loadPage('dashboard');
    },
    
    setupNavigation() {
        const links = document.querySelectorAll('.sidebar-link');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.loadPage(page);
                
                // Update active state
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },
    
    setupRefreshButton() {
        const refreshBtn = document.getElementById('refresh-btn');
        refreshBtn.addEventListener('click', () => {
            this.loadPage(this.currentPage, true);
        });
    },
    
    async loadPage(pageName, forceRefresh = false) {
        this.currentPage = pageName;
        const mainContent = document.getElementById('main-content');
        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');
        
        // Show loading state
        mainContent.innerHTML = this.getLoadingHTML();
        
        try {
            switch(pageName) {
                case 'dashboard':
                    pageTitle.textContent = 'Dashboard';
                    pageSubtitle.textContent = 'Overview of sprint metrics and QA performance';
                    await Dashboard.render(mainContent);
                    break;
                    
                case 'sprints':
                    pageTitle.textContent = 'Sprints';
                    pageSubtitle.textContent = 'Detailed sprint analysis and metrics';
                    await Sprints.render(mainContent);
                    break;
                    
                case 'qa-analysis':
                    pageTitle.textContent = 'QA Analysis';
                    pageSubtitle.textContent = 'Quality assurance metrics and failure analysis';
                    await QaAnalysis.render(mainContent);
                    break;
                    
                case 'trends':
                    pageTitle.textContent = 'Trends';
                    pageSubtitle.textContent = 'Historical trends and performance insights';
                    await Trends.render(mainContent);
                    break;
                    
                case 'database':
                    pageTitle.textContent = 'Database';
                    pageSubtitle.textContent = 'Sprint database status and management';
                    await Database.render(mainContent);
                    break;
                    
                case 'debug':
                    pageTitle.textContent = 'Debug Tools';
                    pageSubtitle.textContent = 'Advanced debugging and data inspection';
                    await DebugTools.render(mainContent);
                    break;
                    
                default:
                    mainContent.innerHTML = '<div class="text-center py-12"><p class="text-gray-500">Page not found</p></div>';
            }
        } catch (error) {
            console.error('Error loading page:', error);
            mainContent.innerHTML = this.getErrorHTML(error.message);
        }
    },
    
    getLoadingHTML() {
        return `
            <div class="flex items-center justify-center py-12">
                <div class="text-center">
                    <div class="loading mx-auto mb-4"></div>
                    <p class="text-gray-500">Loading...</p>
                </div>
            </div>
        `;
    },
    
    getErrorHTML(message) {
        return `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
                <h3 class="text-lg font-semibold text-red-900 mb-2">Error Loading Page</h3>
                <p class="text-red-700">${message}</p>
                <button onclick="App.loadPage(App.currentPage, true)" class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Try Again
                </button>
            </div>
        `;
    },
    
    // Utility functions
    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    },
    
    formatPercentage(value) {
        return `${value.toFixed(1)}%`;
    },
    
    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },
    
    getTrendIcon(trend) {
        if (trend === 'UP') return '<i class="fas fa-arrow-up text-green-500"></i>';
        if (trend === 'DOWN') return '<i class="fas fa-arrow-down text-red-500"></i>';
        return '<i class="fas fa-minus text-gray-400"></i>';
    },
    
    getStatusBadge(status) {
        const statusMap = {
            'COMPLETE': 'badge-success',
            'IN_PROGRESS': 'badge-info',
            'TODO': 'badge-warning',
            'ACTIVE': 'badge-success',
            'CLOSED': 'badge-danger'
        };
        const badgeClass = statusMap[status] || 'badge-info';
        return `<span class="badge ${badgeClass}">${status}</span>`;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

