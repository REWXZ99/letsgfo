// ===== GLOBAL VARIABLES =====
let socket = null;
let currentUserId = null;
let currentChat = null;
let currentPage = 1;
let isLoading = false;
let hasMoreProjects = true;

// ===== DOM CONTENT LOADED =====
document.addEventListener('DOMContentLoaded', function() {
    // Initialize the application
    initApp();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize Socket.IO connection
    initSocketIO();
    
    // Load initial data
    loadInitialData();
});

// ===== INITIALIZATION FUNCTIONS =====
function initApp() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // Generate user ID if not exists
    currentUserId = localStorage.getItem('userId') || generateUserId();
    localStorage.setItem('userId', currentUserId);
    
    // Initialize components based on current page
    const currentPath = window.appData?.currentPath || window.location.pathname;
    
    if (currentPath === '/') {
        initHomePage();
    } else if (currentPath === '/legends') {
        initLegendsPage();
    } else if (currentPath.startsWith('/admin')) {
        initAdminPages();
    }
}

function generateUserId() {
    const randomNum = Math.floor(Math.random() * 10000);
    return `USER${randomNum.toString().padStart(4, '0')}`;
}

function initHomePage() {
    // Load platform stats
    loadPlatformStats();
    
    // Load projects
    loadProjects();
    
    // Setup chat functionality
    setupChat();
}

function initLegendsPage() {
    // Load legends data
    loadLegends();
}

function initAdminPages() {
    // Setup admin-specific functionality
    if (window.appData.isAuthenticated) {
        setupAdminDashboard();
    }
}

// ===== SOCKET.IO FUNCTIONS =====
function initSocketIO() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ Connected to Socket.IO server');
        updateConnectionStatus(true);
        
        // Join user room
        socket.emit('join-chat', currentUserId);
    });
    
    socket.on('disconnect', () => {
        console.log('❌ Disconnected from Socket.IO server');
        updateConnectionStatus(false);
    });
    
    socket.on('project-liked', (projectId) => {
        // Update like count in real-time
        updateProjectLikeCount(projectId);
    });
    
    socket.on('receive-message', (data) => {
        // Handle incoming chat messages
        handleIncomingMessage(data);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        updateConnectionStatus(false);
    });
}

function updateConnectionStatus(connected) {
    const statusElement = document.getElementById('connectionStatus');
    const statusDot = statusElement?.querySelector('.status-dot');
    const statusText = statusElement?.querySelector('.status-text');
    
    if (statusElement) {
        if (connected) {
            statusDot?.classList.add('connected');
            statusText.textContent = 'Connected';
        } else {
            statusDot?.classList.remove('connected');
            statusText.textContent = 'Disconnected';
        }
    }
}

// ===== DATA LOADING FUNCTIONS =====
async function loadPlatformStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        if (data.success) {
            updateStatsUI(data.data);
        }
    } catch (error) {
        console.error('Error loading platform stats:', error);
    }
}

function updateStatsUI(stats) {
    // Update hero stats
    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            animateCounter(element, value);
        }
    };
    
    updateElement('totalProjects', stats.totalProjects);
    updateElement('totalLikes', stats.totalLikes);
    updateElement('totalDownloads', stats.totalDownloads);
    
    // Update footer stats
    const footerStats = document.getElementById('footerStats');
    if (footerStats) {
        footerStats.innerHTML = `
            <div class="stat-item">
                <span class="stat-value">${stats.totalProjects}</span>
                <span class="stat-label">Projects</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.totalLikes.toLocaleString()}</span>
                <span class="stat-label">Likes</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.totalDownloads.toLocaleString()}</span>
                <span class="stat-label">Downloads</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">2</span>
                <span class="stat-label">Legends</span>
            </div>
        `;
    }
}

function animateCounter(element, targetValue) {
    const currentValue = parseInt(element.textContent.replace(/,/g, '')) || 0;
    const duration = 1000; // 1 second
    const step = Math.max(1, Math.abs(targetValue - currentValue) / 60);
    let current = currentValue;
    
    const timer = setInterval(() => {
        if (current < targetValue) {
            current = Math.min(current + step, targetValue);
        } else {
            current = Math.max(current - step, targetValue);
        }
        
        element.textContent = Math.round(current).toLocaleString();
        
        if (Math.abs(current - targetValue) < 1) {
            element.textContent = targetValue.toLocaleString();
            clearInterval(timer);
        }
    }, duration / 60);
}

async function loadProjects(filter = 'all', sort = 'newest', page = 1) {
    if (isLoading) return;
    
    isLoading = true;
    const projectsGrid = document.getElementById('projectsGrid');
    
    if (page === 1) {
        projectsGrid.innerHTML = `
            <div class="loading-projects">
                <div class="cyberpunk-loader small">
                    <div class="loader-grid">
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                        <div class="loader-cell"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    try {
        let url = `/api/projects?page=${page}&limit=12&sort=${sort}`;
        
        if (filter === 'CODE' || filter === 'FILE') {
            url += `&type=${filter}`;
        } else if (filter === 'popular') {
            url += '&sort=popular';
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            displayProjects(data.data, page === 1);
            currentPage = data.pagination.page;
            hasMoreProjects = data.pagination.hasNext;
            
            // Update load more button
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.style.display = hasMoreProjects ? 'inline-flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        showAlert('error', 'Failed to load projects');
    } finally {
        isLoading = false;
    }
}

function displayProjects(projects, clear = true) {
    const projectsGrid = document.getElementById('projectsGrid');
    
    if (clear) {
        projectsGrid.innerHTML = '';
    }
    
    if (projects.length === 0 && clear) {
        projectsGrid.innerHTML = `
            <div class="no-projects">
                <i class="fas fa-code"></i>
                <h3>No Projects Found</h3>
                <p>Be the first to share a project!</p>
            </div>
        `;
        return;
    }
    
    projects.forEach(project => {
        const projectCard = createProjectCard(project);
        projectsGrid.appendChild(projectCard);
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project._id;
    card.dataset.type = project.type;
    
    const languageColor = getLanguageColor(project.language);
    
    card.innerHTML = `
        <div class="project-header">
            <h3 class="project-title">${escapeHtml(project.name)}</h3>
            <div>
                <span class="project-language" style="background: ${languageColor}20; border-color: ${languageColor}40; color: ${languageColor}">
                    ${escapeHtml(project.language)}
                </span>
                <span class="project-type">
                    ${project.type}
                </span>
            </div>
        </div>
        
        <div class="project-author">
            <img src="${project.authorId?.photoUrl || '/images/default-avatar.png'}" 
                 alt="${escapeHtml(project.authorId?.name || 'Unknown')}"
                 class="author-avatar">
            <span class="author-name">${escapeHtml(project.authorId?.name || 'Unknown')}</span>
        </div>
        
        <div class="project-stats">
            <div class="project-stat">
                <i class="fas fa-heart"></i>
                <span class="like-count">${project.likes}</span>
            </div>
            <div class="project-stat">
                <i class="fas fa-download"></i>
                <span class="download-count">${project.downloads}</span>
            </div>
            <div class="project-stat">
                <i class="fas fa-calendar"></i>
                <span>${formatRelativeTime(project.createdAt)}</span>
            </div>
        </div>
        
        <div class="project-actions">
            <button class="cyberpunk-btn btn-sm like-btn" data-id="${project._id}">
                <i class="fas fa-heart"></i>
                <span>Like</span>
            </button>
            <a href="/project/${project._id}" class="cyberpunk-btn btn-sm btn-outline">
                <i class="fas fa-eye"></i>
                <span>View</span>
            </a>
            <button class="cyberpunk-btn btn-sm download-btn" data-id="${project._id}">
                <i class="fas fa-download"></i>
                <span>Download</span>
            </button>
        </div>
    `;
    
    return card;
}

// ===== CHAT FUNCTIONS =====
function setupChat() {
    const chatButtons = document.querySelectorAll('.start-chat');
    const chatModal = document.getElementById('chatModal');
    const closeChatBtn = document.getElementById('closeChat');
    const sendMessageBtn = document.getElementById('sendMessage');
    const chatInput = document.getElementById('chatInput');
    
    // Open chat modal
    chatButtons.forEach(button => {
        button.addEventListener('click', function() {
            const adminId = this.dataset.adminId;
            const adminName = this.dataset.adminName;
            
            openChatModal(adminId, adminName);
        });
    });
    
    // Close chat modal
    closeChatBtn?.addEventListener('click', closeChatModal);
    
    // Send message
    sendMessageBtn?.addEventListener('click', sendChatMessage);
    
    // Send message on Enter key
    chatInput?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Close modal on outside click
    chatModal?.addEventListener('click', function(e) {
        if (e.target === chatModal) {
            closeChatModal();
        }
    });
}

function openChatModal(adminId, adminName) {
    const chatModal = document.getElementById('chatModal');
    const chatAdminName = document.getElementById('chatAdminName');
    const chatAdminAvatar = document.getElementById('chatAdminAvatar');
    
    currentChat = {
        adminId: adminId,
        adminName: adminName
    };
    
    // Update modal content
    chatAdminName.textContent = adminName;
    chatAdminAvatar.src = getAdminAvatar(adminId);
    chatAdminAvatar.alt = adminName;
    
    // Load chat history
    loadChatHistory(adminId);
    
    // Show modal
    chatModal.classList.add('active');
    document.getElementById('chatInput').focus();
    
    // Disable body scroll
    document.body.style.overflow = 'hidden';
}

function closeChatModal() {
    const chatModal = document.getElementById('chatModal');
    const chatMessages = document.getElementById('chatMessages');
    
    chatModal.classList.remove('active');
    currentChat = null;
    chatMessages.innerHTML = '';
    
    // Enable body scroll
    document.body.style.overflow = '';
}

async function loadChatHistory(adminId) {
    const chatMessages = document.getElementById('chatMessages');
    
    try {
        const response = await fetch(`/api/chats/admin/${adminId}?userId=${currentUserId}`);
        const data = await response.json();
        
        if (data.success && data.data.length > 0) {
            const chat = data.data[0]; // Get latest chat
            displayChatMessages(chat.messages);
        } else {
            // No existing chat, show welcome message
            displayWelcomeMessage();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        displayWelcomeMessage();
    }
}

function displayChatMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    
    messages.forEach(message => {
        const messageElement = createMessageElement(message);
        chatMessages.appendChild(messageElement);
    });
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displayWelcomeMessage() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="message admin">
            <div class="message-content">
                Hello! I'm ${currentChat?.adminName}. How can I help you today?
            </div>
            <div class="message-time">${formatTime(new Date())}</div>
        </div>
    `;
}

async function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (!message || !currentChat) return;
    
    // Add user message to UI
    addMessageToUI({
        sender: 'user',
        content: message,
        timestamp: new Date()
    });
    
    // Clear input
    chatInput.value = '';
    
    try {
        // Send message to server
        const response = await fetch('/api/chats', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': window.appData.csrfToken
            },
            body: JSON.stringify({
                userId: currentUserId,
                adminId: currentChat.adminId,
                message: message
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Message sent successfully
            console.log('Message sent:', data);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function addMessageToUI(message) {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = createMessageElement(message);
    chatMessages.appendChild(messageElement);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createMessageElement(message) {
    const div = document.createElement('div');
    div.className = `message ${message.sender}`;
    
    div.innerHTML = `
        <div class="message-content">${escapeHtml(message.content)}</div>
        <div class="message-time">${formatTime(new Date(message.timestamp))}</div>
    `;
    
    return div;
}

function handleIncomingMessage(data) {
    if (currentChat && data.room === currentUserId) {
        addMessageToUI({
            sender: 'admin',
            content: data.message,
            timestamp: new Date()
        });
    }
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Search functionality
    setupSearch();
    
    // Filter buttons
    setupFilters();
    
    // Sort dropdown
    setupSorting();
    
    // Load more button
    setupLoadMore();
    
    // Mobile menu toggle
    setupMobileMenu();
    
    // Back to top button
    setupBackToTop();
    
    // Logout buttons
    setupLogout();
    
    // Like and download buttons
    setupProjectInteractions();
    
    // Form submissions
    setupForms();
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchForm = document.getElementById('searchForm');
    
    if (searchInput) {
        // Debounced search
        let debounceTimer;
        searchInput.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                performSearch(this.value);
            }, 300);
        });
        
        // Clear search on escape
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                this.value = '';
                hideSearchDropdown();
            }
        });
    }
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `/search?q=${encodeURIComponent(query)}`;
            }
        });
    }
}

async function performSearch(query) {
    if (query.length < 2) {
        hideSearchDropdown();
        return;
    }
    
    try {
        const response = await fetch(`/api/projects/search?q=${encodeURIComponent(query)}&limit=5`);
        const data = await response.json();
        
        if (data.success) {
            displaySearchResults(data.data);
        }
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displaySearchResults(projects) {
    const dropdown = document.getElementById('searchDropdown');
    
    if (!projects || projects.length === 0) {
        dropdown.innerHTML = '<div class="search-result-empty">No projects found</div>';
        dropdown.classList.add('active');
        return;
    }
    
    let html = '';
    projects.forEach(project => {
        html += `
            <a href="/project/${project._id}" class="search-result">
                <div class="search-result-title">${escapeHtml(project.name)}</div>
                <div class="search-result-meta">
                    <span class="search-result-language">${escapeHtml(project.language)}</span>
                    <span class="search-result-type">${project.type}</span>
                </div>
            </a>
        `;
    });
    
    dropdown.innerHTML = html;
    dropdown.classList.add('active');
}

function hideSearchDropdown() {
    const dropdown = document.getElementById('searchDropdown');
    dropdown.classList.remove('active');
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Load projects with filter
            const filter = this.dataset.filter;
            loadProjects(filter, getCurrentSort());
        });
    });
}

function setupSorting() {
    const sortSelect = document.getElementById('sortSelect');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            loadProjects(getCurrentFilter(), this.value);
        });
    }
}

function getCurrentFilter() {
    const activeFilter = document.querySelector('.filter-btn.active');
    return activeFilter ? activeFilter.dataset.filter : 'all';
}

function getCurrentSort() {
    const sortSelect = document.getElementById('sortSelect');
    return sortSelect ? sortSelect.value : 'newest';
}

function setupLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', function() {
            if (!isLoading && hasMoreProjects) {
                loadProjects(getCurrentFilter(), getCurrentSort(), currentPage + 1);
            }
        });
    }
}

function setupMobileMenu() {
    const menuToggle = document.getElementById('mobileMenuToggle');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            this.classList.toggle('active');
            
            // Toggle menu icon animation
            const menuLines = this.querySelectorAll('.menu-line');
            menuLines.forEach(line => line.classList.toggle('active'));
        });
    }
}

function setupBackToTop() {
    const backToTopBtn = document.getElementById('backToTop');
    
    if (backToTopBtn) {
        // Show/hide button based on scroll position
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 300) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        // Scroll to top when clicked
        backToTopBtn.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
}

function setupLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    const logoutForm = document.getElementById('logoutForm');
    
    const performLogout = () => {
        if (logoutForm) {
            logoutForm.submit();
        } else {
            // Fallback to API logout
            fetch('/api/admin/logout', {
                method: 'POST',
                headers: {
                    'X-CSRF-Token': window.appData.csrfToken
                }
            }).then(() => {
                window.location.href = '/';
            });
        }
    };
    
    if (logoutBtn) logoutBtn.addEventListener('click', performLogout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', performLogout);
}

function setupProjectInteractions() {
    // Event delegation for like and download buttons
    document.addEventListener('click', function(e) {
        // Like button
        if (e.target.closest('.like-btn')) {
            const button = e.target.closest('.like-btn');
            const projectId = button.dataset.id;
            likeProject(projectId, button);
        }
        
        // Download button
        if (e.target.closest('.download-btn')) {
            const button = e.target.closest('.download-btn');
            const projectId = button.dataset.id;
            downloadProject(projectId, button);
        }
    });
}

async function likeProject(projectId, button) {
    try {
        const response = await fetch(`/api/projects/${projectId}/like`, {
            method: 'POST',
            headers: {
                'X-CSRF-Token': window.appData.csrfToken
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update like count in UI
            const card = button.closest('.project-card');
            const likeCount = card.querySelector('.like-count');
            likeCount.textContent = data.likes;
            
            // Visual feedback
            button.innerHTML = '<i class="fas fa-heart"></i><span>Liked!</span>';
            button.disabled = true;
            
            // Emit socket event
            if (socket) {
                socket.emit('project-liked', projectId);
            }
        }
    } catch (error) {
        console.error('Like error:', error);
        showAlert('error', 'Failed to like project');
    }
}

async function downloadProject(projectId, button) {
    try {
        // First, increment download count
        const response = await fetch(`/api/projects/${projectId}/download`, {
            method: 'POST',
            headers: {
                'X-CSRF-Token': window.appData.csrfToken
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update download count in UI
            const card = button.closest('.project-card');
            const downloadCount = card.querySelector('.download-count');
            downloadCount.textContent = data.downloads;
            
            // Get download URL and initiate download
            if (data.downloadUrl) {
                window.open(data.downloadUrl, '_blank');
            } else {
                // Fallback to download endpoint
                window.open(`/api/projects/${projectId}/download-file`, '_blank');
            }
            
            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i><span>Downloaded!</span>';
            button.disabled = true;
            
            // Reset button after 2 seconds
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.disabled = false;
            }, 2000);
        }
    } catch (error) {
        console.error('Download error:', error);
        showAlert('error', 'Failed to download project');
    }
}

function updateProjectLikeCount(projectId) {
    const card = document.querySelector(`.project-card[data-id="${projectId}"]`);
    if (card) {
        const likeCount = card.querySelector('.like-count');
        const currentLikes = parseInt(likeCount.textContent) || 0;
        likeCount.textContent = currentLikes + 1;
    }
}

function setupForms() {
    // CSRF token for all forms
    document.querySelectorAll('form').forEach(form => {
        const csrfInput = form.querySelector('input[name="_csrf"]');
        if (!csrfInput && window.appData.csrfToken) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = '_csrf';
            input.value = window.appData.csrfToken;
            form.appendChild(input);
        }
    });
    
    // Form validation
    document.querySelectorAll('form[data-validate]').forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

// ===== UTILITY FUNCTIONS =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(date).toLocaleDateString();
}

function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getLanguageColor(language) {
    const colors = {
        javascript: '#F7DF1E',
        typescript: '#3178C6',
        python: '#3776AB',
        java: '#007396',
        cpp: '#00599C',
        csharp: '#239120',
        php: '#777BB4',
        ruby: '#CC342D',
        go: '#00ADD8',
        rust: '#000000',
        swift: '#FA7343',
        kotlin: '#7F52FF',
        html: '#E34F26',
        css: '#1572B6',
        vue: '#4FC08D',
        react: '#61DAFB',
        angular: '#DD0031',
        nodejs: '#339933',
        django: '#092E20',
        flask: '#000000',
        laravel: '#FF2D20'
    };
    
    return colors[language.toLowerCase()] || '#6B7280';
}

function getAdminAvatar(adminId) {
    const avatars = {
        silverhold: 'https://res.cloudinary.com/dnb0q2s2h/image/upload/v1700000000/silverhold-avatar.jpg',
        braynofficial: 'https://res.cloudinary.com/dnb0q2s2h/image/upload/v1700000000/brayn-avatar.jpg'
    };
    
    return avatars[adminId] || '/images/default-avatar.png';
}

function showAlert(type, message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };
    
    alertDiv.innerHTML = `
        <i class="fas ${icons[type]}"></i>
        <span>${escapeHtml(message)}</span>
        <button class="alert-close">&times;</button>
    `;
    
    // Add to page
    const main = document.querySelector('.cyberpunk-main');
    if (main) {
        main.insertBefore(alertDiv, main.firstChild);
    }
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
    
    // Close button functionality
    alertDiv.querySelector('.alert-close').addEventListener('click', () => {
        alertDiv.remove();
    });
}

function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            isValid = false;
            highlightInvalid(input);
        } else {
            removeHighlight(input);
        }
    });
    
    return isValid;
}

function highlightInvalid(element) {
    element.style.borderColor = '#ef4444';
    element.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
}

function removeHighlight(element) {
    element.style.borderColor = '';
    element.style.boxShadow = '';
}

// ===== INITIAL DATA LOADING =====
function loadInitialData() {
    // Hide loading overlay after a delay
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
    }, 1000);
}

// ===== WINDOW EVENT LISTENERS =====
window.addEventListener('scroll', function() {
    // Update active section based on scroll position
    updateActiveNavigation();
});

function updateActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        const sectionId = section.getAttribute('id');
        
        if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
            // Update active nav link
            document.querySelectorAll('.nav-link, .mobile-link, .bottom-nav-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        escapeHtml,
        formatRelativeTime,
        getLanguageColor,
        showAlert
    };
}
