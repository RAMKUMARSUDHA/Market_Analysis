// Import necessary Firebase SDK functions
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth, updatePassword } from "firebase/auth"; // New: Import Firebase Auth

// Your Firebase project configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "market-price-99660",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // New: Initialize Firebase Auth

// Function to display a toast message (assuming this exists in your main.js)
// If not, you can add a simple version here:
// function showToast(message, type = "info") {
//     const toastContainer = document.getElementById("toastContainer");
//     if (!toastContainer) return;
//     const toast = document.createElement("div");
//     toast.className = `toast toast-${type}`;
//     toast.textContent = message;
//     toastContainer.appendChild(toast);
//     setTimeout(() => toast.remove(), 3000);
// }

document.addEventListener("DOMContentLoaded", () => {
    // Check if user is logged in
    const currentUser = localStorage.getItem("agri_user");
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }
    
    const user = JSON.parse(currentUser);

    // Load and display user data from Firestore on page load
    loadProfileData(user.uid);
    
    // Link the "Upload Image" button to the hidden file input
    const uploadImageBtn = document.getElementById("uploadImageBtn");
    const imageUploadInput = document.getElementById("imageUpload");

    uploadImageBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        imageUploadInput.click();
    });

    imageUploadInput?.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadProfileImage(user.uid, file);
        }
    });

    // New: Handle "Change Password" button click
    const changePasswordBtn = document.getElementById("changePasswordBtn");
    changePasswordBtn?.addEventListener("click", () => {
        const newPassword = prompt("Enter your new password:");
        if (newPassword) {
            updateUserPassword(newPassword);
        }
    });

    // Handle logout button click
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function() {
            localStorage.removeItem("agri_user");
            window.location.href = "login.html";
        });
    }
});

/**
 * Loads user profile data from Firestore and updates the UI.
 * @param {string} uid The user's unique ID.
 */
async function loadProfileData(uid) {
    try {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Display user name and email from Firestore data
            document.getElementById("profileName").textContent = data.name || "User";
            document.getElementById("profileEmail").textContent = data.email || "N/A";
            
            // Display location from Firestore data
            document.getElementById("userLocation").textContent = data.location || "N/A";
            
            // Load and display the profile image
            if (data.profileImageUrl) {
                displayProfileImage(data.profileImageUrl);
            }
        } else {
            console.log("No user data found in Firestore.");
            // Default to localStorage for name and email if Firestore fails
            const user = JSON.parse(localStorage.getItem("agri_user"));
            document.getElementById("profileName").textContent = user.name || "User";
            document.getElementById("profileEmail").textContent = user.email || "N/A";
        }
    } catch (error) {
        console.error("Error loading user data:", error);
    }
}

/**
 * Updates the user's password using Firebase Authentication.
 * @param {string} newPassword The new password.
 */
async function updateUserPassword(newPassword) {
    const user = auth.currentUser;
    if (user) {
        try {
            await updatePassword(user, newPassword);
            window.AgriApp.showToast("Password updated successfully!", "success");
        } catch (error) {
            console.error("Error updating password:", error);
            window.AgriApp.showToast("Error updating password. Please re-login and try again.", "error");
        }
    }
}

/**
 * Uploads an image to Firebase Storage and saves the URL to Firestore.
 * @param {string} uid The user's unique ID.
 * @param {File} file The image file to upload.
 */
async function uploadProfileImage(uid, file) {
    const storageRef = ref(storage, `users/${uid}/profile-picture.jpg`);
    const userDocRef = doc(db, "users", uid);

    try {
        window.AgriApp.showToast("Uploading image...", "info");

        await uploadBytes(storageRef, file);

        const imageUrl = await getDownloadURL(storageRef);

        await setDoc(userDocRef, { profileImageUrl: imageUrl }, { merge: true });
        
        displayProfileImage(imageUrl);
        window.AgriApp.showToast("Profile image updated!", "success");

    } catch (error) {
        console.error("Error uploading image:", error);
        window.AgriApp.showToast("Error uploading image. Please try again.", "error");
    }
}

/**
 * Displays the image in the UI.
 * @param {string} imageUrl The URL of the image to display.
 */
function displayProfileImage(imageUrl) {
    const headerImageContainer = document.getElementById("profileImageContainer");
    const profilePageImageContainer = document.getElementById("profilePageImage");
    
    const imgElement = `<img src="${imageUrl}" alt="User Profile">`;
    
    if (headerImageContainer) {
        headerImageContainer.innerHTML = imgElement;
    }
    if (profilePageImageContainer) {
        profilePageImageContainer.innerHTML = imgElement;
    }
}