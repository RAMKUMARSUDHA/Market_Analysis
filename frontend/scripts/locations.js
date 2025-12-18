// Global variables to hold loaded data
let allLoadedMarkets = [];
let statesData = {};


// Populate the state dropdown from JSON or API data
async function loadStatesData() {
    try {
        const response = await fetch('data/indian-states-districts.json');
        statesData = await response.json();
        populateStatesDropdown();
    } catch (error) {
        console.error('Error loading states data:', error);
        // Fallback static data
        statesData = {
            'tamil-nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli'],
            'andhra-pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool'],
            'karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
            'maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
            'gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
            'punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda']
        };
        populateStatesDropdown();
    }
}


// Populate state select element
function populateStatesDropdown() {
    const stateSelect = document.getElementById('stateSelect');
    stateSelect.innerHTML = '<option value="">All States</option>';
    Object.keys(statesData).forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        stateSelect.appendChild(option);
    });
}


// Populate districts based on selected state
function loadDistrictsForState(state) {
    const districtSelect = document.getElementById('districtSelect');
    districtSelect.innerHTML = '<option value="">All Districts</option>';
    if (!state) return;
    if (statesData[state]) {
        statesData[state].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    }
}


// Display a toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}


// Load markets from backend API with optional filters
async function loadMarkets(state = '', district = '') {
    const loadingSpinner = document.getElementById('loadingState');
    const marketsGrid = document.getElementById('marketsGrid');
    const marketsSection = document.getElementById('marketsSection');

    loadingSpinner.style.display = 'block';
    marketsSection.style.display = 'none';
    marketsGrid.innerHTML = '';

    try {
        const params = new URLSearchParams();
        if (state) params.append('state', state);
        if (district) params.append('district', district);

        const response = await fetch(`http://localhost:5000/api/locations?${params}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();

        if (data.success) {
            allLoadedMarkets = data.locations || [];
            populateFilterOptions(allLoadedMarkets);
            filterAndRenderMarkets();
            marketsSection.style.display = 'block';
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error loading markets:', error);
        marketsGrid.innerHTML = '<p class="error-message">Error loading markets. Please try again.</p>';
        marketsSection.style.display = 'block';
    } finally {
        loadingSpinner.style.display = 'none';
    }
}

// Filters data and then calls the rendering function
function filterAndRenderMarkets() {
    let filteredMarkets = [...allLoadedMarkets];

    const sortVal = document.getElementById('sortSelect').value || 'market';
    const cropVal = document.getElementById('cropFilter').value || '';
    const typeVal = document.getElementById('marketTypeFilter').value || '';

    // Apply filters
    if (cropVal) {
        filteredMarkets = filteredMarkets.filter(m => (m.crops || []).includes(cropVal));
    }
    if (typeVal) {
        filteredMarkets = filteredMarkets.filter(m => (m.type || '').toLowerCase() === typeVal.toLowerCase());
    }

    // Apply sorting
    if (sortVal === 'market') {
        filteredMarkets.sort((a, b) => a.market.localeCompare(b.market));
    } else if (sortVal === 'district') {
        filteredMarkets.sort((a, b) => a.district.localeCompare(b.district));
    } else if (sortVal === 'state') {
        filteredMarkets.sort((a, b) => a.state.localeCompare(b.state));
    } else if (sortVal === 'type') {
        filteredMarkets.sort((a, b) => (a.type || '').localeCompare(b.type || ''));
    }

    // Call the rendering function with the filtered and sorted data
    renderMarkets(filteredMarkets);
}


// Render markets based on filters and sorting
function renderMarkets(markets) {
    const grid = document.getElementById('marketsGrid');

    grid.innerHTML = markets.map(m => `
        <div class="market-card">
            <div class="market-header">
                <h3>${m.market}</h3>
                <span class="market-location"><i class="fas fa-map-marker-alt"></i> ${m.address || m.district + ', ' + m.state}</span>
            </div>
            <div class="market-stats">
                <div class="stat-item"><span class="stat-label">Type</span><span class="stat-value">${m.type || '--'}</span></div>
                <div class="stat-item"><span class="stat-label">District</span><span class="stat-value">${m.district || '--'}</span></div>
                <div class="stat-item"><span class="stat-label">State</span><span class="stat-value">${m.state || '--'}</span></div>
            </div>
            <div class="market-crops">
                <span class="crops-label">Available Crops:</span>
                <div class="crops-tags">
                    ${(m.crops || []).map(c => `<span class="crop-tag" data-crop="${c}">${c}</span>`).join('')}
                </div>
            </div>
            <div class="market-footer">
                <button class="analysis-btn" data-market-id="${m.market_id}" data-market-name="${m.market}">
                    <i class="fas fa-chart-line"></i> View Live Analysis
                </button>
            </div>
        </div>
    `).join('');

    grid.querySelectorAll('.analysis-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const marketId = this.getAttribute('data-market-id');
            const marketName = this.getAttribute('data-market-name');
            window.location.href = `live-analysis.html?market_id=${marketId}&market_name=${encodeURIComponent(marketName)}`;
        });
    });

    grid.querySelectorAll('.crop-tag').forEach(tag =>
        tag.addEventListener('click', function() {
            const crop = this.getAttribute('data-crop');
            window.location.href = `crop-insights.html?crop=${encodeURIComponent(crop)}`;
        }),
    );

    document.getElementById('marketsCount').textContent = `${markets.length} market(s) found`;
}


// Populate crop and market type filter dropdowns
function populateFilterOptions(markets) {
    const cropSet = new Set();
    markets.forEach(m => (m.crops || []).forEach(c => cropSet.add(c)));

    const cropFilter = document.getElementById('cropFilter');
    cropFilter.innerHTML = '<option value="">All Crops</option>';
    [...cropSet].sort().forEach(crop => {
        const option = document.createElement('option');
        option.value = crop;
        option.textContent = crop;
        cropFilter.appendChild(option);
    });

    const typeSet = new Set(markets.map(m => m.type).filter(Boolean));
    const typeFilter = document.getElementById('marketTypeFilter');
    typeFilter.innerHTML = '<option value="">Any</option>';
    [...typeSet].sort().forEach(type => {
        const option = document.createElement('option');
        option.value = type.toLowerCase();
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        typeFilter.appendChild(option);
    });
}


// Event listener setup
document.addEventListener('DOMContentLoaded', () => {
    loadStatesData();

    // Load districts dynamically on state change
    document.getElementById('stateSelect').addEventListener('change', e => {
        const state = e.target.value;
        loadDistrictsForState(state);
    });

    // Search markets on button click
    document.getElementById('searchMarketsBtn').addEventListener('click', () => {
        const state = document.getElementById('stateSelect').value;
        const district = document.getElementById('districtSelect').value;
        loadMarkets(state, district);
    });

    // Filters changes rerender list
    ['sortSelect', 'cropFilter', 'marketTypeFilter'].forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('change', filterAndRenderMarkets);
        }
    });
});