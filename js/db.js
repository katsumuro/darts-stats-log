/**
 * Darts Stats Log - IndexedDB Database Layer
 * Using native IndexedDB API for offline data persistence
 */

const DB_NAME = 'DartsStatsLog';
const DB_VERSION = 1;

// Store names
const STORES = {
    SESSIONS: 'sessions',
    STATBLOCKS: 'statblocks'
};

// Database instance
let db = null;

/**
 * Initialize the database
 */
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Failed to open database:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            db = request.result;
            console.log('Database opened successfully');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Create sessions store
            if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
                const sessionsStore = database.createObjectStore(STORES.SESSIONS, { keyPath: 'session_id' });
                sessionsStore.createIndex('date', 'date', { unique: false });
                sessionsStore.createIndex('created_at', 'created_at', { unique: false });
            }

            // Create statblocks store
            if (!database.objectStoreNames.contains(STORES.STATBLOCKS)) {
                const statblocksStore = database.createObjectStore(STORES.STATBLOCKS, { keyPath: 'statblock_id' });
                statblocksStore.createIndex('session_id', 'session_id', { unique: false });
            }
        };
    });
}

/**
 * Generate UUID
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getTodayDate() {
    const now = new Date();
    return now.toISOString().split('T')[0];
}

// ============================================
// Session CRUD Operations
// ============================================

/**
 * Create a new session
 */
function createSession(data = {}) {
    return new Promise((resolve, reject) => {
        const session = {
            session_id: generateUUID(),
            date: getTodayDate(),
            location: data.location || null,
            memo: data.memo || null,
            tags: data.tags || [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.SESSIONS);
        const request = store.add(session);

        request.onsuccess = () => resolve(session);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get session by ID
 */
function getSession(sessionId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SESSIONS], 'readonly');
        const store = transaction.objectStore(STORES.SESSIONS);
        const request = store.get(sessionId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get session by date
 */
function getSessionByDate(date) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SESSIONS], 'readonly');
        const store = transaction.objectStore(STORES.SESSIONS);
        const index = store.index('date');
        const request = index.get(date);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all sessions
 */
function getAllSessions() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SESSIONS], 'readonly');
        const store = transaction.objectStore(STORES.SESSIONS);
        const request = store.getAll();

        request.onsuccess = () => {
            const sessions = request.result.sort((a, b) =>
                new Date(b.date) - new Date(a.date)
            );
            resolve(sessions);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update session
 */
function updateSession(session) {
    return new Promise((resolve, reject) => {
        session.updated_at = new Date().toISOString();

        const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.SESSIONS);
        const request = store.put(session);

        request.onsuccess = () => resolve(session);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete session
 */
function deleteSession(sessionId) {
    return new Promise(async (resolve, reject) => {
        try {
            // First delete all statblocks for this session
            const statblocks = await getStatBlocksBySession(sessionId);
            for (const block of statblocks) {
                await deleteStatBlock(block.statblock_id);
            }

            // Then delete the session
            const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
            const store = transaction.objectStore(STORES.SESSIONS);
            const request = store.delete(sessionId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

// ============================================
// StatBlock CRUD Operations
// ============================================

/**
 * Create a new statblock
 */
function createStatBlock(sessionId, data = {}) {
    return new Promise((resolve, reject) => {
        const statblock = {
            statblock_id: generateUUID(),
            session_id: sessionId,
            type: data.type || 'PRESET',
            game_type: data.game_type || null,
            items: data.items || [],
            attachments: data.attachments || []
        };

        const transaction = db.transaction([STORES.STATBLOCKS], 'readwrite');
        const store = transaction.objectStore(STORES.STATBLOCKS);
        const request = store.add(statblock);

        request.onsuccess = () => resolve(statblock);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get statblocks by session ID
 */
function getStatBlocksBySession(sessionId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.STATBLOCKS], 'readonly');
        const store = transaction.objectStore(STORES.STATBLOCKS);
        const index = store.index('session_id');
        const request = index.getAll(sessionId);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all statblocks
 */
function getAllStatBlocks() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.STATBLOCKS], 'readonly');
        const store = transaction.objectStore(STORES.STATBLOCKS);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Update statblock
 */
function updateStatBlock(statblock) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.STATBLOCKS], 'readwrite');
        const store = transaction.objectStore(STORES.STATBLOCKS);
        const request = store.put(statblock);

        request.onsuccess = () => resolve(statblock);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete statblock
 */
function deleteStatBlock(statblockId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.STATBLOCKS], 'readwrite');
        const store = transaction.objectStore(STORES.STATBLOCKS);
        const request = store.delete(statblockId);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============================================
// Export/Import Functions
// ============================================

/**
 * Export all data to JSON
 */
async function exportData() {
    const sessions = await getAllSessions();
    const statblocks = await getAllStatBlocks();

    const data = {
        version: 1,
        exported_at: new Date().toISOString(),
        sessions: sessions,
        statblocks: statblocks
    };

    return JSON.stringify(data, null, 2);
}

/**
 * Import data from JSON
 */
async function importData(jsonString) {
    const data = JSON.parse(jsonString);

    if (!data.sessions || !data.statblocks) {
        throw new Error('Invalid data format');
    }

    // Clear existing data
    await clearAllData();

    // Import sessions
    for (const session of data.sessions) {
        const transaction = db.transaction([STORES.SESSIONS], 'readwrite');
        const store = transaction.objectStore(STORES.SESSIONS);
        await new Promise((resolve, reject) => {
            const request = store.add(session);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Import statblocks
    for (const statblock of data.statblocks) {
        const transaction = db.transaction([STORES.STATBLOCKS], 'readwrite');
        const store = transaction.objectStore(STORES.STATBLOCKS);
        await new Promise((resolve, reject) => {
            const request = store.add(statblock);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    return {
        sessionsImported: data.sessions.length,
        statblocksImported: data.statblocks.length
    };
}

/**
 * Clear all data
 */
function clearAllData() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORES.SESSIONS, STORES.STATBLOCKS], 'readwrite');

        transaction.objectStore(STORES.SESSIONS).clear();
        transaction.objectStore(STORES.STATBLOCKS).clear();

        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}

// ============================================
// Preset Templates
// ============================================

const GAME_PRESETS = {
    '01': {
        name: '01 GAMES',
        icon: '🎯',
        color: '#ffaa00',
        items: [
            { key: 'Rating_avg', label: 'Rating (平均)', value_type: 'NUMBER', unit: '' },
            { key: 'Rating_max', label: 'Rating (最高)', value_type: 'NUMBER', unit: '' }
        ]
    },
    CRICKET: {
        name: 'CRICKET',
        icon: '🦋',
        color: '#00ffaa',
        items: [
            { key: 'MPR_avg', label: 'MPR (平均)', value_type: 'NUMBER', unit: '' },
            { key: 'MPR_max', label: 'MPR (最高)', value_type: 'NUMBER', unit: '' }
        ]
    },
    COUNTUP: {
        name: 'COUNT-UP',
        icon: '💯',
        color: '#ff6688',
        items: [
            { key: 'Score_avg', label: 'Score (平均)', value_type: 'NUMBER', unit: '' },
            { key: 'Score_max', label: 'Score (最高)', value_type: 'NUMBER', unit: '' }
        ]
    },
    OTHER: {
        name: 'OTHER',
        icon: '📝',
        color: '#888888',
        items: [
            { key: 'Note', label: 'メモ', value_type: 'TEXT', unit: '' }
        ]
    }
};

// ============================================
// DARTSLIVE Rating Calculation
// ============================================

/**
 * Calculate 01 Rating from PPD (Points Per Dart)
 * Based on DARTSLIVE rating formula approximation
 */
function calculate01Rating(ppd) {
    if (!ppd || ppd <= 0) return null;
    // Approximate formula: Rating = PPD / 3 - some offset
    // DARTSLIVE uses: Rating ≈ (PPD - 15) / 5 + 1 approximately
    // More accurate: Rating = (PPD / 20) * 4 + base
    return Math.round((ppd / 20) * 4 * 100) / 100;
}

/**
 * Calculate Cricket Rating from MPR (Marks Per Round)
 */
function calculateCricketRating(mpr) {
    if (!mpr || mpr <= 0) return null;
    // DARTSLIVE Cricket Rating approximation
    // Rating ≈ MPR * 2.5 + offset
    return Math.round(mpr * 2.5 * 100) / 100;
}

/**
 * Estimate overall rating (like DARTSLIVE's main rating)
 */
function calculateOverallRating(rating01, cricketRating) {
    if (rating01 && cricketRating) {
        return Math.round(((rating01 + cricketRating) / 2) * 100) / 100;
    }
    return rating01 || cricketRating || null;
}

/**
 * Get stats class based on rating value
 */
function getRatingClass(rating) {
    if (!rating) return '';
    if (rating >= 10) return 'rating-sa';
    if (rating >= 8) return 'rating-a';
    if (rating >= 6) return 'rating-b';
    if (rating >= 4) return 'rating-c';
    return 'rating-d';
}

