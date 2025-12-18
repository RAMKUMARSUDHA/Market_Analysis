// price-trends.js

// Price Trends Page JavaScript
class PriceTrendsManager {
    constructor() {
        this.apiBaseUrl = "http://localhost:5000/api";
        // Hardcode period to 7 days
        this.currentFilters = {
            crop: "",
            state: "",
            district: "",
            period: 7, // Hardcoded to 7 days
        };
        this.priceChart = null;
        this.volumeChart = null;
        this.districtsData = {};

        this.init();
    }

    init() {
        this.loadStatesAndDistricts();
        this.initializeCharts();
        this.setupEventListeners();
        this.loadInitialData();
    }

    async loadStatesAndDistricts() {
        try {
            const response = await fetch("data/indian-states-districts.json");
            this.districtsData = await response.json();
            this.populateStateFilter();
        } catch (error) {
            console.error("Error loading states and districts:", error);
        }
    }

    populateStateFilter() {
        const stateSelect = document.getElementById("stateSelect");
        stateSelect.innerHTML = '<option value="">All States</option>';
        Object.keys(this.districtsData)
            .sort()
            .forEach((state) => {
                const option = document.createElement("option");
                option.value = state.toLowerCase().replace(/\s/g, "-");
                option.textContent = state;
                stateSelect.appendChild(option);
            });
    }

    populateDistrictFilter(state) {
        const districtSelect = document.getElementById("districtSelect");
        districtSelect.innerHTML = '<option value="">All Districts</option>';
        const originalStateName = state.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        if (this.districtsData[originalStateName]) {
            this.districtsData[originalStateName].forEach(district => {
                const option = document.createElement("option");
                option.value = district.toLowerCase().replace(/\s/g, "-");
                option.textContent = district;
                districtSelect.appendChild(option);
            });
        }
    }

    setupEventListeners() {
        document.getElementById("applyFilters").addEventListener("click", () => this.applyFilters());

        document.getElementById("stateSelect").addEventListener("change", (e) => {
            const state = e.target.value;
            this.populateDistrictFilter(state);
        });

        document.querySelectorAll(".chart-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => this.switchChartType(e));
        });

        document.getElementById("refreshBtn")?.addEventListener("click", () => this.loadPriceTrends());
    }

    initializeCharts() {
        const ctxPrice = document.getElementById("priceChart").getContext("2d");
        this.priceChart = new Chart(ctxPrice, {
            type: "line",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Price (₹/Quintal)",
                        data: [],
                        borderColor: "#22c55e",
                        backgroundColor: "rgba(34, 197, 94, 0.1)",
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: "#22c55e",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                        borderColor: "#22c55e",
                        borderWidth: 1,
                    },
                },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: "Date" },
                    },
                    y: {
                        display: true,
                        title: { display: true, text: "Price (₹/Quintal)" },
                        beginAtZero: false,
                        ticks: {
                            callback: (value) => "₹" + value.toLocaleString("en-IN"),
                        },
                    },
                },
                interaction: {
                    mode: "nearest",
                    axis: "x",
                    intersect: false,
                },
            },
        });

        const ctxVolume = document.getElementById("volumeChart").getContext("2d");
        this.volumeChart = new Chart(ctxVolume, {
            type: "bar",
            data: {
                labels: [],
                datasets: [
                    {
                        label: "Volume (Tonnes)",
                        data: [],
                        backgroundColor: "rgba(59, 130, 246, 0.8)",
                        borderColor: "#3b82f6",
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                    tooltip: {
                        backgroundColor: "rgba(0, 0, 0, 0.8)",
                        titleColor: "#ffffff",
                        bodyColor: "#ffffff",
                    },
                },
                scales: {
                    x: {
                        display: true,
                        title: { display: true, text: "Date" },
                    },
                    y: {
                        display: true,
                        title: { display: true, text: "Volume (Tonnes)" },
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => value.toLocaleString("en-IN") + " T",
                        },
                    },
                },
            },
        });
    }

    async applyFilters() {
        const crop = document.getElementById("cropInput").value.trim().toLowerCase();
        const state = document.getElementById("stateSelect").value;
        const district = document.getElementById("districtSelect").value;
        const period = 7; // Hardcoded period

        this.currentFilters = { crop, state, district, period };

        if (!crop) {
            this.showToast("Please enter a crop name to view price trends", "warning");
            return;
        }

        this.showLoading(true);

        try {
            await this.loadPriceTrends();
            this.showToast(`Loaded 7 days of price data for ${crop}`, "success");
        } catch (error) {
            console.error("Error applying filters:", error);
            this.showToast("Error loading price trends. Using sample data.", "error");
            this.generateAndDisplaySampleData();
        } finally {
            this.showLoading(false);
        }
    }

    async loadPriceTrends() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/price-trends`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(this.currentFilters),
            });

            const result = await response.json();

            if (result.success && result.data && result.data.avg_prices.length > 0) {
                const processedData = this.processBackendData(result.data);
                this.updateCharts(processedData);
                this.updateStatistics(processedData);
            } else {
                console.warn("Backend returned no data. Using sample data.");
                this.showToast("No data found for this filter. Displaying sample data.", "warning");
                this.generateAndDisplaySampleData();
            }
        } catch (error) {
            console.error("API Error:", error);
            this.showToast("Failed to load data. Displaying sample data.", "error");
            this.generateAndDisplaySampleData();
        }
    }

    processBackendData(backendData) {
        const dates = backendData.dates;
        const prices = backendData.avg_prices;
        const volumes = dates.map(() => Math.round(Math.random() * 500 + 200));

        const validPrices = prices.filter(p => p !== null);
        
        const statistics = {
            highest_price: validPrices.length ? Math.max(...validPrices) : 0,
            lowest_price: validPrices.length ? Math.min(...validPrices) : 0,
            average_price: validPrices.length ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0,
            total_volume: volumes.reduce((a, b) => a + b, 0),
            price_change: this.calculatePriceChange(validPrices),
            period: this.currentFilters.period,
        };

        return { dates, prices, volumes, statistics };
    }

    generateAndDisplaySampleData() {
        const period = 7;
        const crop = this.currentFilters.crop || "Onion";

        const dates = [];
        const prices = [];
        const volumes = [];

        const basePrices = {
            onion: 2500,
            potato: 2000,
            tomato: 3000,
            wheat: 2200,
            rice: 2800,
            maize: 1800,
            cotton: 5500,
            sugarcane: 350,
        };
        const cropKey = crop.toLowerCase();
        const basePrice = basePrices[cropKey] || 2500;

        for (let i = period; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(
                date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
            );

            const seasonalFactor = 1 + 0.1 * Math.sin((2 * Math.PI * i) / 365);
            const trendFactor = 1 + (period - i) * 0.001;
            const randomFactor = 1 + (Math.random() - 0.5) * 0.15;

            const price = basePrice * seasonalFactor * trendFactor * randomFactor;
            prices.push(Math.round(price * 100) / 100);

            volumes.push(Math.round(Math.random() * 500 + 200));
        }

        const sampleData = {
            dates,
            prices,
            volumes,
            statistics: {
                highest_price: Math.max(...prices),
                lowest_price: Math.min(...prices),
                average_price: prices.reduce((a, b) => a + b, 0) / prices.length,
                total_volume: volumes.reduce((a, b) => a + b, 0),
                price_change: this.calculatePriceChange(prices),
                period,
            },
        };

        this.updateCharts(sampleData);
        this.updateStatistics(sampleData);
        this.showToast("Using sample data due to API error.", "warning");
    }

    calculatePriceChange(prices) {
        if (prices.length < 2) return 0;
        const recentPrices = prices.slice(-7);
        const olderPrices = prices.slice(0, 7);
        
        if (recentPrices.length === 0 || olderPrices.length === 0) return 0;

        const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;

        if (olderAvg === 0) return 0;
        return ((recentAvg - olderAvg) / olderAvg) * 100;
    }

    updateCharts(data) {
        this.priceChart.data.labels = data.dates;
        this.priceChart.data.datasets[0].data = data.prices;
        this.priceChart.data.datasets[0].label = `Price (₹/Quintal) - Last 7 Days`;
        this.priceChart.update("active");

        this.volumeChart.data.labels = data.dates;
        this.volumeChart.data.datasets[0].data = data.volumes;
        this.volumeChart.data.datasets[0].label = `Volume (Tonnes) - Last 7 Days`;
        this.volumeChart.update("active");
    }

    updateStatistics(data) {
        const statistics = data.statistics;
        const prices = data.prices;
        const dates = data.dates;
        
        if (statistics && prices && dates) {
            document.getElementById("highestPrice").textContent = `₹${statistics.highest_price.toLocaleString("en-IN")}/Quintal`;
            document.getElementById("lowestPrice").textContent = `₹${statistics.lowest_price.toLocaleString("en-IN")}/Quintal`;
            document.getElementById("averagePrice").textContent =
                `₹${Math.round(statistics.average_price).toLocaleString("en-IN")}/Quintal`;
            document.getElementById("totalVolume").textContent = `${statistics.total_volume.toLocaleString("en-IN")} T`;
            
            const priceChangeElement = document.getElementById("priceChange");
            const changePercent = statistics.price_change.toFixed(1);
            const changeText = `${changePercent >= 0 ? "+" : ""}${changePercent}% vs previous period`;
            
            priceChangeElement.textContent = changeText;
            priceChangeElement.className = `stat-change ${changePercent >= 0 ? "positive" : "negative"}`;
            
            const periodText = "Last 7 Days";
            document.querySelectorAll(".period-label").forEach((el) => {
                el.textContent = periodText;
            });
            
            if (prices.length > 0) {
                const highestPriceIndex = prices.indexOf(statistics.highest_price);
                if (highestPriceIndex !== -1) {
                    document.getElementById("highestPriceDate").textContent = dates[highestPriceIndex];
                }
                const lowestPriceIndex = prices.indexOf(statistics.lowest_price);
                if (lowestPriceIndex !== -1) {
                    document.getElementById("lowestPriceDate").textContent = dates[lowestPriceIndex];
                }
            } else {
                document.getElementById("highestPriceDate").textContent = "--";
                document.getElementById("lowestPriceDate").textContent = "--";
            }
        } else {
            document.getElementById("highestPrice").textContent = "--";
            document.getElementById("lowestPrice").textContent = "--";
            document.getElementById("averagePrice").textContent = "--";
            document.getElementById("totalVolume").textContent = "--";
            document.getElementById("priceChange").textContent = "--";
            document.getElementById("highestPriceDate").textContent = "--";
            document.getElementById("lowestPriceDate").textContent = "--";
        }
    }

    getPeriodText(period) {
        if (period <= 7) return "This Week";
        if (period <= 30) return "This Month";
        if (period <= 90) return "This Quarter";
        return "This Year";
    }

    switchChartType(event) {
        const chartType = event.target.dataset.chart;

        document.querySelectorAll(".chart-btn").forEach((btn) =>
            btn.classList.remove("active")
        );
        event.target.classList.add("active");

        this.priceChart.config.type = chartType;
        this.priceChart.update();
    }

    loadInitialData() {
        document.getElementById("cropInput").value = "Onion";
        this.currentFilters = { crop: "Onion", state: "", district: "", period: 7 };
        this.generateAndDisplaySampleData();
    }

    showLoading(show) {
        const loadingOverlay = document.getElementById("loadingOverlay");
        if (loadingOverlay) {
            loadingOverlay.style.display = show ? "flex" : "none";
        }
    }

    showToast(message, type = "info") {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
                <i class="fas fa-${type === "success" ? "check-circle" : type === "warning" ? "exclamation-triangle" : type === "error" ? "times-circle" : "info-circle"}"></i>
                <span>${message}</span>
            `;

        const container = document.getElementById("toastContainer");
        if (container) {
            container.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        }
    }
}

// Initialize price trends manager when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
    new PriceTrendsManager();
});