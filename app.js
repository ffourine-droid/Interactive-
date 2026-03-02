import './style.css';

// Safe LocalStorage helpers
function getStorage(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
}

function setStorage(key, value) {
    try {
        localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (e) {
        // Ignore
    }
}

// State
let searchHistory = getStorage('azilearn_history', []);

// DOM Elements
const searchInput = document.getElementById('search-input');
const searchHistoryContainer = document.getElementById('search-history');
const resultsContainer = document.getElementById('results-container');
const searchQueryDisplay = document.getElementById('search-query-display');

// Icons
const clockIcon = `<svg class="history-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

function renderHistory() {
    if (searchHistory.length === 0) {
        searchHistoryContainer.classList.add('hidden');
        return;
    }

    searchHistoryContainer.innerHTML = searchHistory.map((item, index) => `
        <div class="history-item" data-index="${index}">
            ${clockIcon}
            <span class="history-text">${item}</span>
            <span class="history-remove" data-index="${index}">Remove</span>
        </div>
    `).join('');
}

function performSearch(query) {
    if (!query.trim()) return;
    
    // Remove if already exists to move it to top
    searchHistory = searchHistory.filter(item => item.toLowerCase() !== query.toLowerCase());
    
    // Add to top
    searchHistory.unshift(query.trim());
    
    // Keep only last 8
    if (searchHistory.length > 8) {
        searchHistory.pop();
    }
    
    setStorage('azilearn_history', searchHistory);
    renderHistory();
    
    searchHistoryContainer.classList.add('hidden');
    searchInput.blur();
    
    // Show results container
    searchQueryDisplay.textContent = query.trim();
    resultsContainer.classList.remove('hidden');
}

function removeSearch(index) {
    searchHistory.splice(index, 1);
    setStorage('azilearn_history', searchHistory);
    renderHistory();
    
    if (searchHistory.length === 0) {
        searchHistoryContainer.classList.add('hidden');
    }
}

// Event Listeners
searchInput.addEventListener('focus', () => {
    if (searchHistory.length > 0) {
        searchHistoryContainer.classList.remove('hidden');
    }
});

searchInput.addEventListener('input', () => {
    resultsContainer.classList.add('hidden');
});

// Hide history when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        searchHistoryContainer.classList.add('hidden');
    }
});

searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        performSearch(searchInput.value);
    }
});

searchHistoryContainer.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.history-remove');
    if (removeBtn) {
        const index = parseInt(removeBtn.getAttribute('data-index'));
        removeSearch(index);
        e.stopPropagation(); // Prevent triggering the item click
        return;
    }
    
    const historyItem = e.target.closest('.history-item');
    if (historyItem) {
        const index = parseInt(historyItem.getAttribute('data-index'));
        const query = searchHistory[index];
        searchInput.value = query;
        performSearch(query);
    }
});

// Initialize
renderHistory();
