// Global variables for managing state
let allMarketsData = [];
let currentPage = 1;
const recordsPerPage = 10;

// Class to manage all logic for the market data page
class MarketDataManager {
    constructor() {
        this.districtsData = {};
        this.init();
    }

    // Initialize the page: load filters and set up event listeners
    init() {
        this.cacheDOMElements();
        this.setupEventListeners();
        this.loadStatesAndDistricts().then(() => {
            this.applyFilters(); // Fetch initial data after filters are ready
        });
    }

    // Store references to frequently used DOM elements
    cacheDOMElements() {
        this.dom = {
            stateFilter: document.getElementById("stateFilter"),
            districtFilter: document.getElementById("districtFilter"),
            commodityInput: document.getElementById("commodityInput"),
            searchMarket: document.getElementById("searchMarket"),
            submitBtn: document.getElementById("submitFilters"),
            clearBtn: document.getElementById("clearFilters"),
            // CHANGE 1: Use the correct ID from your HTML
            exportBtn: document.getElementById("exportData"),
            tableBody: document.getElementById("marketTableBody"),
            pageInfo: document.getElementById("pageInfo"),
            prevPageBtn: document.getElementById("prevPage"),
            nextPageBtn: document.getElementById("nextPage"),
            loadingOverlay: document.getElementById("loadingOverlay"),
            summary: {
                activeMarkets: document.getElementById("activeMarkets"),
                avgPrice: document.getElementById("avgPrice"),
                totalVolume: document.getElementById("totalVolume"),
                topCommodity: document.getElementById("topCommodity")
            }
        };
    }

    // Set up all event listeners for the page
    setupEventListeners() {
        this.dom.submitBtn?.addEventListener("click", () => this.applyFilters());
        this.dom.clearBtn?.addEventListener("click", () => this.clearAllFilters());
        // CHANGE 2: Ensure the listener is attached to the correct element
        this.dom.exportBtn?.addEventListener("click", () => this.exportToCSV());
        this.dom.stateFilter?.addEventListener("change", (e) => this.loadDistrictFilter(e.target.value));
        this.dom.prevPageBtn?.addEventListener("click", () => this.changePage(-1));
        this.dom.nextPageBtn?.addEventListener("click", () => this.changePage(1));
    }

    // Load states and districts from a local JSON file for the dropdowns
    async loadStatesAndDistricts() {
        try {
            const response = await fetch("/data/indian-states-districts.json");
            this.districtsData = await response.json();
            this.populateStateFilter();
        } catch (error) {
            console.error("Error loading states and districts:", error);
        }
    }

    // Populate the state filter dropdown
    populateStateFilter() {
        if (!this.dom.stateFilter) return;
        this.dom.stateFilter.innerHTML = '<option value="">All States</option>';
        Object.keys(this.districtsData).sort().forEach(state => {
            const option = document.createElement("option");
            option.value = state.toLowerCase().replace(/\s+/g, "-");
            option.textContent = state;
            this.dom.stateFilter.appendChild(option);
        });
    }

    // Populate the district filter based on the selected state
    loadDistrictFilter(stateKey) {
        if (!this.dom.districtFilter) return;
        this.dom.districtFilter.innerHTML = '<option value="">All Districts</option>';
        if (!stateKey) return;

        const stateName = Object.keys(this.districtsData).find(
            state => state.toLowerCase().replace(/\s+/g, "-") === stateKey
        );
        if (stateName && this.districtsData[stateName]) {
            this.districtsData[stateName].sort().forEach(district => {
                const option = document.createElement("option");
                option.value = district.toLowerCase().replace(/\s+/g, "-");
                option.textContent = district;
                this.dom.districtFilter.appendChild(option);
            });
        }
    }

    // Fetch data from the backend based on current filters
    async applyFilters() {
        this.showLoading(true);
        const params = new URLSearchParams({
            state: this.dom.stateFilter.value,
            district: this.dom.districtFilter.value,
            crop: this.dom.commodityInput.value,
            market: this.dom.searchMarket.value
        });

        try {
            const response = await fetch(`/api/market-data?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                allMarketsData = result.data.markets || [];
                // Update stats based on the complete filtered dataset
                this.updateSummaryStats(allMarketsData);
                this.showToast("Market data loaded successfully!", "success");
            } else {
                allMarketsData = [];
                this.clearStatistics();
                this.showToast(result.error || "No data found.", "warning");
            }
        } catch (error) {
            console.error("Error fetching market data:", error);
            allMarketsData = [];
            this.clearStatistics();
            this.showToast("Failed to load data. Please try again.", "error");
        } finally {
            this.currentPage = 1;
            this.renderTable();
            this.showLoading(false);
        }
    }

    // Clear all filters and re-fetch the data
    clearAllFilters() {
        this.dom.stateFilter.value = "";
        this.dom.districtFilter.innerHTML = '<option value="">All Districts</option>';
        this.dom.commodityInput.value = "";
        this.dom.searchMarket.value = "";
        this.applyFilters();
    }

    // Update the summary cards with new data
    updateSummaryStats(data) {
        const totalVolume = data.reduce((sum, item) => sum + (item.totalVolume || 0), 0);
        const totalPrice = data.reduce((sum, item) => sum + (item.price || 0), 0);
        const averagePrice = data.length > 0 ? (totalPrice / data.length / 100) : 0;
        const topCommodity = data.length > 0 ? data.reduce((a, b) => (a.totalVolume || 0) > (b.totalVolume || 0) ? a : b).commodity : 'N/A';

        this.dom.summary.activeMarkets.textContent = data.length || 0;
        this.dom.summary.avgPrice.textContent = `₹${averagePrice.toLocaleString('en-IN')}/KG`;
        this.dom.summary.totalVolume.textContent = `${(totalVolume || 0).toLocaleString('en-IN')} T`;
        this.dom.summary.topCommodity.textContent = topCommodity || 'N/A';
    }

    // Reset summary cards to default values
    clearStatistics() {
        this.dom.summary.activeMarkets.textContent = '0';
        this.dom.summary.avgPrice.textContent = `₹0/KG`;
        this.dom.summary.totalVolume.textContent = `0 T`;
        this.dom.summary.topCommodity.textContent = 'N/A';
    }

    // Render the data table for the current page
    renderTable() {
        const startIndex = (this.currentPage - 1) * recordsPerPage;
        const endIndex = startIndex + recordsPerPage;
        const paginatedData = allMarketsData.slice(startIndex, endIndex);

        if (paginatedData.length === 0) {
            this.dom.tableBody.innerHTML = '<tr><td colspan="10" class="text-center">No market data found for the selected filters.</td></tr>';
        } else {
            this.dom.tableBody.innerHTML = paginatedData.map(m => `
                <tr>
                    <td>${m.market || 'N/A'}</td>
                    <td>${m.state || 'N/A'}</td>
                    <td>${m.district || 'N/A'}</td>
                    <td>${m.commodity || 'N/A'}</td>
                    <td>${m.variety || 'N/A'}</td>
                    <td>₹${(m.price/100 || 0).toLocaleString('en-IN')}</td>
                    <td>${new Date(m.date).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
        this.updatePaginationControls();
    }

    // Update the state of the pagination buttons
    updatePaginationControls() {
        const totalPages = Math.ceil(allMarketsData.length / recordsPerPage);
        this.dom.pageInfo.textContent = `Page ${this.currentPage} of ${totalPages || 1}`;
        this.dom.prevPageBtn.disabled = this.currentPage === 1;
        this.dom.nextPageBtn.disabled = this.currentPage === totalPages || totalPages === 0;
    }

    // Change the current page and re-render the table
    changePage(direction) {
        const totalPages = Math.ceil(allMarketsData.length / recordsPerPage);
        const newPage = this.currentPage + direction;

        if (newPage > 0 && newPage <= totalPages) {
            this.currentPage = newPage;
            this.renderTable();
        }
    }

    // Show or hide the main loading overlay
    showLoading(show) {
        if (this.dom.loadingOverlay) {
            this.dom.loadingOverlay.style.display = show ? "flex" : "none";
        }
    }

    // Display a toast message
    showToast(message, type = "info") {
        const container = document.getElementById("toastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;

        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Export current data to a CSV file
    exportToCSV() {
        if (allMarketsData.length === 0) {
            this.showToast("No data available to export.", "warning");
            return;
        }

        const headers = ["Market", "State", "District", "Commodity", "Variety", "Price", "Date"];
        const rows = allMarketsData.map(row => [
            `"${row.market || ''}"`,
            `"${row.state || ''}"`,
            `"${row.district || ''}"`,
            `"${row.commodity || ''}"`,
            `"${row.variety || ''}"`,
            (row.price / 100 || 0),
            `"${new Date(row.date).toLocaleDateString()}"`
        ]);

        let csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "market_data.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showToast("Data exported successfully!", "success");
    }
}

// Initialize the class when the DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    new MarketDataManager();
});