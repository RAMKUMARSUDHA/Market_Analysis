window.onload = function () {
    // Show loading overlay at startup
    document.getElementById('loadingOverlay').style.display = 'flex';
    // Initial fetch for default location ("Gobichettipalayam")
    fetchWeather();

    // Handle search button click
    document.getElementById('searchLocation').onclick = function () {
        const loc = document.getElementById('locationSearch').value.trim();
        if (loc !== '') fetchWeather(loc);
    };

    // Handle "Use My Location" button click
    document.getElementById('useCurrentLocation').onclick = function () {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                fetchWeather(null, position.coords.latitude, position.coords.longitude);
            }, function () {
                alert('Unable to retrieve your location.');
            });
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    };
};

function fetchWeather(location = 'Gobichettipalayam', lat = null, lon = null) {
    document.getElementById('loadingOverlay').style.display = 'flex';
    let url = '/api/weather';
    let params = [];

    if (lat && lon) {
        params.push('lat=' + encodeURIComponent(lat));
        params.push('lon=' + encodeURIComponent(lon));
    } else if (location) {
        params.push('location=' + encodeURIComponent(location));
    }
    if (params.length > 0) url += '?' + params.join('&');

    fetch(url)
        .then(resp => resp.json())
        .then(result => {
            if (result.success) showWeather(result.data);
            else alert('Failed to fetch weather: ' + (result.error || 'Unknown error'));
            document.getElementById('loadingOverlay').style.display = 'none';
        })
        .catch(err => {
            alert('Weather fetch failed: ' + err);
            document.getElementById('loadingOverlay').style.display = 'none';
        });
}

function showWeather(data) {
    // Location and basic info
    document.getElementById('currentLocation').textContent = data.location || 'N/A';
    document.getElementById('currentTemp').textContent = data.temperature !== undefined ? data.temperature + '°C' : 'N/A';
    document.getElementById('feelsLike').textContent = data.feels_like !== undefined ? data.feels_like + '°C' : 'N/A';
    document.getElementById('weatherDesc').textContent = data.description || 'N/A';
    setWeatherIcon(data.icon || '', data.description || '');

    document.getElementById('humidity').textContent = (data.humidity !== undefined ? data.humidity + '%' : 'N/A');
    document.getElementById('windSpeed').textContent = (data.wind_speed !== undefined ? data.wind_speed + ' km/h' : 'N/A');
    document.getElementById('pressure').textContent = (data.pressure !== undefined ? data.pressure + ' hPa' : 'N/A');
    document.getElementById('visibility').textContent = (data.visibility !== undefined ? data.visibility + ' km' : 'N/A');
    document.getElementById('sunrise').textContent = data.sunrise || 'N/A';
    document.getElementById('sunset').textContent = data.sunset || 'N/A';
    document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();

    // Hourly Forecast
    let hourlyHtml = '';
    if (data.hourly && Array.isArray(data.hourly) && data.hourly.length > 0) {
        hourlyHtml = data.hourly.map(h => `
            <div class="forecast-item">
                <div class="forecast-day">${h.time}</div>
                <div class="forecast-icon"><i class="fas fa-cloud"></i></div>
                <div class="forecast-temps">
                    <span class="forecast-high">${h.temp}°C</span>
                </div>
                <div class="forecast-desc">${h.description}</div>
            </div>
        `).join('');
    } else {
        hourlyHtml = '<div>No hourly forecast available.</div>';
    }

    // 7-Day Forecast
    let dailyHtml = '';
    if (data.forecast && Array.isArray(data.forecast) && data.forecast.length > 0) {
        dailyHtml = data.forecast.map(d => `
            <div class="forecast-item">
                <div class="forecast-day">${d.date}</div>
                <div class="forecast-icon"><i class="fas fa-cloud"></i></div>
                <div class="forecast-temps">
                    <span class="forecast-high">${d.temp_max}°C</span>
                    <span class="forecast-low">${d.temp_min}°C</span>
                </div>
                <div class="forecast-desc">${d.description}</div>
            </div>
        `).join('');
    } else {
        dailyHtml = '<div>No 7-day forecast data available.</div>';
    }

    // Set both hourly and daily forecast into grid (forecast-list)
    document.getElementById('forecastList').innerHTML =
        '<h4 style="grid-column:1/-1;color:#219653;">Hourly Forecast</h4>' +
        hourlyHtml +
        '<h4 style="grid-column:1/-1;margin-top:10px;color:#219653;">7-Day Forecast</h4>' +
        dailyHtml;
}


function setWeatherIcon(iconCode, desc) {
    const iconEl = document.getElementById('weatherIcon');
    if (desc.toLowerCase().includes('rain')) iconEl.className = 'fas fa-cloud-showers-heavy';
    else if (desc.toLowerCase().includes('cloud')) iconEl.className = 'fas fa-cloud';
    else if (desc.toLowerCase().includes('clear')) iconEl.className = 'fas fa-sun';
    else if (desc.toLowerCase().includes('thunder')) iconEl.className = 'fas fa-bolt';
    else iconEl.className = 'fas fa-cloud'; // default icon
}
