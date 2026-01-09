/**
 * Darts Stats Log - Main Application
 */

// ============================================
// Application State
// ============================================

const state = {
    currentPage: 'home',
    currentSession: null,
    editingStatBlocks: [],
    editingTags: [],
    viewingSessionId: null,
    calendarYear: new Date().getFullYear(),
    calendarMonth: new Date().getMonth(),
    analyticsChart: null,
    selectedPeriod: 30,
    selectedMetric: 'countup'
};

// ============================================
// DOM Elements
// ============================================

const elements = {
    // Pages
    pages: document.querySelectorAll('.page'),
    navBtns: document.querySelectorAll('.nav-btn'),

    // Home
    todayDate: document.getElementById('today-date'),
    sessionStatus: document.getElementById('session-status'),
    todaySessionContent: document.getElementById('today-session-content'),
    btnCreateSession: document.getElementById('btn-create-session'),
    statTotalSessions: document.getElementById('stat-total-sessions'),
    statMonthSessions: document.getElementById('stat-month-sessions'),
    statStreak: document.getElementById('stat-streak'),

    // Session Editor
    editorDate: document.getElementById('editor-date'),
    editorLocation: document.getElementById('editor-location'),
    editorMemo: document.getElementById('editor-memo'),
    editorTags: document.getElementById('editor-tags'),
    editorTagInput: document.getElementById('editor-tag-input'),
    statblocksContainer: document.getElementById('statblocks-container'),
    btnBackFromEditor: document.getElementById('btn-back-from-editor'),
    btnSaveSession: document.getElementById('btn-save-session'),
    btnAddStatblock: document.getElementById('btn-add-statblock'),

    // History
    historyList: document.getElementById('history-list'),
    historyListView: document.getElementById('history-list-view'),
    historyCalendarView: document.getElementById('history-calendar-view'),
    viewToggleBtns: document.querySelectorAll('.toggle-btn'),
    filterPeriod: document.getElementById('filter-period'),
    filterGameType: document.getElementById('filter-game-type'),
    calendarMonth: document.getElementById('calendar-month'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarPrev: document.getElementById('calendar-prev'),
    calendarNext: document.getElementById('calendar-next'),

    // Analytics
    periodBtns: document.querySelectorAll('.period-btn'),
    analyticsMetric: document.getElementById('analytics-metric'),
    analyticsChart: document.getElementById('analytics-chart'),
    summaryBest: document.getElementById('summary-best'),
    summaryAvg: document.getElementById('summary-avg'),
    summaryLatest: document.getElementById('summary-latest'),

    // Settings
    btnExport: document.getElementById('btn-export'),
    btnImport: document.getElementById('btn-import'),
    importFile: document.getElementById('import-file'),
    themeBtns: document.querySelectorAll('.theme-btn'),

    // Modals
    modalStatblock: document.getElementById('modal-statblock'),
    modalSessionDetail: document.getElementById('modal-session-detail'),
    gameTypeGrid: document.getElementById('game-type-grid'),
    detailDate: document.getElementById('detail-date'),
    sessionDetailContent: document.getElementById('session-detail-content'),
    btnEditSession: document.getElementById('btn-edit-session'),
    btnDeleteSession: document.getElementById('btn-delete-session')
};

// ============================================
// Initialization
// ============================================

async function init() {
    try {
        await initDB();
        console.log('App initialized');

        // Load theme
        const savedAccent = localStorage.getItem('accent') || 'cyan';
        setAccent(savedAccent);

        // Setup event listeners
        setupEventListeners();

        // Show today's date
        updateTodayDate();

        // Load home page data
        await loadHomePage();

    } catch (error) {
        console.error('Failed to initialize app:', error);
        showToast('アプリの初期化に失敗しました', 'error');
    }
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // Navigation
    elements.navBtns.forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.page));
    });

    // Create session
    elements.btnCreateSession.addEventListener('click', createTodaySession);

    // Session Editor
    elements.btnBackFromEditor.addEventListener('click', () => navigateTo('home'));
    elements.btnSaveSession.addEventListener('click', saveSession);
    elements.btnAddStatblock.addEventListener('click', openStatBlockModal);

    // Tag input
    elements.editorTagInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.value.trim()) {
            addTag(e.target.value.trim());
            e.target.value = '';
        }
    });

    // History view toggle
    elements.viewToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => toggleHistoryView(btn.dataset.view));
    });

    // History filters
    elements.filterPeriod.addEventListener('change', loadHistoryPage);
    elements.filterGameType.addEventListener('change', loadHistoryPage);

    // Calendar navigation
    elements.calendarPrev.addEventListener('click', () => {
        state.calendarMonth--;
        if (state.calendarMonth < 0) {
            state.calendarMonth = 11;
            state.calendarYear--;
        }
        renderCalendarView();
    });

    elements.calendarNext.addEventListener('click', () => {
        state.calendarMonth++;
        if (state.calendarMonth > 11) {
            state.calendarMonth = 0;
            state.calendarYear++;
        }
        renderCalendarView();
    });

    // Analytics period
    elements.periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.periodBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.selectedPeriod = btn.dataset.period;
            updateAnalytics();
        });
    });

    // Analytics metric
    elements.analyticsMetric.addEventListener('change', () => {
        state.selectedMetric = elements.analyticsMetric.value;
        updateAnalytics();
    });

    // Export/Import
    elements.btnExport.addEventListener('click', handleExport);
    elements.btnImport.addEventListener('click', () => elements.importFile.click());
    elements.importFile.addEventListener('change', handleImport);

    // Theme
    elements.themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            elements.themeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setAccent(btn.dataset.accent);
        });
    });

    // Modal close
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', closeModals);
    });

    // Game type selection
    elements.gameTypeGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.game-type-btn');
        if (btn) {
            addStatBlock(btn.dataset.type);
            closeModals();
        }
    });

    // Session detail actions
    elements.btnEditSession.addEventListener('click', () => {
        if (state.viewingSessionId) {
            editSession(state.viewingSessionId);
        }
    });

    elements.btnDeleteSession.addEventListener('click', async () => {
        if (state.viewingSessionId && confirm('このセッションを削除しますか？')) {
            await deleteSession(state.viewingSessionId);
            closeModals();
            showToast('セッションを削除しました', 'success');
            await loadHistoryPage();
            await loadHomePage();
        }
    });

    // History item click
    elements.historyList.addEventListener('click', (e) => {
        const item = e.target.closest('.history-item');
        if (item) {
            openSessionDetail(item.dataset.sessionId);
        }
    });

    // Calendar day click
    elements.calendarGrid.addEventListener('click', async (e) => {
        const day = e.target.closest('.calendar-day');
        if (day && day.classList.contains('has-session')) {
            const session = await getSessionByDate(day.dataset.date);
            if (session) {
                openSessionDetail(session.session_id);
            }
        }
    });
}

// ============================================
// Navigation
// ============================================

async function navigateTo(page) {
    state.currentPage = page;

    // Update nav buttons
    elements.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    // Update pages
    elements.pages.forEach(p => {
        p.classList.remove('active');
    });
    document.getElementById(`page-${page}`).classList.add('active');

    // Load page data
    switch (page) {
        case 'home':
            await loadHomePage();
            break;
        case 'history':
            await loadHistoryPage();
            break;
        case 'analytics':
            await loadAnalyticsPage();
            break;
    }
}

// ============================================
// Home Page
// ============================================

function updateTodayDate() {
    const today = new Date();
    elements.todayDate.textContent = formatDate(today.toISOString().split('T')[0]);
}

async function loadHomePage() {
    const today = getTodayDate();
    const todaySession = await getSessionByDate(today);
    const allSessions = await getAllSessions();

    // Update today's session card
    if (todaySession) {
        state.currentSession = todaySession;
        elements.sessionStatus.textContent = '記録済み';
        elements.sessionStatus.classList.add('recorded');

        const statblocks = await getStatBlocksBySession(todaySession.session_id);

        elements.todaySessionContent.innerHTML = `
            <div class="session-summary">
                <p>${todaySession.location || '場所未設定'}</p>
                <p class="muted">${statblocks.length}ゲーム記録</p>
                <button class="btn btn-secondary" onclick="editSession('${todaySession.session_id}')">
                    ✏️ 編集する
                </button>
            </div>
        `;
    } else {
        state.currentSession = null;
        elements.sessionStatus.textContent = '未記録';
        elements.sessionStatus.classList.remove('recorded');

        elements.todaySessionContent.innerHTML = `
            <button id="btn-create-session" class="btn btn-primary btn-large" onclick="createTodaySession()">
                <span class="btn-icon">➕</span>
                今日の記録を作成
            </button>
        `;
    }

    // Update stats
    elements.statTotalSessions.textContent = allSessions.length;

    const thisMonth = new Date().toISOString().slice(0, 7);
    const monthSessions = allSessions.filter(s => s.date.startsWith(thisMonth));
    elements.statMonthSessions.textContent = monthSessions.length;

    elements.statStreak.textContent = calculateStreak(allSessions);
}

async function createTodaySession() {
    try {
        const session = await createSession();
        state.currentSession = session;
        state.editingStatBlocks = [];
        state.editingTags = [];

        showToast('セッションを作成しました', 'success');
        openEditor(session);
    } catch (error) {
        console.error('Failed to create session:', error);
        showToast('セッションの作成に失敗しました', 'error');
    }
}

// ============================================
// Session Editor
// ============================================

async function openEditor(session) {
    state.currentSession = session;
    state.editingTags = [...(session.tags || [])];

    // Load statblocks
    const statblocks = await getStatBlocksBySession(session.session_id);
    state.editingStatBlocks = statblocks;

    // Update UI
    elements.editorDate.textContent = formatDate(session.date);
    elements.editorLocation.value = session.location || '';
    elements.editorMemo.value = session.memo || '';

    renderTags();
    renderStatBlocks();

    // Navigate to editor
    elements.pages.forEach(p => p.classList.remove('active'));
    document.getElementById('page-session-editor').classList.add('active');
    elements.navBtns.forEach(btn => btn.classList.remove('active'));
}

function renderTags() {
    elements.editorTags.innerHTML = state.editingTags.map(tag => renderTag(tag)).join('');
}

function addTag(tag) {
    if (!state.editingTags.includes(tag)) {
        state.editingTags.push(tag);
        renderTags();
    }
}

function removeTag(tag) {
    state.editingTags = state.editingTags.filter(t => t !== tag);
    renderTags();
}

function renderStatBlocks() {
    if (state.editingStatBlocks.length === 0) {
        elements.statblocksContainer.innerHTML = renderEmptyState('🎯', 'ゲームを追加してスタッツを記録しましょう');
    } else {
        elements.statblocksContainer.innerHTML = state.editingStatBlocks.map((block, i) =>
            renderStatBlock(block, i, true)
        ).join('');
    }
}

function openStatBlockModal() {
    elements.modalStatblock.classList.add('active');
}

function addStatBlock(gameType) {
    const preset = GAME_PRESETS[gameType];

    const statblock = {
        statblock_id: generateUUID(),
        session_id: state.currentSession.session_id,
        type: 'PRESET',
        game_type: gameType,
        items: preset.items.map(item => ({
            key: item.key,
            value_type: item.value_type,
            value_number: null,
            value_text: null,
            value_bool: null,
            unit: item.unit,
            note: null
        })),
        attachments: []
    };

    state.editingStatBlocks.push(statblock);
    renderStatBlocks();
}

function removeStatBlock(index) {
    state.editingStatBlocks.splice(index, 1);
    renderStatBlocks();
}

function addCustomStat(blockIndex) {
    const key = prompt('スタッツ名を入力してください:');
    if (!key) return;

    const type = prompt('タイプを選択 (number/text):', 'number');
    const valueType = type === 'text' ? 'TEXT' : 'NUMBER';

    state.editingStatBlocks[blockIndex].items.push({
        key: key,
        value_type: valueType,
        value_number: null,
        value_text: null,
        value_bool: null,
        unit: '',
        note: null
    });

    renderStatBlocks();
}

async function saveSession() {
    try {
        // Update session info
        state.currentSession.location = elements.editorLocation.value || null;
        state.currentSession.memo = elements.editorMemo.value || null;
        state.currentSession.tags = state.editingTags;

        await updateSession(state.currentSession);

        // Collect stat values from inputs
        document.querySelectorAll('.stat-value-input').forEach(input => {
            const blockIndex = parseInt(input.dataset.statblock);
            const key = input.dataset.key;
            const type = input.dataset.type;

            const block = state.editingStatBlocks[blockIndex];
            if (block) {
                const item = block.items.find(i => i.key === key);
                if (item) {
                    if (type === 'NUMBER') {
                        item.value_number = input.value ? parseFloat(input.value) : null;
                    } else {
                        item.value_text = input.value || null;
                    }
                }
            }
        });

        // Delete old statblocks and save new ones
        const oldBlocks = await getStatBlocksBySession(state.currentSession.session_id);
        for (const block of oldBlocks) {
            await deleteStatBlock(block.statblock_id);
        }

        for (const block of state.editingStatBlocks) {
            await createStatBlock(state.currentSession.session_id, block);
        }

        showToast('保存しました', 'success');
        await navigateTo('home');

    } catch (error) {
        console.error('Failed to save session:', error);
        showToast('保存に失敗しました', 'error');
    }
}

async function editSession(sessionId) {
    closeModals();
    const session = await getSession(sessionId);
    if (session) {
        openEditor(session);
    }
}

// ============================================
// History Page
// ============================================

async function loadHistoryPage() {
    let sessions = await getAllSessions();

    // Apply period filter
    const period = elements.filterPeriod.value;
    sessions = filterSessionsByPeriod(sessions, period);

    // Apply game type filter
    const gameType = elements.filterGameType.value;
    sessions = await filterSessionsByGameType(sessions, gameType);

    // Render list
    if (sessions.length === 0) {
        elements.historyList.innerHTML = renderEmptyState('📋', '記録がありません');
    } else {
        const listItems = [];
        for (const session of sessions) {
            const statblocks = await getStatBlocksBySession(session.session_id);
            const gameTypes = [...new Set(statblocks.map(b => b.game_type).filter(Boolean))];
            listItems.push(renderHistoryItem(session, gameTypes));
        }
        elements.historyList.innerHTML = listItems.join('');
    }

    // Render calendar
    await renderCalendarView();
}

async function renderCalendarView() {
    const sessions = await getAllSessions();
    const sessionDates = new Set(sessions.map(s => s.date));
    const todayDate = getTodayDate();

    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
    elements.calendarMonth.textContent = `${state.calendarYear}年 ${monthNames[state.calendarMonth]}`;

    elements.calendarGrid.innerHTML = renderCalendar(
        state.calendarYear,
        state.calendarMonth,
        sessionDates,
        todayDate
    );
}

function toggleHistoryView(view) {
    elements.viewToggleBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    elements.historyListView.classList.toggle('active', view === 'list');
    elements.historyCalendarView.classList.toggle('active', view === 'calendar');
}

async function openSessionDetail(sessionId) {
    state.viewingSessionId = sessionId;

    const session = await getSession(sessionId);
    const statblocks = await getStatBlocksBySession(sessionId);

    elements.detailDate.textContent = formatDate(session.date);
    elements.sessionDetailContent.innerHTML = renderSessionDetail(session, statblocks);

    elements.modalSessionDetail.classList.add('active');
}

// ============================================
// Analytics Page
// ============================================

async function loadAnalyticsPage() {
    await updateAnalytics();
}

async function updateAnalytics() {
    const allSessions = await getAllSessions();
    let sessions = state.selectedPeriod === 'all'
        ? allSessions
        : filterSessionsByPeriod(allSessions, state.selectedPeriod);

    // Collect data based on selected metric
    const dataPoints = [];

    for (const session of sessions.reverse()) {
        const statblocks = await getStatBlocksBySession(session.session_id);

        for (const block of statblocks) {
            let value = null;

            switch (state.selectedMetric) {
                case 'countup':
                    if (block.game_type === 'COUNTUP') {
                        value = getStatValue(block.items, 'Score');
                    }
                    break;
                case 'rating':
                    if (block.game_type === '01') {
                        value = getStatValue(block.items, 'Rating');
                    }
                    break;
                case 'mpr':
                    if (block.game_type === 'CRICKET') {
                        value = getStatValue(block.items, 'MPR');
                    }
                    break;
            }

            if (value !== null) {
                dataPoints.push({
                    date: session.date,
                    value: value
                });
            }
        }
    }

    // Update chart
    renderChart(dataPoints);

    // Update summary stats
    const values = dataPoints.map(d => d.value);
    const stats = calculateStats(values);

    elements.summaryBest.textContent = stats.best || '--';
    elements.summaryAvg.textContent = stats.avg || '--';
    elements.summaryLatest.textContent = stats.latest || '--';
}

function renderChart(dataPoints) {
    const ctx = elements.analyticsChart.getContext('2d');

    if (state.analyticsChart) {
        state.analyticsChart.destroy();
    }

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

    state.analyticsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dataPoints.map(d => formatDateShort(d.date)),
            datasets: [{
                label: elements.analyticsMetric.options[elements.analyticsMetric.selectedIndex].text,
                data: dataPoints.map(d => d.value),
                borderColor: accent,
                backgroundColor: accent + '20',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: accent
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#2a2a2a'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                },
                y: {
                    grid: {
                        color: '#2a2a2a'
                    },
                    ticks: {
                        color: '#a0a0a0'
                    }
                }
            }
        }
    });
}

// ============================================
// Settings
// ============================================

async function handleExport() {
    try {
        const data = await exportData();
        const filename = `darts-stats-log_${getTodayDate()}.json`;
        downloadFile(data, filename, 'application/json');
        showToast('エクスポートが完了しました', 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showToast('エクスポートに失敗しました', 'error');
    }
}

async function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const content = await readFileAsText(file);
        const result = await importData(content);
        showToast(`インポート完了: ${result.sessionsImported}セッション, ${result.statblocksImported}ゲーム`, 'success');
        await loadHomePage();
        e.target.value = '';
    } catch (error) {
        console.error('Import failed:', error);
        showToast('インポートに失敗しました', 'error');
    }
}

function setAccent(accent) {
    document.body.dataset.accent = accent;
    localStorage.setItem('accent', accent);

    elements.themeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.accent === accent);
    });
}

// ============================================
// Modals
// ============================================

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    state.viewingSessionId = null;
}

// ============================================
// Start Application
// ============================================

document.addEventListener('DOMContentLoaded', init);

// Make functions globally available
window.createTodaySession = createTodaySession;
window.editSession = editSession;
window.removeStatBlock = removeStatBlock;
window.addCustomStat = addCustomStat;
window.removeTag = removeTag;
