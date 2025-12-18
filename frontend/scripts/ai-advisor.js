document.addEventListener("DOMContentLoaded", () => {
  // Load states and districts JSON and populate selects
  let statesData = {};
  fetch('data/indian-states-districts.json')
    .then(res => res.json())
    .then(data => {
      statesData = data;
      const stateSelect = document.getElementById('state');
      stateSelect.innerHTML = '<option value="">Select your state</option>';
      Object.keys(statesData).forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        stateSelect.appendChild(option);
      });
    })
    .catch(err => {
      console.error("Error loading states data:", err);
    });

  // Update districts dropdown on state change
  document.getElementById('state').addEventListener('change', function() {
    const districts = statesData[this.value] || [];
    const districtSelect = document.getElementById('district');
    districtSelect.innerHTML = '<option value="">Select your district</option>';
    districts.forEach(d => {
      const option = document.createElement('option');
      option.value = d;
      option.textContent = d;
      districtSelect.appendChild(option);
    });
  });

  const form = document.getElementById("advisorForm");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const resultDiv = document.getElementById("resultContent");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect user input values
    const data = {
      crop: form.crop.value.trim(),
      state: form.state.value,
      district: form.district.value,
      quantity: form.quantity.value,
      quality: form.quality.value,
      transport: form.transport.value
    };

    // Show loading spinner and hide result
    loadingSpinner.style.display = "block";
    resultDiv.style.display = "none";
    resultDiv.innerHTML = "";

    try {
      // Submit data to backend AI recommendations API
      const response = await fetch("/api/ai-recommendations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
          // Add Authorization header if you require it here
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      loadingSpinner.style.display = "none";
      resultDiv.style.display = "block";

      if (result.success) {
        displayRecommendations(result.insight);
      } else {
        throw new Error(result.error || "Failed to get recommendations");
      }
    } catch (error) {
      loadingSpinner.style.display = "none";
      resultDiv.style.display = "block";
      resultDiv.innerHTML = `
        <div class="error-message">
          <p>Error getting recommendations: ${error.message}</p>
          <p>Please try again later.</p>
        </div>`;
    }
  });

  function displayRecommendations(insight) {
    resultDiv.innerHTML = `
      <div class="recommendation-content">
        <h3>🤖 AI Recommendation</h3>
        <div class="insight-text">${insight.replace(/\n/g, "<br>")}</div>
      </div>
    `;
  }

  // Dummy logout function
  window.logout = function() {
    alert("Logout clicked");
    // Implement your logout behavior here
  };
});
