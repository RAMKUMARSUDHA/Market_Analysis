// Function to show a specific state (loading, error, or results) and hide the others.
function showState(state, errorMessage = '') {
    const states = {
        loadingState: document.getElementById('loadingState'),
        errorState: document.getElementById('errorState'),
        cropDetailsSection: document.getElementById('cropDetailsSection')
    };

    for (const id in states) {
        if (states[id]) {
            states[id].style.display = (id === state) ? 'block' : 'none';
        }
    }
    
    if (state === 'errorState') {
        const errorP = states.errorState.querySelector('p');
        if (errorP) {
            errorP.textContent = errorMessage || 'An unknown error occurred. Please try again.';
        }
    }
}

// Fetches detailed data for the given crop name from the backend.
async function loadCropDetails(cropName) {
    showState('loadingState');
    try {
        const response = await fetch(`/crop-details?name=${encodeURIComponent(cropName)}`);
        const data = await response.json();

        if (response.ok && data.success) {
            displayCropDetailsAsTabs(data.crop);
        } else {
            throw new Error(data.error || `Server responded with status ${response.status}`);
        }
    } catch (error) {
        console.error("Error loading crop details:", error);
        showState('errorState', error.message);
    }
}

// *** NEW FUNCTION TO DISPLAY RESULTS AS TABS ***
function displayCropDetailsAsTabs(crop) {
    const get = (value) => value || 'N/A';
    const cropDetailsSection = document.getElementById('cropDetailsSection');

    // Create the HTML structure for the tabs and content panels
    cropDetailsSection.innerHTML = `
        <h2 class="results-title">Details for ${get(crop.name)}</h2>
        <div class="tabs-container">
            <div class="tab-nav">
                <button class="tab-link active" data-tab="basicInfo">Basic Info</button>
                <button class="tab-link" data-tab="cultivationInfo">Cultivation</button>
                <button class="tab-link" data-tab="marketInfo">Market</button>
                <button class="tab-link" data-tab="growingConditions">Conditions</button>
                <button class="tab-link" data-tab="pestManagement">Pests & Diseases</button>
                <button class="tab-link" data-tab="harvestingInfo">Harvesting</button>
            </div>

            <div class="tab-content-wrapper">
                <div id="basicInfo" class="tab-content active">
                    <p><strong>Scientific Name:</strong> ${get(crop.scientificName)}</p>
                    <p><strong>Family:</strong> ${get(crop.family)}</p>
                    <p><strong>Type:</strong> ${get(crop.type)}</p>
                    <p><strong>Season:</strong> ${get(crop.season)}</p>
                    <p><strong>Duration:</strong> ${get(crop.duration)}</p>
                </div>
                <div id="cultivationInfo" class="tab-content">
                    <p><strong>Soil:</strong> ${get(crop.soilType)}</p>
                    <p><strong>Seed Rate:</strong> ${get(crop.seedRate)}</p>
                    <p><strong>Spacing:</strong> ${get(crop.spacing)}</p>
                    <p><strong>Irrigation:</strong> ${get(crop.irrigation)}</p>
                    <p><strong>Fertilizer:</strong> ${get(crop.fertilizer)}</p>
                </div>
                 <div id="marketInfo" class="tab-content">
                    <p><strong>Avg. Price:</strong> ${get(crop.avgPrice)}</p>
                    <p><strong>Demand:</strong> ${get(crop.demand)}</p>
                    <p><strong>Major States:</strong> ${get(crop.majorStates)}</p>
                    <p><strong>Export Potential:</strong> ${get(crop.exportPotential)}</p>
                </div>
                <div id="growingConditions" class="tab-content">
                    <p><strong>Temperature:</strong> ${get(crop.temperature)}</p>
                    <p><strong>Rainfall:</strong> ${get(crop.rainfall)}</p>
                    <p><strong>Humidity:</strong> ${get(crop.humidity)}</p>
                    <p><strong>Sunlight:</strong> ${get(crop.sunlight)}</p>
                </div>
                <div id="pestManagement" class="tab-content">
                    <p><strong>Common Pests:</strong> ${get(crop.commonPests)}</p>
                    <p><strong>Diseases:</strong> ${get(crop.diseases)}</p>
                    <p><strong>Management:</strong> ${get(crop.management)}</p>
                </div>
                <div id="harvestingInfo" class="tab-content">
                    <p><strong>Maturity:</strong> ${get(crop.maturitySigns)}</p>
                    <p><strong>Method:</strong> ${get(crop.harvestMethod)}</p>
                    <p><strong>Storage:</strong> ${get(crop.storage)}</p>
                    <p><strong>Shelf Life:</strong> ${get(crop.shelfLife)}</p>
                </div>
            </div>
        </div>
    `;

    // Add the interactive logic for the tabs
    initializeTabs();
    showState('cropDetailsSection');
}

// Helper function to make the tabs work
function initializeTabs() {
    const tabLinks = document.querySelectorAll(".tab-link");
    const tabContents = document.querySelectorAll(".tab-content");

    tabLinks.forEach(link => {
        link.addEventListener("click", () => {
            const tabId = link.getAttribute("data-tab");

            // Remove 'active' from all tabs and content
            tabLinks.forEach(item => item.classList.remove("active"));
            tabContents.forEach(item => item.classList.remove("active"));

            // Add 'active' to the clicked tab and corresponding content
            link.classList.add("active");
            document.getElementById(tabId).classList.add("active");
        });
    });
}

// Fetches the list of seasonal crops to populate the autocomplete datalist.
async function loadAvailableCrops() {
    try {
        const response = await fetch("/crop-insights");
        const data = await response.json();
        if (data.success && data.crops) {
            const datalist = document.getElementById('cropTypes');
            datalist.innerHTML = '';
            data.crops.forEach(cropName => {
                const option = document.createElement('option');
                option.value = cropName;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading available crops for datalist:", error);
    }
}

// Main execution block that runs after the page is loaded.
document.addEventListener("DOMContentLoaded", () => {
    const getInsightsBtn = document.getElementById('getInsightsBtn');
    const cropTypeInput = document.getElementById('cropTypeInput');
    const retryBtn = document.getElementById('retryBtn');

    loadAvailableCrops();

    if (getInsightsBtn && cropTypeInput) {
        getInsightsBtn.addEventListener('click', () => {
            const cropName = cropTypeInput.value.trim();
            if (cropName) {
                loadCropDetails(cropName);
            }
        });
    }

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const cropName = cropTypeInput.value.trim();
            if (cropName) {
                loadCropDetails(cropName);
            } else {
                showState(null);
            }
        });
    }
});