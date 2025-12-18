class AuthManager {
  constructor() {
    this.apiBaseUrl = "http://localhost:5000/api"
    this.init()
  }

  init() {
    this.setupEventListeners()
    this.setupPasswordToggles()
    this.setupFormValidation()
  }

  setupEventListeners() {
    // Login form
    const loginForm = document.getElementById("loginForm")
    if (loginForm) {
      loginForm.addEventListener("submit", (e) => this.handleLogin(e))
    }

    // Register form
    const registerForm = document.getElementById("registerForm")
    if (registerForm) {
      registerForm.addEventListener("submit", (e) => this.handleRegister(e))
    }

    // Google auth login
    const googleLogin = document.getElementById("googleLogin")
    if (googleLogin) {
      googleLogin.addEventListener("click", () => this.handleGoogleAuth("login"))
    }

    // Google auth register
    const googleRegister = document.getElementById("googleRegister")
    if (googleRegister) {
      googleRegister.addEventListener("click", () => this.handleGoogleAuth("register"))
    }
  }

  setupPasswordToggles() {
    const toggles = document.querySelectorAll(".password-toggle")
    toggles.forEach(toggle => {
      toggle.addEventListener("click", e => {
        const input = e.target.closest(".input-group").querySelector("input")
        const icon = e.target.closest(".password-toggle").querySelector("i")
        if (input.type === "password") {
          input.type = "text"
          icon.classList.remove("fa-eye")
          icon.classList.add("fa-eye-slash")
        } else {
          input.type = "password"
          icon.classList.remove("fa-eye-slash")
          icon.classList.add("fa-eye")
        }
      })
    })
  }

  setupFormValidation() {
    // Register form field validation
    const registerForm = document.getElementById("registerForm")
    if (registerForm) {
      const inputs = registerForm.querySelectorAll("input, select")
      inputs.forEach(input => {
        input.addEventListener("blur", () => this.validateField(input))
        input.addEventListener("input", () => this.clearFieldError(input))
      })

      const password = document.getElementById("password")
      const confirmPassword = document.getElementById("confirmPassword")
      if (password && confirmPassword) {
        confirmPassword.addEventListener("input", () => this.validatePasswordMatch(password.value, confirmPassword.value))
      }
    }
  }

  async handleLogin(event) {
    event.preventDefault()
    const form = event.target
    const formData = new FormData(form)
    const loginData = {
      email: formData.get("email"),
      password: formData.get("password"),
    }

    if (!this.validateEmail(loginData.email)) {
      this.showToast("Please enter a valid email address", "error")
      return
    }
    if (!loginData.password) {
      this.showToast("Please enter your password", "error")
      return
    }

    const button = document.getElementById("loginButton")
    this.setButtonLoading(button, true)

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(loginData),
      })
      const result = await response.json()
      if (result.success) {
        localStorage.setItem("agri_user", JSON.stringify(result.user))
        this.showToast("Login successful! Redirecting...", "success")
        setTimeout(() => window.location.href = "index.html", 1500)
      } else {
        this.showToast(result.error || "Login failed", "error")
      }
    } catch (error) {
      console.error("Login error:", error)
      this.showToast("Network error. Please try again.", "error")
    } finally {
      this.setButtonLoading(button, false)
    }
  }

  async handleRegister(event) {
    event.preventDefault()
    const form = event.target
    const formData = new FormData(form)
    const registerData = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
      location: formData.get("location"),
      farmSize: formData.get("farmSize"),
    }

    if (!this.validateRegisterForm(registerData)) return;

    const button = document.getElementById("registerButton")
    this.setButtonLoading(button, true)

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(registerData),
      })
      const result = await response.json()
      if (result.success) {
        localStorage.setItem("agri_user", JSON.stringify(result.user))
        this.showToast("Account created successfully! Redirecting...", "success")
        setTimeout(() => window.location.href = "index.html", 1500)
      } else {
        this.showToast(result.error || "Registration failed", "error")
      }
    } catch (error) {
      console.error("Registration error:", error)
      this.showToast("Network error. Please try again.", "error")
    } finally {
      this.setButtonLoading(button, false)
    }
  }

  handleGoogleAuth(type) {
    this.showToast("Google authentication is not yet configured. Please use email/password.", "warning")
  }

  validateRegisterForm(data) {
    let isValid = true
    if (!data.fullName || data.fullName.trim().length < 2) {
      this.showFieldError("fullName", "Full name must be at least 2 characters")
      isValid = false
    }
    if (!this.validateEmail(data.email)) {
      this.showFieldError("email", "Please enter a valid email address")
      isValid = false
    }
    if (!this.validatePassword(data.password)) {
      this.showFieldError("password", "Password must be at least 8 characters with uppercase, lowercase, and number")
      isValid = false
    }
    if (data.password !== data.confirmPassword) {
      this.showFieldError("confirmPassword", "Passwords do not match")
      isValid = false
    }
    if (!data.location || data.location.trim().length < 3) {
      this.showFieldError("location", "Please enter your location")
      isValid = false
    }
    if (!data.farmSize) {
      this.showFieldError("farmSize", "Please select your farm size")
      isValid = false
    }
    const agreeTerms = document.getElementById("agreeTerms")
    if (!agreeTerms || !agreeTerms.checked) {
      this.showToast("Please agree to the Terms of Service and Privacy Policy", "error")
      isValid = false
    }
    return isValid
  }

  validateField(input) {
    const value = input.value.trim()
    const field = input.name
    let isValid = true
    switch (field) {
      case "fullName":
        if (value.length < 2) {
          this.showFieldError(field, "Full name must be at least 2 characters")
          isValid = false
        }
        break;
      case "email":
        if (!this.validateEmail(value)) {
          this.showFieldError(field, "Please enter a valid email address")
          isValid = false
        }
        break;
      case "password":
        if (!this.validatePassword(value)) {
          this.showFieldError(field, "Password must be at least 8 characters with uppercase, lowercase, and number")
          isValid = false
        }
        break;
      case "location":
        if (value.length < 3) {
          this.showFieldError(field, "Please enter your location")
          isValid = false
        }
        break;
      case "farmSize":
        if (!value) {
          this.showFieldError(field, "Please select your farm size")
          isValid = false
        }
        break;
    }
    if (isValid) this.clearFieldError(document.getElementById(input.id))
    return isValid
  }

  validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&]{8,}$/
    return regex.test(password)
  }

  validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  validatePasswordMatch(pwd, confirmPwd) {
    const confirmInput = document.getElementById("confirmPassword")
    if (pwd !== confirmPwd && confirmPwd) {
      this.showFieldError("confirmPassword", "Passwords do not match")
      return false
    } else {
      this.clearFieldError(confirmInput)
      return true
    }
  }

  showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId)
    const errorElem = document.getElementById(fieldId + "Error")
    if (field) field.classList.add("error")
    if (errorElem) errorElem.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`
  }

  clearFieldError(field) {
    if (!field) return
    field.classList.remove("error")
    const errorElem = document.getElementById(field.id + "Error")
    if (errorElem) errorElem.innerHTML = ""
  }

  setButtonLoading(button, loading) {
    if (!button) return
    const text = button.querySelector(".button-text")
    const spinner = button.querySelector(".button-spinner")
    if (loading) {
      button.disabled = true
      if (text) text.style.opacity = "0.7"
      if (spinner) spinner.classList.remove("hidden")
    } else {
      button.disabled = false
      if (text) text.style.opacity = "1"
      if (spinner) spinner.classList.add("hidden")
    }
  }

  showToast(message, type = "info") {
    if (window.AgriApp && typeof window.AgriApp.showToast === "function") {
      window.AgriApp.showToast(message, type)
    } else {
      alert(message)
    }
  }
}

const authManager = new AuthManager()

// Auto-redirect if already logged in
document.addEventListener("DOMContentLoaded", () => {
  const user = localStorage.getItem("agri_user")
  if (user && (window.location.pathname.includes("login.html") || window.location.pathname.includes("register.html"))) {
    window.location.href = "index.html"
  }
})
