/**
 * Darts Stats Log - Utility Functions
 */

/**
 * Format date to Japanese format
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];

    return `${year}/${month}/${day} (${weekday})`;
}

/**
 * Format date for display (short)
 */
function formatDateShort(dateString) {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

/**
 * Get days between two dates
 */
function getDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

/**
 * Get date N days ago
 */
function getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
}

/**
 * Calculate streak of consecutive days with sessions
 */
function calculateStreak(sessions) {
    if (!sessions || sessions.length === 0) return 0;

    const dates = new Set(sessions.map(s => s.date));
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];

        if (dates.has(dateStr)) {
            streak++;
        } else if (i > 0) {
            break;
        }
    }

    return streak;
}

/**
 * Filter sessions by period
 */
function filterSessionsByPeriod(sessions, period) {
    if (period === 'all') return sessions;

    const days = parseInt(period);
    const cutoffDate = getDateDaysAgo(days);

    return sessions.filter(s => s.date >= cutoffDate);
}

/**
 * Filter sessions by game type
 */
async function filterSessionsByGameType(sessions, gameType) {
    if (gameType === 'all') return sessions;

    const filteredSessions = [];

    for (const session of sessions) {
        const statblocks = await getStatBlocksBySession(session.session_id);
        const hasGameType = statblocks.some(block => block.game_type === gameType);
        if (hasGameType) {
            filteredSessions.push(session);
        }
    }

    return filteredSessions;
}

/**
 * Get statistic value from items
 */
function getStatValue(items, key) {
    const item = items.find(i => i.key === key);
    if (!item) return null;

    if (item.value_type === 'NUMBER') {
        return item.value_number;
    } else if (item.value_type === 'TEXT') {
        return item.value_text;
    } else if (item.value_type === 'BOOL') {
        return item.value_bool;
    }

    return null;
}

/**
 * Calculate statistics for analytics
 */
function calculateStats(values) {
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v));

    if (validValues.length === 0) {
        return { best: null, avg: null, latest: null };
    }

    const best = Math.max(...validValues);
    const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    const latest = validValues[0];

    return {
        best: best.toFixed(1),
        avg: avg.toFixed(1),
        latest: latest.toFixed(1)
    };
}

/**
 * Download file
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Read file as text
 */
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'error' ? '#ff4466' : type === 'success' ? '#00ff88' : '#00ffff'};
        color: #0a0a0a;
        font-weight: 500;
        border-radius: 8px;
        z-index: 2000;
        animation: toastIn 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Add toast animations to document
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(20px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
`;
document.head.appendChild(toastStyles);
