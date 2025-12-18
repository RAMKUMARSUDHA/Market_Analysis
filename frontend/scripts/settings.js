document.addEventListener('DOMContentLoaded', () => {
    // Check if the form and input elements exist
    const settingsForm = document.getElementById('settingsForm');
    const profilePicInput = document.getElementById('profilePic');
    const saveButton = settingsForm ? settingsForm.querySelector('button[type="submit"]') : null;

    if (settingsForm && profilePicInput && saveButton) {
        settingsForm.addEventListener('submit', (event) => {
            event.preventDefault(); // படிவம் சமர்ப்பிப்பதைத் தடுக்கும்

            // பொத்தானை முடக்கி, உரையை மாற்றவும்
            const originalButtonText = saveButton.textContent;
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            const file = profilePicInput.files[0];

            if (file) {
                // Firebase Storage இல் ஒரு கோப்பு பாதையை உருவாக்கவும்
                const storageRef = firebase.storage().ref('profile-pictures/' + new Date().getTime() + '-' + file.name);

                // கோப்பை பதிவேற்றவும்
                const uploadTask = storageRef.put(file);

                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log('Upload is ' + progress + '% done');
                    }, 
                    (error) => {
                        console.error("Upload failed:", error);
                        // showToast செயல்பாட்டைப் பயன்படுத்தி பிழை அறிவிப்பு
                        if (window.AgriApp) {
                            window.AgriApp.showToast("Image upload failed. Please try again.", "error");
                        } else {
                            alert("Image upload failed. Please try again.");
                        }
                        
                        // பொத்தானை மீண்டும் இயக்கவும்
                        saveButton.disabled = false;
                        saveButton.textContent = originalButtonText;
                    }, 
                    () => {
                        // பதிவேற்றம் முடிந்ததும், பதிவிறக்க URL-ஐப் பெறவும்
                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            console.log('File available at', downloadURL);
                            
                            // Firebase URL-ஐ localStorage இல் சேமிக்கவும்
                            localStorage.setItem('profilePicURL', downloadURL);
                            
                            // showToast செயல்பாட்டைப் பயன்படுத்தி வெற்றி அறிவிப்பு
                            if (window.AgriApp) {
                                window.AgriApp.showToast("Settings and profile picture saved successfully!", "success");
                            } else {
                                alert('Settings and profile picture saved successfully!');
                            }

                            // பொத்தானை மீண்டும் இயக்கவும்
                            saveButton.disabled = false;
                            saveButton.textContent = originalButtonText;
                        });
                    }
                );
            } else {
                // புதிய படம் பதிவேற்றப்படவில்லை என்றால்
                if (window.AgriApp) {
                    window.AgriApp.showToast("Settings saved successfully!", "success");
                } else {
                    alert('Settings saved successfully!');
                }

                // பொத்தானை மீண்டும் இயக்கவும்
                saveButton.disabled = false;
                saveButton.textContent = originalButtonText;
            }
            
            // படிவத்தில் உள்ள மற்ற தரவைச் சேகரித்து, தேவைப்பட்டால் ஒரு API க்கு அனுப்பலாம்
            const formData = new FormData(settingsForm);
            const data = Object.fromEntries(formData.entries());
            console.log('Other form data:', data);
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const settingsForm = document.getElementById('settingsForm');
    const saveButton = settingsForm ? settingsForm.querySelector('button[type="submit"]') : null;

    if (settingsForm && saveButton) {
        settingsForm.addEventListener('submit', (event) => {
            event.preventDefault();
            
            const originalButtonText = saveButton.textContent;
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';

            const fullNameInput = document.getElementById('fullName');
            const newName = fullNameInput.value;

            // புதிய பெயரை localStorage இல் சேமிக்கவும்
            if (newName) {
                const user = { fullName: newName };
                localStorage.setItem('agri_user', JSON.stringify(user));
            }

            // சிறிது நேரம் கழித்து பொத்தானை இயல்பு நிலைக்குக் கொண்டு வரவும்
            setTimeout(() => {
                alert('Settings saved successfully!');
                saveButton.disabled = false;
                saveButton.textContent = originalButtonText;
            }, 1000);
        });
    }
});