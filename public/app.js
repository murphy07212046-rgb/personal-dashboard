// API 基础URL
const API_BASE = '';

// 状态
let currentFilter = 'all';
let currentMonth = new Date();
let editingTodoId = null;
let allTodos = [];
let allBookmarks = [];

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTodoFilters();
    initDateInputs();
    loadAllData();
    updateCurrentDate();
});

// 加载所有数据
async function loadAllData() {
    await Promise.all([
        fetchTodos(),
        fetchBookmarks(),
        updateDashboard()
    ]);
    renderCalendar();
}

// API 请求封装
async function api(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: {
            'Content-Type': 'application/json',
        },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '请求失败');
    }
    
    return response.json();
}

// ========== 数据获取 ==========

async function fetchTodos() {
    try {
        allTodos = await api('/api/todos');
        renderTodos();
    } catch (err) {
        console.error('获取待办失败:', err);
        showToast('获取待办失败: ' + err.message, 'error');
    }
}

async function fetchBookmarks() {
    try {
        allBookmarks = await api('/api/bookmarks');
        renderBookmarks();
    } catch (err) {
        console.error('获取收藏失败:', err);
        showToast('获取收藏失败: ' + err.message, 'error');
    }
}

async function updateDashboard() {
    try {
        const stats = await api('/api/stats');
        document.getElementById('todo-count').textContent = stats.activeTodos;
        document.getElementById('completed-count').textContent = stats.todayCompleted;
        document.getElementById('bookmark-count').textContent = stats.bookmarks;
        
        // 今日日期
        const now = new Date();
        document.getElementById('today-date').textContent = `${now.getMonth() + 1}月${now.getDate()}日`;
        document.getElementById('today-weekday').textContent = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
        
        // 今日待办预览
        const today = new Date().toISOString().split('T')[0];
        const todayTodos = allTodos.filter(t => t.date === today && !t.completed);
        const todoPreviewEl = document.getElementById('dashboard-todos');
        
        if (todayTodos.length === 0) {
            todoPreviewEl.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 32px;">🌟</span>
                    <p>今天还没有待办事项</p>
                </div>
            `;
        } else {
            todoPreviewEl.innerHTML = todayTodos.slice(0, 5).map(t => `
                <div class="todo-item" style="flex: 1; min-width: 250px; max-width: 400px;">
                    <div class="todo-checkbox ${t.completed ? 'checked' : ''}" onclick="toggleTodo(${t.id})"></div>
                    <div class="todo-content">
                        <div class="todo-text">${escapeHtml(t.text)}</div>
                        <span class="todo-priority ${t.priority}">${getPriorityLabel(t.priority)}</span>
                    </div>
                </div>
            `).join('') + (todayTodos.length > 5 ? `<p style="width: 100%; color: var(--text-secondary);">还有 ${todayTodos.length - 5} 个待办...</p>` : '');
        }
        
        // 快速访问预览
        const bookmarkPreviewEl = document.getElementById('dashboard-bookmarks');
        if (allBookmarks.length === 0) {
            bookmarkPreviewEl.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 32px;">🔗</span>
                    <p>还没有收藏网址</p>
                </div>
            `;
        } else {
            bookmarkPreviewEl.innerHTML = allBookmarks.slice(0, 8).map(b => `
                <a href="${b.url}" target="_blank" class="bookmark-item" style="text-decoration: none; color: inherit; flex: 1; min-width: 200px; max-width: 300px;">
                    <div class="bookmark-favicon">${categoryIcons[b.category]}</div>
                    <div class="bookmark-info">
                        <div class="bookmark-title">${escapeHtml(b.title)}</div>
                    </div>
                </a>
            `).join('');
        }
    } catch (err) {
        console.error('获取统计失败:', err);
    }
}

// 导航
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
            
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

function switchView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');
    
    const titles = {
        dashboard: '工作台总览',
        todos: '待办事项',
        calendar: '日历视图',
        bookmarks: '网址收藏'
    };
    document.getElementById('page-title').textContent = titles[viewName];
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === viewName);
    });
    
    if (viewName === 'dashboard') updateDashboard();
    if (viewName === 'calendar') renderCalendar();
}

function updateCurrentDate() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('zh-CN', options);
}

// ========== 待办功能 ==========

function initTodoFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });
}

function initDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('todo-date').value = today;
}

async function addTodo() {
    const input = document.getElementById('todo-input');
    const dateInput = document.getElementById('todo-date');
    const priorityInput = document.getElementById('todo-priority');
    
    const text = input.value.trim();
    if (!text) return;
    
    try {
        await api('/api/todos', {
            method: 'POST',
            body: {
                text: text,
                date: dateInput.value,
                priority: priorityInput.value
            }
        });
        
        input.value = '';
        await fetchTodos();
        await updateDashboard();
        renderCalendar();
        showToast('待办已添加', 'success');
    } catch (err) {
        showToast('添加失败: ' + err.message, 'error');
    }
}

async function toggleTodo(id) {
    const todo = allTodos.find(t => t.id === id);
    if (!todo) return;
    
    try {
        await api(`/api/todos/${id}`, {
            method: 'PUT',
            body: {
                ...todo,
                completed: !todo.completed
            }
        });
        
        await fetchTodos();
        await updateDashboard();
        renderCalendar();
    } catch (err) {
        showToast('更新失败: ' + err.message, 'error');
    }
}

async function deleteTodo(id) {
    if (!confirm('确定要删除这个待办吗？')) return;
    
    try {
        await api(`/api/todos/${id}`, { method: 'DELETE' });
        await fetchTodos();
        await updateDashboard();
        renderCalendar();
        showToast('已删除', 'success');
    } catch (err) {
        showToast('删除失败: ' + err.message, 'error');
    }
}

function editTodo(id) {
    const todo = allTodos.find(t => t.id === id);
    if (!todo) return;
    
    editingTodoId = id;
    document.getElementById('edit-todo-text').value = todo.text;
    document.getElementById('edit-todo-date').value = todo.date;
    document.getElementById('edit-todo-priority').value = todo.priority;
    
    document.getElementById('edit-modal').classList.add('active');
}

async function saveEdit() {
    if (!editingTodoId) return;
    
    const text = document.getElementById('edit-todo-text').value.trim();
    const date = document.getElementById('edit-todo-date').value;
    const priority = document.getElementById('edit-todo-priority').value;
    
    if (!text) return;
    
    const todo = allTodos.find(t => t.id === editingTodoId);
    
    try {
        await api(`/api/todos/${editingTodoId}`, {
            method: 'PUT',
            body: {
                ...todo,
                text,
                date,
                priority
            }
        });
        
        await fetchTodos();
        await updateDashboard();
        renderCalendar();
        closeModal();
        showToast('已更新', 'success');
    } catch (err) {
        showToast('更新失败: ' + err.message, 'error');
    }
}

function closeModal() {
    document.getElementById('edit-modal').classList.remove('active');
    editingTodoId = null;
}

function renderTodos() {
    const listEl = document.getElementById('todo-list');
    
    let filtered = allTodos;
    if (currentFilter === 'active') filtered = allTodos.filter(t => !t.completed);
    if (currentFilter === 'completed') filtered = allTodos.filter(t => t.completed);
    if (currentFilter === 'high') filtered = allTodos.filter(t => t.priority === 'high');
    
    filtered.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <span style="font-size: 48px;">📝</span>
                <p>暂无待办事项</p>
            </div>
        `;
        return;
    }
    
    listEl.innerHTML = filtered.map(todo => `
        <div class="todo-item ${todo.completed ? 'completed' : ''}">
            <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="toggleTodo(${todo.id})"></div>
            <div class="todo-content">
                <div class="todo-text">${escapeHtml(todo.text)}</div>
                <div class="todo-meta">
                    <span>📅 ${formatDate(todo.date)}</span>
                    <span class="todo-priority ${todo.priority}">${getPriorityLabel(todo.priority)}</span>
                </div>
            </div>
            <div class="todo-actions">
                <button class="btn" onclick="editTodo(${todo.id})">编辑</button>
                <button class="btn btn-danger" onclick="deleteTodo(${todo.id})">删除</button>
            </div>
        </div>
    `).join('');
}

// ========== 日历功能 ==========

function changeMonth(delta) {
    currentMonth.setMonth(currentMonth.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    document.getElementById('calendar-month-year').textContent = 
        `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const gridEl = document.getElementById('calendar-grid');
    
    let html = '';
    
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach(day => {
        html += `<div class="calendar-weekday">${day}</div>`;
    });
    
    for (let i = firstDay - 1; i >= 0; i--) {
        html += `<div class="calendar-day other-month">
            <div class="calendar-day-number">${daysInPrevMonth - i}</div>
        </div>`;
    }
    
    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTodos = allTodos.filter(t => t.date === dateStr && !t.completed);
        
        const isToday = today.getFullYear() === year && 
                       today.getMonth() === month && 
                       today.getDate() === day;
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}" onclick="showDayTodos('${dateStr}')">
                <div class="calendar-day-number">${day}</div>
                <div class="calendar-todos">
                    ${dayTodos.slice(0, 3).map(t => `
                        <div class="calendar-todo-dot ${t.priority}"></div>
                    `).join('')}
                    ${dayTodos.length > 3 ? '<div style="font-size: 10px; color: var(--text-secondary);">+' + (dayTodos.length - 3) + '</div>' : ''}
                </div>
            </div>
        `;
    }
    
    const remainingDays = (7 - ((firstDay + daysInMonth) % 7)) % 7;
    for (let day = 1; day <= remainingDays; day++) {
        html += `<div class="calendar-day other-month">
            <div class="calendar-day-number">${day}</div>
        </div>`;
    }
    
    gridEl.innerHTML = html;
}

function showDayTodos(dateStr) {
    const todos = allTodos.filter(t => t.date === dateStr && !t.completed);
    if (todos.length === 0) return;
    
    const todoList = todos.map(t => `• ${t.text}`).join('\n');
    alert(`${dateStr} 的待办:\n\n${todoList}`);
}

// ========== 收藏功能 ==========

const categoryIcons = {
    work: '💼',
    learn: '📚',
    entertain: '🎮',
    tool: '🛠️',
    other: '📌'
};

const categoryNames = {
    work: '工作',
    learn: '学习',
    entertain: '娱乐',
    tool: '工具',
    other: '其他'
};

async function addBookmark() {
    const titleInput = document.getElementById('bookmark-title');
    const urlInput = document.getElementById('bookmark-url');
    const categoryInput = document.getElementById('bookmark-category');
    
    let title = titleInput.value.trim();
    let url = urlInput.value.trim();
    
    if (!title || !url) return;
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    try {
        await api('/api/bookmarks', {
            method: 'POST',
            body: {
                title,
                url,
                category: categoryInput.value
            }
        });
        
        titleInput.value = '';
        urlInput.value = '';
        await fetchBookmarks();
        await updateDashboard();
        showToast('收藏已添加', 'success');
    } catch (err) {
        showToast('添加失败: ' + err.message, 'error');
    }
}

async function deleteBookmark(id) {
    if (!confirm('确定要删除这个收藏吗？')) return;
    
    try {
        await api(`/api/bookmarks/${id}`, { method: 'DELETE' });
        await fetchBookmarks();
        await updateDashboard();
        showToast('已删除', 'success');
    } catch (err) {
        showToast('删除失败: ' + err.message, 'error');
    }
}

function renderBookmarks() {
    const container = document.getElementById('bookmark-list');
    
    const grouped = {};
    allBookmarks.forEach(b => {
        if (!grouped[b.category]) grouped[b.category] = [];
        grouped[b.category].push(b);
    });
    
    if (allBookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span style="font-size: 48px;">🔖</span>
                <p>还没有收藏网址</p>
                <p style="font-size: 14px; margin-top: 8px;">在上方添加你常用的网站</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = Object.entries(grouped).map(([category, items]) => `
        <div class="bookmark-category">
            <h3>${categoryIcons[category]} ${categoryNames[category]}</h3>
            <div class="bookmark-list">
                ${items.map(b => `
                    <div class="bookmark-item">
                        <div class="bookmark-favicon">${categoryIcons[category]}</div>
                        <div class="bookmark-info">
                            <div class="bookmark-title">${escapeHtml(b.title)}</div>
                            <div class="bookmark-url">${escapeHtml(new URL(b.url).hostname)}</div>
                        </div>
                        <button class="btn bookmark-delete" onclick="deleteBookmark(${b.id})">删除</button>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// ========== 工具函数 ==========

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (dateStr === today.toISOString().split('T')[0]) return '今天';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return '明天';
    
    return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getPriorityLabel(priority) {
    const labels = { high: '高', medium: '中', low: '低' };
    return labels[priority] || priority;
}

// Toast 提示
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        if (document.activeElement.id === 'todo-input') {
            addTodo();
        } else if (document.activeElement.id === 'bookmark-title' || document.activeElement.id === 'bookmark-url') {
            addBookmark();
        }
    }
    if (e.key === 'Escape') {
        closeModal();
    }
});
