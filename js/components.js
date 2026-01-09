/**
 * Darts Stats Log - UI Components
 */

/**
 * Render a StatBlock card
 */
function renderStatBlock(statblock, index, editable = true) {
    const preset = GAME_PRESETS[statblock.game_type] || GAME_PRESETS.OTHER;

    let itemsHtml = '';

    // Render preset items + any custom items
    const allItems = [...statblock.items];

    for (const item of allItems) {
        const value = item.value_type === 'NUMBER'
            ? (item.value_number !== null ? item.value_number : '')
            : item.value_type === 'TEXT'
                ? (item.value_text || '')
                : '';

        // Use label if available, otherwise use key
        const displayLabel = item.label || item.key;

        if (editable) {
            itemsHtml += `
                <div class="stat-row" data-key="${item.key}">
                    <span class="stat-key">${displayLabel}</span>
                    <input type="${item.value_type === 'NUMBER' ? 'number' : 'text'}" 
                           class="form-input stat-value-input" 
                           value="${value}"
                           step="any"
                           placeholder="${item.value_type === 'NUMBER' ? '0.00' : ''}"
                           data-statblock="${index}"
                           data-key="${item.key}"
                           data-type="${item.value_type}">
                    <span class="stat-unit">${item.unit || ''}</span>
                </div>
            `;
        } else {
            itemsHtml += `
                <div class="stat-row">
                    <span class="stat-key">${displayLabel}</span>
                    <span class="stat-value-display">${value || '--'}</span>
                    <span class="stat-unit">${item.unit || ''}</span>
                </div>
            `;
        }
    }

    // Add button for adding custom stats (only in editable mode)
    const addButtonHtml = editable ? `
        <button class="add-stat-btn" onclick="addCustomStat(${index})">
            ➕ スタッツを追加
        </button>
    ` : '';

    return `
        <div class="statblock" data-index="${index}">
            <div class="statblock-header">
                <div class="statblock-type">
                    <span class="statblock-icon">${preset.icon}</span>
                    <span class="statblock-name">${preset.name}</span>
                </div>
                ${editable ? `
                    <button class="btn btn-ghost" onclick="removeStatBlock(${index})">🗑️</button>
                ` : ''}
            </div>
            <div class="statblock-body">
                ${itemsHtml}
                ${addButtonHtml}
            </div>
        </div>
    `;
}

/**
 * Render history item
 */
function renderHistoryItem(session, gameTypes = []) {
    const badgesHtml = gameTypes.map(type => {
        const preset = GAME_PRESETS[type];
        const badgeClass = type === 'COUNTUP' ? 'countup' : type === '01' ? 'game-01' : type === 'CRICKET' ? 'cricket' : '';
        return `<span class="badge ${badgeClass}">${preset ? preset.name : type}</span>`;
    }).join('');

    return `
        <div class="history-item" data-session-id="${session.session_id}">
            <div class="history-item-info">
                <div class="history-item-date">${formatDate(session.date)}</div>
                <div class="history-item-location">${session.location || '場所未設定'}</div>
            </div>
            <div class="history-item-badges">
                ${badgesHtml}
            </div>
        </div>
    `;
}

/**
 * Render session detail
 */
function renderSessionDetail(session, statblocks) {
    let html = `
        <div class="detail-section">
            <div class="detail-row">
                <span class="detail-label">場所</span>
                <span class="detail-value">${session.location || '--'}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">メモ</span>
                <span class="detail-value">${session.memo || '--'}</span>
            </div>
            ${session.tags && session.tags.length > 0 ? `
                <div class="detail-row">
                    <span class="detail-label">タグ</span>
                    <div class="tags-list">
                        ${session.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    if (statblocks.length > 0) {
        html += '<div class="detail-section"><h4>スタッツ</h4>';
        for (const block of statblocks) {
            html += renderStatBlock(block, 0, false);
        }
        html += '</div>';
    }

    return html;
}

/**
 * Render empty state
 */
function renderEmptyState(icon, message) {
    return `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <p class="empty-text">${message}</p>
        </div>
    `;
}

/**
 * Render calendar with optional rating data
 * @param {number} year
 * @param {number} month
 * @param {Set} sessionDates - Dates that have sessions
 * @param {string} todayDate - Today's date string
 * @param {Object} dateRatings - Optional map of date to ratings { date: { rating01, mpr, countup } }
 */
function renderCalendar(year, month, sessionDates, todayDate, dateRatings = {}) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    let html = weekdays.map(day => `<div class="calendar-day-header">${day}</div>`).join('');

    // Empty cells before first day
    for (let i = 0; i < startDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasSession = sessionDates.has(dateStr);
        const isToday = dateStr === todayDate;
        const ratings = dateRatings[dateStr] || {};

        let ratingHtml = '';
        if (hasSession && (ratings.rating01 || ratings.mpr || ratings.countup)) {
            ratingHtml = '<div class="calendar-day-stats">';
            if (ratings.rating01) {
                ratingHtml += `<span class="calendar-stat-01">${ratings.rating01.toFixed(1)}</span>`;
            }
            if (ratings.mpr) {
                ratingHtml += `<span class="calendar-stat-cricket">${ratings.mpr.toFixed(2)}</span>`;
            }
            if (ratings.countup) {
                ratingHtml += `<span class="calendar-stat-countup">${ratings.countup}</span>`;
            }
            ratingHtml += '</div>';
        }

        html += `
            <div class="calendar-day ${hasSession ? 'has-session' : ''} ${isToday ? 'today' : ''}" 
                 data-date="${dateStr}">
                <span class="calendar-day-number">${day}</span>
                ${ratingHtml}
            </div>
        `;
    }

    return html;
}

/**
 * Render tag
 */
function renderTag(tag, removable = true) {
    return `
        <span class="tag">
            ${tag}
            ${removable ? `<span class="tag-remove" onclick="removeTag('${tag}')">✕</span>` : ''}
        </span>
    `;
}

// Add additional styles for detail view
const detailStyles = document.createElement('style');
detailStyles.textContent = `
    .detail-section {
        margin-bottom: 16px;
    }
    .detail-section h4 {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }
    .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: 8px 0;
        border-bottom: 1px solid var(--border-color);
    }
    .detail-row:last-child {
        border-bottom: none;
    }
    .detail-label {
        font-size: 0.8125rem;
        color: var(--text-secondary);
    }
    .detail-value {
        font-size: 0.9375rem;
        text-align: right;
    }
    .stat-value-display {
        font-family: var(--font-display);
        font-size: 1rem;
        color: var(--accent);
    }
`;
document.head.appendChild(detailStyles);
