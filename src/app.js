// Supabase Configuration
// Replace with your actual values
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const { createClient } = supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const resultsList = document.getElementById('results-list');
const previewModal = document.getElementById('preview-modal');
const modalIframe = document.getElementById('modal-iframe');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.getElementById('close-btn');

// Search function
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    resultsList.innerHTML = '<div class="status-msg">Searching...</div>';

    try {
        const { data, error } = await _supabase
            .from('experiments')
            .select('id, title, keywords, html_content')
            .ilike('keywords', `%${query}%`);

        if (error) throw error;

        renderResults(data);
    } catch (err) {
        console.error('Search error:', err);
        resultsList.innerHTML = `<div class="status-msg" style="color: red;">Error: ${err.message}</div>`;
    }
}

// Render results to the list
function renderResults(experiments) {
    if (!experiments || experiments.length === 0) {
        resultsList.innerHTML = '<div class="status-msg">No experiments found.</div>';
        return;
    }

    resultsList.innerHTML = '';
    experiments.forEach(exp => {
        const li = document.createElement('li');
        li.className = 'result-item';
        li.innerHTML = `
            <div class="result-title">${exp.title}</div>
            <div class="result-keywords">Keywords: ${exp.keywords}</div>
        `;
        li.onclick = () => openPreview(exp);
        resultsList.appendChild(li);
    });
}

// Open preview in iframe
function openPreview(experiment) {
    modalTitle.textContent = experiment.title;
    modalIframe.srcdoc = experiment.html_content;
    previewModal.style.display = 'flex';
}

// Close modal
function closeModal() {
    previewModal.style.display = 'none';
    modalIframe.srcdoc = '';
}

// Event Listeners
console.log('Experiment Explorer initialized');
searchBtn.onclick = performSearch;
searchInput.onkeypress = (e) => {
    if (e.key === 'Enter') performSearch();
};
closeBtn.onclick = closeModal;
previewModal.onclick = (e) => {
    if (e.target === previewModal) closeModal();
};
