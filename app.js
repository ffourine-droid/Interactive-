// Topics for search
const topics = [
    {name:"Quadratic Equations Form 3", subject:"Mathematics", color:"#7C3AED", icon: "📐"},
    {name:"Photosynthesis Form 2", subject:"Biology", color:"#16A34A", icon: "🌿"},
    {name:"Kenya Independence", subject:"History", color:"#FF6B00", icon: "🇰🇪"},
    {name:"Trigonometry Form 4", subject:"Mathematics", color:"#7C3AED", icon: "📐"},
    {name:"Cell Division Form 3", subject:"Biology", color:"#16A34A", icon: "🔬"},
    {name:"World War 2", subject:"History", color:"#FF6B00", icon: "🌍"},
    {name:"Linear Programming Form 4", subject:"Mathematics", color:"#7C3AED", icon: "📈"},
    {name:"Ionic Bonding", subject:"Chemistry", color:"#059669", icon: "🧪"},
    {name:"Probability Form 4", subject:"Mathematics", color:"#7C3AED", icon: "🎲"},
    {name:"Weather and Climate", subject:"Geography", color:"#0284C7", icon: "☁️"},
    {name:"Acids Bases and Salts", subject:"Chemistry", color:"#059669", icon: "🧪"},
    {name:"Matrices Form 4", subject:"Mathematics", color:"#7C3AED", icon: "🔢"},
    {name:"Rivers and Drainage", subject:"Geography", color:"#0284C7", icon: "🌊"},
    {name:"Poetry Form 4", subject:"English", color:"#DC2626", icon: "📜"},
    {name:"Logarithms Form 2", subject:"Mathematics", color:"#7C3AED", icon: "🔢"},
    {name:"Organic Chemistry Form 4", subject:"Chemistry", color:"#059669", icon: "⚗️"},
    {name:"KCSE 2022 Maths Paper 2", subject:"Mathematics", color:"#7C3AED", icon: "📝"},
    {name:"Newton's Laws of Motion", subject:"Physics", color:"#0891B2", icon: "🍎"},
    {name:"Entrepreneurship", subject:"Business", color:"#CA8A04", icon: "💼"},
    {name:"Plant Nutrition", subject:"Biology", color:"#16A34A", icon: "🌱"}
];

const subjects = [
    { name: "Mathematics", topics: 47, icon: "📐", color: "linear-gradient(135deg, #7C3AED, #4F46E5)" },
    { name: "Physics", topics: 32, icon: "🍎", color: "linear-gradient(135deg, #0891B2, #0E7490)" },
    { name: "Chemistry", topics: 38, icon: "🧪", color: "linear-gradient(135deg, #059669, #047857)" },
    { name: "Biology", topics: 41, icon: "🌿", color: "linear-gradient(135deg, #16A34A, #15803D)" },
    { name: "English", topics: 29, icon: "📜", color: "linear-gradient(135deg, #DC2626, #B91C1C)" },
    { name: "Kiswahili", topics: 27, icon: "🇰🇪", color: "linear-gradient(135deg, #D97706, #B45309)" },
    { name: "History", topics: 35, icon: "🌍", color: "linear-gradient(135deg, #FF6B00, #EA580C)" },
    { name: "Geography", topics: 31, icon: "🗺️", color: "linear-gradient(135deg, #0284C7, #0369A1)" },
    { name: "CRE", topics: 24, icon: "🙏", color: "linear-gradient(135deg, #9333EA, #7E22CE)" },
    { name: "Business", topics: 22, icon: "💼", color: "linear-gradient(135deg, #CA8A04, #A16207)" },
    { name: "Agriculture", topics: 26, icon: "🚜", color: "linear-gradient(135deg, #65A30D, #4D7C0F)" },
    { name: "Computer", topics: 18, icon: "💻", color: "linear-gradient(135deg, #0F172A, #1E293B)" }
];

// State
let currentTab = 'home';
let recentSearches = JSON.parse(localStorage.getItem('azilearn_recent')) || [];
let viewedTopics = parseInt(localStorage.getItem('azilearn_viewed')) || 0;
let exploredSubjects = new Set(JSON.parse(localStorage.getItem('azilearn_explored')) || []);

// DOM Elements
const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const mainSearch = document.getElementById('main-search');
const searchSuggestions = document.getElementById('search-suggestions');
const loadingOverlay = document.getElementById('loading-overlay');
const toastContainer = document.getElementById('toast-container');
const subjectsGrid = document.getElementById('subjects-grid');
const fullSubjectsList = document.getElementById('full-subjects-list');
const subjectFilter = document.getElementById('subject-filter');
const searchInputFull = document.getElementById('search-input-full');
const searchResultsFull = document.getElementById('search-results-full');
const recentSearchesList = document.getElementById('recent-searches-list');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// Initialization
function init() {
    renderSubjects();
    renderFullSubjects();
    renderRecentSearches();
    updateStats();
    setupTypewriter();
    setupIntersectionObserver();
    
    // Check dark mode preference
    const isDark = localStorage.getItem('azilearn_theme') !== 'light';
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    darkModeToggle.checked = isDark;
}

// Navigation
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const pageId = item.getAttribute('data-page');
        switchTab(pageId);
    });
});

function switchTab(tabId) {
    if (currentTab === tabId) return;
    
    currentTab = tabId;
    
    // Update Nav UI
    navItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === tabId);
    });
    
    // Update Page visibility with animation
    pages.forEach(page => {
        const isTarget = page.id === `${tabId}-page`;
        if (isTarget) {
            page.classList.add('active');
            if (tabId === 'search') {
                setTimeout(() => searchInputFull.focus(), 100);
            }
        } else {
            page.classList.remove('active');
        }
    });
    
    window.scrollTo(0, 0);
}

// Search Logic
const placeholders = [
    "Search Quadratic Equations...",
    "Search Photosynthesis...",
    "Search Kenya History...",
    "Search Trigonometry...",
    "Search Cell Division..."
];

function setupTypewriter() {
    let i = 0;
    setInterval(() => {
        i = (i + 1) % placeholders.length;
        mainSearch.setAttribute('placeholder', placeholders[i]);
    }, 2500);
}

mainSearch.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 2) {
        searchSuggestions.classList.add('hidden');
        return;
    }
    
    const filtered = topics.filter(t => t.name.toLowerCase().includes(query)).slice(0, 5);
    
    if (filtered.length > 0) {
        searchSuggestions.innerHTML = filtered.map(t => `
            <div class="suggestion-item ripple" onclick="openTopic('${t.name}')">
                <span>${t.icon}</span>
                <span>${t.name}</span>
            </div>
        `).join('');
        searchSuggestions.classList.remove('hidden');
    } else {
        searchSuggestions.classList.add('hidden');
    }
});

searchInputFull.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length < 1) {
        searchResultsFull.innerHTML = '';
        return;
    }
    
    const filtered = topics.filter(t => t.name.toLowerCase().includes(query));
    
    searchResultsFull.innerHTML = filtered.map(t => `
        <div class="result-item ripple" onclick="openTopic('${t.name}')">
            <div class="result-info">
                <h4>${t.name}</h4>
                <span class="result-badge" style="background: ${t.color}">${t.subject}</span>
            </div>
            <div class="result-arrow">→</div>
        </div>
    `).join('');
});

function openTopic(name) {
    loadingOverlay.classList.remove('hidden');
    
    // Save to recent
    if (!recentSearches.includes(name)) {
        recentSearches = [name, ...recentSearches].slice(0, 5);
        localStorage.setItem('azilearn_recent', JSON.stringify(recentSearches));
        renderRecentSearches();
    }
    
    // Update stats
    viewedTopics++;
    localStorage.setItem('azilearn_viewed', viewedTopics);
    updateStats();
    
    setTimeout(() => {
        loadingOverlay.classList.add('hidden');
        showToast(`Loaded: ${name} 🚀`);
        mainSearch.value = '';
        searchSuggestions.classList.add('hidden');
    }, 1500);
}

// Rendering
function renderSubjects() {
    subjectsGrid.innerHTML = subjects.map((s, i) => `
        <div class="subject-card ripple" style="background: ${s.color}; animation-delay: ${i * 0.1}s" onclick="loadingSubject('${s.name}')">
            <span class="icon">${s.icon}</span>
            <span class="name">${s.name}</span>
            <span class="count">${s.topics} Topics</span>
            <span class="arrow">→</span>
        </div>
    `).join('');
}

function renderFullSubjects() {
    fullSubjectsList.innerHTML = subjects.map(s => `
        <div class="subject-list-item ripple" onclick="loadingSubject('${s.name}')">
            <span class="icon">${s.icon}</span>
            <div class="info">
                <span class="name">${s.name}</span>
                <span class="count">${s.topics} Topics</span>
            </div>
            <span class="chevron">›</span>
        </div>
    `).join('');
}

function renderRecentSearches() {
    recentSearchesList.innerHTML = recentSearches.map(s => `
        <span class="recent-item ripple" onclick="openTopic('${s}')">${s}</span>
    `).join('');
}

function updateStats() {
    document.getElementById('stat-topics').textContent = viewedTopics;
    document.getElementById('stat-subjects').textContent = exploredSubjects.size;
}

function loadingSubject(name) {
    showToast(`Loading ${name}... 🚀`);
    exploredSubjects.add(name);
    localStorage.setItem('azilearn_explored', JSON.stringify([...exploredSubjects]));
    updateStats();
}

// UI Helpers
function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastIn 0.4s reverse forwards';
        setTimeout(() => toast.remove(), 400);
    }, 2000);
}

// Ripple Effect
document.addEventListener('click', (e) => {
    const target = e.target.closest('.ripple');
    if (!target) return;
    
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
});

// Dark Mode
darkModeToggle.addEventListener('change', (e) => {
    const isDark = e.target.checked;
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('azilearn_theme', isDark ? 'dark' : 'light');
});

// Intersection Observer for Scroll Animations
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = 'running';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.subject-card, .trending-card, .motivation-banner').forEach(el => {
        el.style.animationPlayState = 'paused';
        observer.observe(el);
    });
}

// PWA Install Prompt
let deferredPrompt;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const closeInstall = document.getElementById('close-install');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.classList.remove('hidden');
});

installBtn.addEventListener('click', () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        installBanner.classList.add('hidden');
        deferredPrompt = null;
    });
});

closeInstall.addEventListener('click', () => {
    installBanner.classList.add('hidden');
});

// Subject Filter
subjectFilter.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.subject-list-item');
    items.forEach(item => {
        const name = item.querySelector('.name').textContent.toLowerCase();
        item.style.display = name.includes(query) ? 'flex' : 'none';
    });
});

// Trending cards click
document.querySelectorAll('.trending-card').forEach(card => {
    card.addEventListener('click', () => {
        openTopic(card.getAttribute('data-topic'));
    });
});

// Init
init();
