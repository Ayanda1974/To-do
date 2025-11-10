// App State
const AppState = {
    currentUser: null,
    tasks: [],
    currentFilter: 'all',
    notifications: [],
    checkInterval: null
};

// Storage wrapper to work with localStorage
const storage = {
    async get(key) {
        try {
            const value = localStorage.getItem(key);
            return value ? { key, value } : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },
    async set(key, value) {
        try {
            localStorage.setItem(key, value);
            return { key, value };
        } catch (error) {
            console.error('Storage set error:', error);
            return null;
        }
    },
    async delete(key) {
        try {
            localStorage.removeItem(key);
            return { key, deleted: true };
        } catch (error) {
            console.error('Storage delete error:', error);
            return null;
        }
    },
    async list(prefix) {
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith(prefix)) {
                    keys.push(key);
                }
            }
            return { keys };
        } catch (error) {
            console.error('Storage list error:', error);
            return { keys: [] };
        }
    }
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    await initializeApp();
});

async function initializeApp() {
    try {
        const userData = await storage.get('user-profile');
        
        if (!userData) {
            showSetupModal();
        } else {
            AppState.currentUser = JSON.parse(userData.value);
            await loadTasks();
            hideSetupModal();
            renderDashboard();
            startTaskChecker();
        }
        
        attachEventListeners();
        setInitialDates();
        loadThemePreference();
    } catch (error) {
        console.error('Error initializing app:', error);
        showSetupModal();
        attachEventListeners();
    }
}

function attachEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Menu toggle
    document.getElementById('menuToggle').addEventListener('click', toggleSidebar);
    document.getElementById('closeSidebar').addEventListener('click', toggleSidebar);
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Notifications
    document.getElementById('notificationBtn').addEventListener('click', toggleNotifications);
    document.getElementById('markAllRead').addEventListener('click', markAllNotificationsRead);
    
    // Setup modal
    document.getElementById('setupSubmit').addEventListener('click', handleSetup);
    
    // Create task
    document.getElementById('createTaskBtn').addEventListener('click', createTask);
    
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });
    
    // Modal close
    document.getElementById('closeModal').addEventListener('click', closeTaskModal);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('notificationDropdown');
        const btn = document.getElementById('notificationBtn');
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// Setup Modal
function showSetupModal() {
    document.getElementById('setupModal').classList.add('active');
}

function hideSetupModal() {
    document.getElementById('setupModal').classList.remove('active');
}

async function handleSetup() {
    const name = document.getElementById('setupName').value.trim();
    
    if (!name) {
        alert('Please enter your name');
        return;
    }
    
    const userData = { name, createdAt: new Date().toISOString() };
    
    try {
        await storage.set('user-profile', JSON.stringify(userData));
        AppState.currentUser = userData;
        hideSetupModal();
        await loadTasks();
        renderDashboard();
        startTaskChecker();
    } catch (error) {
        console.error('Error saving user data:', error);
        alert('Error saving your profile. Please try again.');
    }
}

// Navigation
function handleNavigation(e) {
    e.preventDefault();
    const page = e.currentTarget.dataset.page;
    
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(page).classList.add('active');
    
    if (page === 'view-tasks') {
        renderAllTasks();
    } else if (page === 'dashboard') {
        renderDashboard();
    }
    
    if (window.innerWidth <= 968) {
        toggleSidebar();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
}

// Theme
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Tasks Management
async function loadTasks() {
    try {
        const result = await storage.list('task:');
        
        if (result && result.keys && result.keys.length > 0) {
            const taskPromises = result.keys.map(key => storage.get(key));
            const taskResults = await Promise.all(taskPromises);
            
            AppState.tasks = taskResults
                .filter(r => r && r.value)
                .map(r => JSON.parse(r.value));
        } else {
            AppState.tasks = [];
        }
        
        updateTaskStatuses();
        updateNotifications();
    } catch (error) {
        console.error('Error loading tasks:', error);
        AppState.tasks = [];
    }
}

async function saveTask(task) {
    try {
        await storage.set(`task:${task.id}`, JSON.stringify(task));
    } catch (error) {
        console.error('Error saving task:', error);
        throw error;
    }
}

async function deleteTask(taskId) {
    try {
        await storage.delete(`task:${taskId}`);
        AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
}

function setInitialDates() {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);
    
    document.getElementById('startDate').value = dateStr;
    document.getElementById('startTime').value = timeStr;
    
    const endTime = new Date(now.getTime() + 60 * 60 * 1000);
    document.getElementById('endDate').value = dateStr;
    document.getElementById('endTime').value = endTime.toTimeString().slice(0, 5);
}

async function createTask() {
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const startDate = document.getElementById('startDate').value;
    const startTime = document.getElementById('startTime').value;
    const endDate = document.getElementById('endDate').value;
    const endTime = document.getElementById('endTime').value;
    const reminderMinutes = parseInt(document.getElementById('reminderTime').value);
    
    if (!title || !startDate || !startTime || !endDate || !endTime) {
        alert('Please fill in all required fields');
        return;
    }
    
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);
    
    if (endDateTime <= startDateTime) {
        alert('End date/time must be after start date/time');
        return;
    }
    
    const task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title,
        description,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        reminderMinutes,
        status: 'todo',
        createdAt: new Date().toISOString()
    };
    
    try {
        await saveTask(task);
        AppState.tasks.push(task);
        
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDescription').value = '';
        setInitialDates();
        
        alert('Task created successfully!');
        
        updateTaskStatuses();
        renderDashboard();
    } catch (error) {
        alert('Error creating task. Please try again.');
    }
}

function updateTaskStatuses() {
    const now = new Date();
    let updated = false;
    
    AppState.tasks.forEach(task => {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        
        if (task.status !== 'completed') {
            if (now > endDate) {
                task.status = 'overdue';
                updated = true;
            } else if (now >= startDate && now <= endDate && task.status === 'todo') {
                // Task is in its time window but still marked as todo
            }
        }
    });
    
    if (updated) {
        AppState.tasks.forEach(task => {
            if (task.status === 'overdue' || task.status === 'progress') {
                saveTask(task).catch(console.error);
            }
        });
    }
}

async function updateTaskStatus(taskId, newStatus) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    task.status = newStatus;
    
    try {
        await saveTask(task);
        renderDashboard();
        renderAllTasks();
        updateNotifications();
    } catch (error) {
        console.error('Error updating task status:', error);
        alert('Error updating task status');
    }
}

// Dashboard Rendering
function renderDashboard() {
    if (AppState.currentUser) {
        document.getElementById('userName').textContent = AppState.currentUser.name;
    }
    
    updateStatCards();
    renderTodayTasks();
}

function updateStatCards() {
    const todoCount = AppState.tasks.filter(t => t.status === 'todo').length;
    const progressCount = AppState.tasks.filter(t => t.status === 'progress').length;
    const completedCount = AppState.tasks.filter(t => t.status === 'completed').length;
    const overdueCount = AppState.tasks.filter(t => t.status === 'overdue').length;
    
    document.getElementById('todoCount').textContent = todoCount;
    document.getElementById('progressCount').textContent = progressCount;
    document.getElementById('completedCount').textContent = completedCount;
    document.getElementById('missedCount').textContent = overdueCount;
}

function renderTodayTasks() {
    const container = document.getElementById('dashboardTasks');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTasks = AppState.tasks.filter(task => {
        const taskDate = new Date(task.startDate);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === today.getTime();
    });
    
    if (todayTasks.length === 0) {
        container.innerHTML = '<p class="no-tasks">No tasks for today</p>';
        return;
    }
    
    container.innerHTML = todayTasks.map(task => createTaskCard(task)).join('');
    
    container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', () => {
            const taskId = card.dataset.taskId;
            showTaskModal(taskId);
        });
    });
}

function renderAllTasks() {
    const container = document.getElementById('allTasksList');
    let filteredTasks = AppState.tasks;
    
    if (AppState.currentFilter !== 'all') {
        filteredTasks = AppState.tasks.filter(task => task.status === AppState.currentFilter);
    }
    
    if (filteredTasks.length === 0) {
        container.innerHTML = '<p class="no-tasks">No tasks available</p>';
        return;
    }
    
    const sortedTasks = filteredTasks.sort((a, b) => 
        new Date(a.startDate) - new Date(b.startDate)
    );
    
    container.innerHTML = sortedTasks.map(task => createTaskCard(task)).join('');
    
    container.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', () => {
            const taskId = card.dataset.taskId;
            showTaskModal(taskId);
        });
    });
}

function createTaskCard(task) {
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };
    
    const statusLabels = {
        todo: 'To Do',
        progress: 'In Progress',
        completed: 'Completed',
        overdue: 'Overdue'
    };
    
    return `
        <div class="task-card ${task.status}" data-task-id="${task.id}">
            <div class="task-header">
                <div>
                    <h3 class="task-title">${escapeHtml(task.title)}</h3>
                    ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
                </div>
                <span class="task-status ${task.status}">${statusLabels[task.status]}</span>
            </div>
            <div class="task-time">
                <i class="fas fa-clock"></i>
                <span>${formatDate(startDate)} ${formatTime(startDate)} - ${formatDate(endDate)} ${formatTime(endDate)}</span>
            </div>
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Task Modal
function showTaskModal(taskId) {
    const task = AppState.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const modal = document.getElementById('taskModal');
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');
    
    const startDate = new Date(task.startDate);
    const endDate = new Date(task.endDate);
    
    const formatDateTime = (date) => {
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit' 
        });
    };
    
    const statusLabels = {
        todo: 'To Do',
        progress: 'In Progress',
        completed: 'Completed',
        overdue: 'Overdue'
    };
    
    modalBody.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <strong>Status:</strong>
            <span class="task-status ${task.status}" style="margin-left: 0.5rem;">${statusLabels[task.status]}</span>
        </div>
        ${task.description ? `
            <div style="margin-bottom: 1rem;">
                <strong>Description:</strong>
                <p style="margin-top: 0.5rem; color: var(--text-secondary);">${escapeHtml(task.description)}</p>
            </div>
        ` : ''}
        <div style="margin-bottom: 1rem;">
            <strong>Start:</strong>
            <p style="margin-top: 0.25rem; color: var(--text-secondary);">${formatDateTime(startDate)}</p>
        </div>
        <div style="margin-bottom: 1rem;">
            <strong>End:</strong>
            <p style="margin-top: 0.25rem; color: var(--text-secondary);">${formatDateTime(endDate)}</p>
        </div>
        ${task.reminderMinutes > 0 ? `
            <div>
                <strong>Reminder:</strong>
                <p style="margin-top: 0.25rem; color: var(--text-secondary);">${task.reminderMinutes} minutes before</p>
            </div>
        ` : ''}
    `;
    
    modalFooter.innerHTML = '';
    
    if (task.status !== 'completed' && task.status !== 'overdue') {
        if (task.status === 'todo') {
            const startBtn = document.createElement('button');
            startBtn.className = 'btn-secondary';
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start Task';
            startBtn.onclick = () => {
                updateTaskStatus(task.id, 'progress');
                closeTaskModal();
            };
            modalFooter.appendChild(startBtn);
        }
        
        if (task.status === 'progress' || task.status === 'todo') {
            const completeBtn = document.createElement('button');
            completeBtn.className = 'btn-success';
            completeBtn.innerHTML = '<i class="fas fa-check"></i> Complete';
            completeBtn.onclick = () => {
                updateTaskStatus(task.id, 'completed');
                closeTaskModal();
            };
            modalFooter.appendChild(completeBtn);
        }
    }
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-danger';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteBtn.onclick = async () => {
        if (confirm('Are you sure you want to delete this task?')) {
            await deleteTask(task.id);
            closeTaskModal();
            renderDashboard();
            renderAllTasks();
            updateNotifications();
        }
    };
    modalFooter.appendChild(deleteBtn);
    
    modal.classList.add('active');
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
}

// Filter
function handleFilter(e) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    e.currentTarget.classList.add('active');
    
    AppState.currentFilter = e.currentTarget.dataset.filter;
    renderAllTasks();
}

// Notifications
function updateNotifications() {
    const now = new Date();
    const notifications = [];
    
    AppState.tasks.forEach(task => {
        const startDate = new Date(task.startDate);
        const endDate = new Date(task.endDate);
        
        if (task.status === 'overdue') {
            notifications.push({
                type: 'overdue',
                title: task.title,
                message: `This task is overdue`,
                taskId: task.id
            });
        } else if (task.status !== 'completed' && task.reminderMinutes > 0) {
            const reminderTime = new Date(startDate.getTime() - task.reminderMinutes * 60000);
            if (now >= reminderTime && now < startDate) {
                notifications.push({
                    type: 'upcoming',
                    title: task.title,
                    message: `Starting in ${task.reminderMinutes} minutes`,
                    taskId: task.id
                });
            }
        }
    });
    
    AppState.notifications = notifications;
    renderNotifications();
}

function renderNotifications() {
    const badge = document.getElementById('notificationBadge');
    const content = document.getElementById('notificationContent');
    
    badge.textContent = AppState.notifications.length;
    badge.style.display = AppState.notifications.length > 0 ? 'block' : 'none';
    
    if (AppState.notifications.length === 0) {
        content.innerHTML = '<p class="no-notifications">No notifications</p>';
        return;
    }
    
    content.innerHTML = AppState.notifications.map(notif => `
        <div class="notification-item ${notif.type}" data-task-id="${notif.taskId}">
            <h4>${escapeHtml(notif.title)}</h4>
            <p>${escapeHtml(notif.message)}</p>
        </div>
    `).join('');
    
    content.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', () => {
            const taskId = item.dataset.taskId;
            showTaskModal(taskId);
            toggleNotifications();
        });
    });
}

function toggleNotifications() {
    document.getElementById('notificationDropdown').classList.toggle('active');
}

function markAllNotificationsRead() {
    AppState.notifications = [];
    renderNotifications();
}

// Task Checker
function startTaskChecker() {
    if (AppState.checkInterval) {
        clearInterval(AppState.checkInterval);
    }
    
    AppState.checkInterval = setInterval(() => {
        updateTaskStatuses();
        updateNotifications();
        
        const activePage = document.querySelector('.page.active').id;
        if (activePage === 'dashboard') {
            updateStatCards();
            renderTodayTasks();
        } else if (activePage === 'view-tasks') {
            renderAllTasks();
        }
    }, 30000); // Check every 30 seconds
}