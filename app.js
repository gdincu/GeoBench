let isRecording = false;
let watchId = null;
let dataPoints = [];
let wakeLock = null;

// Performance metrics trackers
let startTime = null;
let firstFixTime = null;
let lastTimestamp = null;

// DOM Elements
const accValue = document.getElementById('accValue');
const accValueLocked = document.getElementById('lockaccValueDisplay');
const latValue = document.getElementById('latValue');
const lngValue = document.getElementById('lngValue');
const altValue = document.getElementById('altValue');
const altAccValue = document.getElementById('altAccValue');
const speedValue = document.getElementById('speedValue');
const driftValue = document.getElementById('driftValue');
const ttffValue = document.getElementById('ttffValue');
const deltaValue = document.getElementById('deltaValue');
const countDisplay = document.getElementById('countDisplay');

const recordBtn = document.getElementById('recordBtn');
const exportBtn = document.getElementById('exportBtn');
const lockScreenBtn = document.getElementById('lockScreenBtn');
const touchLockOverlay = document.getElementById('touchLockOverlay');
const unlockSlider = document.getElementById('unlockSlider');

// Haversine formula for static drift
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
}

// Wake Lock API
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
        } catch (err) {
            console.error('Wake Lock error:', err);
        }
    }
}
function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => wakeLock = null);
    }
}

function startRecording() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser");
        return;
    }

    // Reset Data
    dataPoints = [];
    countDisplay.innerText = "0";
    exportBtn.style.display = 'none';
    
    startTime = performance.now();
    firstFixTime = null;
    lastTimestamp = null;
    
    // Clear UI Metrics
    ttffValue.innerText = "--";
    deltaValue.innerText = "--";
    driftValue.innerText = "--";
    accValue.innerText = "--";
	accValueLocked.innerText = "--";

    requestWakeLock();

    const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    watchId = navigator.geolocation.watchPosition(
        (position) => {
            const now = performance.now();
            const { latitude, longitude, accuracy, altitude, altitudeAccuracy, speed } = position.coords;
            const timestamp = new Date(position.timestamp).toISOString();

            // 1. Calculate TTFF
            let ttff = "";
            if (!firstFixTime) {
                firstFixTime = now;
                ttff = Math.round(firstFixTime - startTime);
                ttffValue.innerText = `${ttff}ms`;
            } else {
                ttff = Math.round(firstFixTime - startTime); 
            }

            // 2. Calculate Update Delta Time
            let deltaTime = "";
            if (lastTimestamp) {
                deltaTime = Math.round(now - lastTimestamp);
                deltaValue.innerText = `${deltaTime}ms`;
            }
            lastTimestamp = now;

            // 3. Calculate Static Drift (distance from the last point)
            let drift = 0;
            if (dataPoints.length > 0) {
                const lastPoint = dataPoints[dataPoints.length - 1];
                drift = calculateDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                driftValue.innerText = `${drift.toFixed(2)}m`;
            }

            // Safely handle values that might be null on some hardware
            const altSafe = typeof altitude === 'number' ? altitude.toFixed(1) : "N/A";
			const altAccSafe = typeof altitudeAccuracy === 'number' ? altitudeAccuracy.toFixed(1) : "N/A";
			const speedSafe = typeof speed === 'number' ? speed.toFixed(2) : "N/A";

            // Update UI
            accValue.innerText = accuracy.toFixed(0);
			accValueLocked.innerText = accuracy.toFixed(0);
            latValue.innerText = latitude.toFixed(6);
            lngValue.innerText = longitude.toFixed(6);
            altValue.innerText = altSafe;
            altAccValue.innerText = altAccSafe;
            speedValue.innerText = speedSafe;
            countDisplay.innerText = dataPoints.length + 1;

            // Log Data
            dataPoints.push({
                timestamp, ttff, deltaTime, latitude, longitude, 
                accuracy, altitude: altSafe, altAccuracy: altAccSafe, 
                speed: speedSafe, driftDistance: drift.toFixed(2)
            });
        },
        (error) => {
            console.warn(`ERROR(${error.code}): ${error.message}`);
            accValue.innerText = "ERR";
			accValueLocked.innerText = "ERR";
        },
        options
    );

    isRecording = true;
    recordBtn.innerText = "Stop Recording";
    recordBtn.classList.add('recording');
}

function stopRecording() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    releaseWakeLock();
    
    isRecording = false;
    recordBtn.innerText = "Start Recording";
    recordBtn.classList.remove('recording');
    
    if (dataPoints.length > 0) {
        exportBtn.style.display = 'block';
    }
}

// Event Listeners
recordBtn.addEventListener('click', () => {
    if (isRecording) stopRecording();
    else startRecording();
});

exportBtn.addEventListener('click', () => {
    if (dataPoints.length === 0) return;

    let csvContent = "Timestamp,TTFF_ms,DeltaTime_ms,Latitude,Longitude,Accuracy_m,Altitude_m,AltAccuracy_m,Speed_ms,DriftDistance_m\n";
    
    dataPoints.forEach(row => {
        csvContent += `${row.timestamp},${row.ttff},${row.deltaTime},${row.latitude},${row.longitude},${row.accuracy},${row.altitude},${row.altAccuracy},${row.speed},${row.driftDistance}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const dateStr = new Date().toISOString().slice(0,19).replace(/:/g, "-");
    link.setAttribute("href", url);
    link.setAttribute("download", `geobench_metrics_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Fake Lock Screen Handlers
lockScreenBtn.addEventListener('click', () => {
    touchLockOverlay.style.display = 'flex';
    unlockSlider.value = 0; // Reset slider position
});

// Continuously check the slider value as the user drags it
unlockSlider.addEventListener('input', (e) => {
    if (e.target.value >= 95) { // If dragged 95% of the way to the right
        touchLockOverlay.style.display = 'none'; // Hide overlay
        e.target.value = 0; // Reset for next time
    }
});

																				  
unlockSlider.addEventListener('change', (e) => {
    if (e.target.value < 95) {
        e.target.value = 0;
    }
});

// Service Worker Registration for PWA caching
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
    .catch(err => console.error("Service Worker registration failed:", err));
}