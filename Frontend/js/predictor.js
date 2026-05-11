/* ============================================================
   KodaguEWS - Risk Predictor JavaScript
   File upload, prediction simulation, result display
   ============================================================ */

// ---- File Upload & Mutual Exclusivity ----

function disableTelemetry() {
    document.querySelectorAll('.param-input').forEach(input => {
        input.disabled = true;
        input.style.opacity = '0.4';
    });
}

function enableTelemetry() {
    document.querySelectorAll('.param-input').forEach(input => {
        input.disabled = false;
        input.style.opacity = '1';
    });
}

function checkInputs() {
    const lat = document.getElementById('paramLat').value;
    const lng = document.getElementById('paramLng').value;
    const elev = document.getElementById('paramElev').value;
    const rain = document.getElementById('paramRain').value;

    const hasTelemetry = (lat && lat != "0.00" && lat != "0") || 
                         (lng && lng != "0.00" && lng != "0") || 
                         (elev && elev != "0") || 
                         (rain && rain != "0");
                         
    const uploadZone = document.getElementById('uploadZone');
    
    if (hasTelemetry) {
        uploadZone.style.opacity = '0.4';
        uploadZone.style.pointerEvents = 'none';
        document.getElementById('fileInput').disabled = true;
    } else {
        uploadZone.style.opacity = '1';
        uploadZone.style.pointerEvents = 'auto';
        document.getElementById('fileInput').disabled = false;
    }
}

function triggerUpload() {
    document.getElementById('fileInput').click();
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('previewImage').src = e.target.result;
        document.getElementById('uploadZone').classList.add('hidden');
        document.getElementById('uploadPreview').classList.remove('hidden');
        disableTelemetry();
    };
    reader.readAsDataURL(file);
}

function removeUpload() {
    document.getElementById('uploadZone').classList.remove('hidden');
    document.getElementById('uploadPreview').classList.add('hidden');
    document.getElementById('fileInput').value = '';
    enableTelemetry();
}

// ---- Drag & Drop ----
document.addEventListener('DOMContentLoaded', () => {
    const zone = document.getElementById('uploadZone');
    if (!zone) return;

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                document.getElementById('previewImage').src = ev.target.result;
                zone.classList.add('hidden');
                document.getElementById('uploadPreview').classList.remove('hidden');
                disableTelemetry();
            };
            reader.readAsDataURL(file);
        }
    });
    updateUserProfile();
});

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

// ---- Execute Prediction ----
const API_BASE_URL = '';

async function executePrediction() {
    const btn = document.getElementById('executeBtn');
    const lat = parseFloat(document.getElementById('paramLat').value);
    const lng = parseFloat(document.getElementById('paramLng').value);
    const elev = parseFloat(document.getElementById('paramElev').value);
    const rain = parseFloat(document.getElementById('paramRain').value);

    btn.innerHTML = '<div class="spinner"></div> Analyzing terrain...';
    btn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/api/landslide/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                latitude: lat,
                longitude: lng,
                elevation: elev,
                rainfall: rain
            })
        });

        if (!response.ok) throw new Error('Prediction API failed');
        const result = await response.json();

        showResults(result);
    } catch (error) {
        console.error("Prediction error:", error);
        alert("Failed to reach ML Prediction server. Ensure the backend is running on port 3000.");
    } finally {
        btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            EXECUTE PREDICTION
        `;
        btn.disabled = false;
    }
}

function showResults(data) {
    const placeholder = document.getElementById('resultPlaceholder');
    const content = document.getElementById('resultContent');
    
    placeholder.classList.add('hidden');
    content.classList.remove('hidden');
    
    const score = data.riskScore * 100;
    const confidence = data.confidence * 100;
    
    document.getElementById('riskScore').textContent = score.toFixed(1) + '/100';
    document.getElementById('riskConfidence').textContent = confidence.toFixed(1) + '%';
    
    // Map first factor to "Soil Type" for demo consistency or show specific telemetry
    if (data.factors && data.factors.length > 0) {
        document.getElementById('soilType').textContent = data.factors[0].split(':')[0] || 'Mixed';
    }

    // Gauge animation
    const gaugeFill = document.getElementById('gaugeFill');
    setTimeout(() => {
        gaugeFill.style.width = score + '%';
    }, 100);
    
    // Badge mapping
    const badge = document.getElementById('resultBadge');
    const level = data.riskLevel.toUpperCase();
    badge.textContent = level;
    
    if (level === 'LOW') badge.className = 'badge badge-green';
    else if (level === 'MODERATE') badge.className = 'badge badge-yellow';
    else if (level === 'HIGH') badge.className = 'badge badge-orange';
    else badge.className = 'badge badge-red';
    
    // Recommendations from API
    const recList = document.getElementById('recList');
    const factors = data.factors || [];
    
    recList.innerHTML = [data.recommendation, ...factors.slice(0, 3)]
        .map(text => `<li>${text}</li>`)
        .join('');
}

// ---- User Menu ----
function toggleUserMenu() {
    if (confirm('Sign out?')) {
        window.location.href = 'index.html';
    }
}
