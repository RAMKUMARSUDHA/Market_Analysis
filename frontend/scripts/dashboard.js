// Dashboard specific functionality
class Dashboard {
    constructor() {
        this.apiBaseUrl = "http://localhost:5000/api"
        this.init()
    }

    init() {
        this.loadDashboardData()
        this.setupEventListeners()
        this.startDataRefresh()
        this.loadUserProfileImage() // New: Load image on page load
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById("refreshData")
        if (refreshBtn) {
            refreshBtn.addEventListener("click", () => this.loadDashboardData())
        }

        // New: Event listeners for profile image
        const uploadImageBtn = document.getElementById("uploadImageBtn")
        const imageUploadInput = document.getElementById("imageUpload")

        uploadImageBtn?.addEventListener("click", (e) => {
            e.preventDefault()
            imageUploadInput.click()
        })

        imageUploadInput?.addEventListener("change", (e) => {
            this.handleImageUpload(e.target.files[0])
        })
    }

    // New: Handle the uploaded image
    handleImageUpload(file) {
        if (!file) return

        const reader = new FileReader()
        reader.onload = (e) => {
            const imageDataUrl = e.target.result
            // Save the image data to localStorage
            localStorage.setItem('userProfileImage', imageDataUrl)
            // Display the new image
            this.displayProfileImage(imageDataUrl)
            window.AgriApp.showToast("Profile image updated!", "success")
        }
        reader.readAsDataURL(file)
    }

    // New: Load the image from localStorage
    loadUserProfileImage() {
        const imageDataUrl = localStorage.getItem('userProfileImage')
        if (imageDataUrl) {
            this.displayProfileImage(imageDataUrl)
        }
    }

    // New: Display the image in the header
    displayProfileImage(imageDataUrl) {
        const container = document.getElementById("profileImageContainer")
        if (container) {
            const img = document.createElement("img")
            img.src = imageDataUrl
            img.alt = "User Profile"
            img.classList.add("profile-image")
            container.innerHTML = '' // Clear existing content
            container.appendChild(img)
        }
    }

    async loadDashboardData() {
        try {
            await this.loadMarketData()
            await this.loadWeatherData()
            this.updateLastRefreshTime()
        } catch (error) {
            console.error("Error loading dashboard data:", error)
            window.AgriApp.showToast("Error loading dashboard data", "error")
        }
    }

    async loadMarketData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/market-data-list`)
            const result = await response.json()

            if (result.success) {
                const markets = result.data.markets || []
                const stats = this.calculateMarketStats(markets)
                this.updateElement("totalMarkets", this.formatNumber(stats.totalMarkets))
                this.updateElement("averagePrice", this.formatCurrency(stats.averagePrice))
                this.updateElement("totalVolume", `${this.formatNumber(stats.totalVolume)} T`)
                this.updateElement("topCommodity", stats.topCommodity)
                const priceChangeElement = document.getElementById("priceChange")
                if (priceChangeElement && stats.priceChange) {
                    priceChangeElement.textContent = stats.priceChange
                    priceChangeElement.className = `stat-change ${stats.priceChange.includes("+") ? "positive" : "negative"}`
                }
                if (stats.topCommodity) {
                    this.updateTopCommodities([{ name: stats.topCommodity }])
                }
            }
        } catch (error) {
            console.error("Error loading market data:", error)
        }
    }

    calculateMarketStats(data) {
        if (!data || data.length === 0) {
            return {
                totalMarkets: 0,
                averagePrice: 0,
                totalVolume: 0,
                topCommodity: 'N/A',
                priceChange: 'N/A'
            }
        }

        const totalMarkets = data.length
        const totalVolume = data.reduce((sum, item) => sum + (item.totalVolume || 0), 0)
        const totalPrice = data.reduce((sum, item) => sum + (item.price || 0), 0)
        const averagePrice = totalPrice / totalMarkets

        const commodityVolumes = data.reduce((acc, item) => {
            const commodity = item.commodity || 'N/A'
            acc[commodity] = (acc[commodity] || 0) + (item.totalVolume || 0)
            return acc
        }, {})
        const topCommodity = Object.keys(commodityVolumes).reduce((a, b) => commodityVolumes[a] > commodityVolumes[b] ? a : b, 'N/A')

        return {
            totalMarkets: totalMarkets,
            averagePrice: averagePrice,
            totalVolume: totalVolume,
            topCommodity: topCommodity,
            priceChange: "+12.5% from last week"
        }
    }

    async loadWeatherData() {
        try {
            const user = JSON.parse(localStorage.getItem("agri_user") || "{}")
            const location = user.location || "Bhavani"
            const response = await fetch(`${this.apiBaseUrl}/weather?location=${encodeURIComponent(location)}`)
            const result = await response.json()
            if (result.success) {
                const data = result.data
                this.updateElement("temperature", `${data.temperature}°C`)
                this.updateElement("humidity", `${data.humidity}%`)
                this.updateElement("location", data.location)
                this.updateElement("windInfo", `${data.windSpeed} km/h wind`)
                this.updateElement("temp-display", `${data.temperature}°C`)
            }
        } catch (error) {
            console.error("Error loading weather data:", error)
        }
    }

    updateTopCommodities(commodities) {
        const topCropElement = document.querySelector(".feature-highlight strong")
        if (topCropElement && commodities.length > 0) {
            topCropElement.textContent = `Top Crop: ${commodities[0].name}`
        }
    }

    updateElement(id, value) {
        const element = document.getElementById(id)
        if (element) {
            element.textContent = value
        }
    }

    updateLastRefreshTime() {
        const now = new Date()
        const timeString = now.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
        })
        const lastUpdatedElements = document.querySelectorAll(".last-updated")
        lastUpdatedElements.forEach((element) => {
            element.textContent = `Last updated: ${timeString}`
        })
    }

    startDataRefresh() {
        setInterval(
            () => {
                this.loadDashboardData()
            },
            5 * 60 * 1000,
        )
    }

    formatNumber(number) {
        return new Intl.NumberFormat("en-IN").format(number)
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount)
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const currentUser = localStorage.getItem("agri_user")
    if (
        !currentUser &&
        !window.location.pathname.includes("login.html") &&
        !window.location.pathname.includes("register.html")
    ) {
        window.location.href = "login.html"
        return
    }
    const dashboard = new Dashboard()
    window.Dashboard = dashboard
})

document.addEventListener("DOMContentLoaded", function() {
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            localStorage.removeItem("agri_user");
            localStorage.removeItem("userProfileImage"); // New: Clear image on logout
            window.location.href = "login.html";
        });
    }
});

console.log("Dashboard script loaded.");