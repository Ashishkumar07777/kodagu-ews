/* ============================================================
   KodaguEWS - Dashboard JavaScript
   Live clock, user menu, and dynamic updates
   ============================================================ */

const API_BASE_URL = 'https://kodagu-ews-backend-v894.onrender.com';

import { auth } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ---- Firebase Auth Protection ----
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Kick them out if not logged in
        window.location.href = 'index.html';
    } else {
        // Logged in securely
        localStorage.setItem('userDisplayName', user.displayName || 'Citizen');
        updateUserProfile();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    fetchLiveAlerts();
    fetchHistoricalEvents();
    updateUserProfile();
    fetchWeather();
});

async function fetchWeather() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/weather`);
        if (!response.ok) throw new Error('Weather API failed');
        const data = await response.json();

        // Update temperature
        const tempVal = document.querySelector('.temp-value');
        const condLabel = document.querySelector('.condition-label');
        const rainVal = document.querySelector('.weather-detail-item:nth-child(1) .detail-value');
        const windVal = document.querySelector('.weather-detail-item:nth-child(2) .detail-value');

        if (tempVal) tempVal.innerText = data.temperature;
        if (condLabel) condLabel.innerText = data.condition;
        if (rainVal) rainVal.innerHTML = `${data.precipitation} <small>mm/hr</small>`;
        if (windVal) windVal.innerHTML = `${data.windSpeed} <small>km/h</small>`;

        // Update weather icon based on real condition
        const iconLarge = document.querySelector('.weather-icon-large');
        if (iconLarge && data.icon) {
            iconLarge.style.background = data.icon.bg;
            iconLarge.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${data.icon.stroke}" stroke-width="2">${data.icon.svg}</svg>`;
        }

    } catch (error) {
        console.error("Weather fetch failed, using defaults:", error);
    }
}

function updateUserProfile() {
    const userName = localStorage.getItem('userDisplayName');
    if (userName) {
        const nameElements = document.querySelectorAll('.user-name');
        nameElements.forEach(el => {
            if (el.innerText.includes('👮')) {
                el.innerHTML = `👮 ${userName}`;
            } else {
                el.innerHTML = `👤 ${userName}`;
            }
        });
    }
}

// ---- Live Clock ----
function updateClock() {
    const now = new Date();
    const format = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const s = String(d.getSeconds()).padStart(2, '0');
        return `${y}-${m}-${day}, ${h}:${min}:${s}`;
    };
    
    const alertTime = document.getElementById('alertTime');
    if (alertTime) alertTime.textContent = format(now);
    
    const nextUpdate = document.getElementById('nextUpdate');
    if (nextUpdate) {
        const next = new Date(now.getTime() + 6 * 60 * 60 * 1000);
        nextUpdate.textContent = format(next);
    }
}

// ---- Fetch Live Alerts & Telemetry ----
async function fetchLiveAlerts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/landslide/alerts`);
        if (!response.ok) throw new Error('Alerts API failed');
        const data = await response.json();

        // Update Alert Banner
        const banner = document.getElementById('alertBanner');
        if (banner) {
            banner.className = `alert-banner alert-banner-${data.alertLevel}`;
            const title = banner.querySelector('.alert-banner-title');
            const desc = banner.querySelector('.alert-banner-desc');
            if (title) title.innerText = `LEVEL ${data.alertLevel.toUpperCase()} ALERT`;
            if (desc) desc.innerText = data.message;
        }

        // Update Telemetry — Accumulated Rainfall
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        const setBar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.min(pct, 100) + '%'; };

        setVal('rain24h', data.rainfall24h);
        setBar('rain24hBar', (data.rainfall24h / 150) * 100);  // 150mm = full bar

        setVal('rain72h', data.rainfall72h);
        setBar('rain72hBar', (data.rainfall72h / 400) * 100);  // 400mm = full bar

        if (data.rainfall7d !== undefined) {
            setVal('rain7d', data.rainfall7d);
            setBar('rain7dBar', (data.rainfall7d / 800) * 100);  // 800mm = full bar
        }

        // Soil Moisture
        setVal('soilMoisture', data.soilMoisture);
        setBar('soilBar', data.soilMoisture);

        // Humidity (from enriched alerts response)
        if (data.humidity !== undefined) {
            setVal('humidity', data.humidity);
            setBar('humidityBar', data.humidity);
        }

        // Data source info
        if (data.source) {
            setVal('dataSource', data.source);
        }
        const fetchedAtEl = document.getElementById('dataFetchedAt');
        if (fetchedAtEl) {
            const now = new Date();
            fetchedAtEl.innerText = `Last update: ${now.toLocaleTimeString()}`;
        }

    } catch (error) {
        console.error("Dashboard alert fetch failed:", error);
    }
}

// ---- Fetch Historical Events ----
async function fetchHistoricalEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/landslide/history`);
        if (!response.ok) throw new Error('History API failed');
        const events = await response.json();

        const tableBody = document.querySelector('#eventsTable tbody');
        if (tableBody) {
            tableBody.innerHTML = events.slice(0, 5).map(event => `
                <tr>
                    <td>${new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</td>
                    <td><strong>${event.area}</strong></td>
                    <td><span class="badge badge-${getSeverityColor(event.severity)}">${event.severity.toUpperCase()}</span></td>
                    <td>${event.casualties}</td>
                    <td>${event.description.substring(0, 60)}...</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error("Dashboard history fetch failed:", error);
    }
}

function getSeverityColor(severity) {
    switch(severity.toLowerCase()) {
        case 'catastrophic': return 'red';
        case 'major': return 'orange';
        case 'moderate': return 'yellow';
        default: return 'green';
    }
}

// ---- User Menu Toggle ----
window.toggleUserMenu = function() {
    if (confirm('Sign out?')) {
        signOut(auth).then(() => {
            window.location.href = 'index.html';
        }).catch((error) => {
            console.error("Sign out error", error);
        });
    }
}
