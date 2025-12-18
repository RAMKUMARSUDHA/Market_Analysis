// Main JavaScript functionality
class AgriMarketsApp {
  constructor() {
    this.apiBaseUrl = "http://localhost:5000/api"
    this.currentUser = null
    this.init()
  }

  init() {
    this.loadUser()
    this.setupEventListeners()
    this.updateUI()
  }

  // User Management
  loadUser() {
    const userData = localStorage.getItem("agri_user")
    if (userData) {
      this.currentUser = JSON.parse(userData)
    }
  }

  saveUser(userData) {
    this.currentUser = userData
    localStorage.setItem("agri_user", JSON.stringify(userData))
  }

  logout() {
    this.currentUser = null
    localStorage.removeItem("agri_user")
    localStorage.removeItem("profilePicURL") // Firebase URL-ஐ localStorage-இல் இருந்து நீக்கும்
    this.showToast("Logged out successfully", "success")
    setTimeout(() => {
      window.location.href = "login.html"
    }, 1000)
  }

  // Event Listeners
  setupEventListeners() {
    // Menu toggle for mobile
    const menuToggle = document.getElementById("menuToggle")
    if (menuToggle) {
      menuToggle.addEventListener("click", this.toggleSidebar)
    }

    // Profile dropdown toggle
    const profileToggle = document.getElementById("profileToggle")
    if (profileToggle) {
      profileToggle.addEventListener("click", (event) => this.toggleProfileMenu(event))
    }

    // Logout button inside the dropdown
    const logoutBtn = document.getElementById("logoutBtn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout())
    }

    // Language selector
    const languageSelect = document.getElementById("languageSelect")
    if (languageSelect) {
      languageSelect.addEventListener("change", this.changeLanguage)
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", (event) => this.closeProfileMenu(event))
  }

  toggleSidebar() {
    const sidebar = document.querySelector(".sidebar")
    sidebar.classList.toggle("open")
  }

  toggleProfileMenu(event) {
    const dropdownMenu = document.getElementById("dropdownMenu")
    if (dropdownMenu) {
      event.stopPropagation()
      dropdownMenu.classList.toggle("show")
    }
  }

  closeProfileMenu(event) {
    const profileDropdown = document.getElementById("profileDropdown")
    const dropdownMenu = document.getElementById("dropdownMenu")
    if (dropdownMenu && dropdownMenu.classList.contains("show") && !profileDropdown.contains(event.target)) {
      dropdownMenu.classList.remove("show")
    }
  }

  changeLanguage(event) {
    const language = event.target.value
    console.log("Language changed to:", language)
  }

  // UI Updates
  updateUI() {
    const profileDropdown = document.getElementById("profileDropdown")
    const loginPrompt = document.getElementById("loginPrompt")
    const userNameDisplay = document.getElementById("userNameDisplay")
    const profileImage = document.getElementById("profileImage")

    if (this.currentUser) {
      if (profileDropdown) profileDropdown.style.display = "flex"
      if (loginPrompt) loginPrompt.style.display = "none"
      if (userNameDisplay) userNameDisplay.textContent = `Welcome back, ${this.currentUser.fullName}!`
      
      // localStorage இல் உள்ள Firebase URL-ஐப் பெற்று படத்தைக் காண்பிக்கும்
      const savedProfilePicURL = localStorage.getItem("profilePicURL")
      if (savedProfilePicURL && profileImage) {
        profileImage.src = savedProfilePicURL
      } else if (profileImage) {
        profileImage.src = "https://via.placeholder.com/45/219653/ffffff?text=U" // Placeholder
      }
      
    } else {
      if (profileDropdown) profileDropdown.style.display = "none"
      if (loginPrompt) loginPrompt.style.display = "flex"
    }
  }

  // API Calls
  async apiCall(endpoint, options = {}) {
    const url = `${this.apiBaseUrl}${endpoint}`
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    }

    const finalOptions = { ...defaultOptions, ...options }

    try {
      this.showLoading(true)
      const response = await fetch(url, finalOptions)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "API request failed")
      }

      return data
    } catch (error) {
      console.error("API Error:", error)
      this.showToast(error.message, "error")
      throw error
    } finally {
      this.showLoading(false)
    }
  }

  // Loading State
  showLoading(show) {
    const overlay = document.getElementById("loadingOverlay")
    if (overlay) {
      overlay.classList.toggle("show", show)
    }
  }

  // Toast Notifications
  showToast(message, type = "info", duration = 5000) {
    const container = document.getElementById("toastContainer")
    if (!container) return

    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.innerHTML = `
            <div class="toast-content">
                <i class="fas ${this.getToastIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `

    container.appendChild(toast)

    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove()
      }
    }, duration)
  }

  getToastIcon(type) {
    const icons = {
      success: "fa-check-circle",
      error: "fa-exclamation-circle",
      warning: "fa-exclamation-triangle",
      info: "fa-info-circle",
    }
    return icons[type] || icons.info
  }

  // Utility Functions
  formatCurrency(amount) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  formatDate(date) {
    return new Intl.DateTimeFormat("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(date))
  }

  formatNumber(number) {
    return new Intl.NumberFormat("en-IN").format(number)
  }
}



// Close mobile sidebar when clicking outside
document.addEventListener("click", (event) => {
  const sidebar = document.querySelector(".sidebar")
  const menuToggle = document.getElementById("menuToggle")

  if (sidebar && sidebar.classList.contains("open")) {
    if (!sidebar.contains(event.target) && !menuToggle.contains(event.target)) {
      sidebar.classList.remove("open")
    }
  }
})

// Handle responsive navigation
window.addEventListener("resize", () => {
  const sidebar = document.querySelector(".sidebar")
  if (window.innerWidth > 768 && sidebar) {
    sidebar.classList.remove("open")
  }
})
class AgriMarketsApp {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  init() {
    this.loadUser();
    this.setupEventListeners();
    this.updateUI();
  }

  loadUser() {
    const userData = localStorage.getItem("agri_user");
    if (userData) {
      this.currentUser = JSON.parse(userData);
    } else {
      // சோதனைக்கு, பயனர் உள்நுழையவில்லை என்றால், ஒரு மாதிரி பயனரை உருவாக்கவும்
      this.currentUser = { fullName: "Karthik" };
    }
  }

  logout() {
    this.currentUser = null;
    localStorage.removeItem("agri_user");
    window.location.href = "login.html"; // உள்நுழைவு பக்கத்திற்கு அனுப்பவும்
  }

  setupEventListeners() {
    const profileToggle = document.getElementById("profileToggle");
    if (profileToggle) {
      profileToggle.addEventListener("click", (event) => this.toggleProfileMenu(event));
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }

    document.addEventListener("click", (event) => this.closeProfileMenu(event));
  }

  toggleProfileMenu(event) {
    const dropdownMenu = document.getElementById("dropdownMenu");
    if (dropdownMenu) {
      event.stopPropagation();
      dropdownMenu.classList.toggle("show");
    }
  }

  closeProfileMenu(event) {
    const profileDropdown = document.getElementById("profileDropdown");
    const dropdownMenu = document.getElementById("dropdownMenu");
    if (dropdownMenu && dropdownMenu.classList.contains("show") && !profileDropdown.contains(event.target)) {
      dropdownMenu.classList.remove("show");
    }
  }

  updateUI() {
    const profileDropdown = document.getElementById("profileDropdown");
    const loginPrompt = document.getElementById("loginPrompt");
    const userNameDisplay = document.getElementById("userNameDisplay");
    const profileImage = document.getElementById("profileImage");

    if (this.currentUser) {
      profileDropdown.style.display = "flex";
      loginPrompt.style.display = "none";
      userNameDisplay.textContent = `Welcome, ${this.currentUser.fullName}!`;
      
      if (profileImage && this.currentUser.fullName) {
        const initial = this.currentUser.fullName.charAt(0).toUpperCase();
        profileImage.textContent = initial;
      }
      
    } else {
      profileDropdown.style.display = "none";
      loginPrompt.style.display = "flex";
    }
  }
}

const app = new AgriMarketsApp();
window.AgriApp = app;