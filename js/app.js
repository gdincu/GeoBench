let isRecording = false;
let watchId = null;
let dataPoints = [];
let wakeLock = null;

// Performance metrics trackers
let startTime = null;
let firstFixTime = null;
let lastTimestamp = null;

const UNLOCK_THRESHOLD = 95;

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

// Haversine formula for static drift (meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function formatNumber(value, digits) {
    return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : 'N/A';
}

// Wake Lock API (released automatically by the OS on hide/minimize,
// so re-acquire when the page becomes visible again while recording)
async function requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    try {
        wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) {
        console.error('Wake Lock error:', err);
    }
}

async function releaseWakeLock() {
    if (wakeLock === null) return;
    const lock = wakeLock;
    wakeLock = null;
    try {
        await lock.release();
    } catch (err) {
        console.error('Wake Lock release error:', err);
    }
}

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRecording) {
        requestWakeLock();
    }
});

function resetMetricsUI() {
    accValue.innerText = '--';
    accValueLocked.innerText = '-- m';
    latValue.innerText = '--';
    lngValue.innerText = '--';
    altValue.innerText = '--';
    altAccValue.innerText = '--';
    speedValue.innerText = '--';
    ttffValue.innerText = '--';
    deltaValue.innerText = '--';
    driftValue.innerText = '--';
    countDisplay.innerText = '0';
}

function startRecording() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser');
        return;
    }

    // Reset data
    dataPoints = [];
    exportBtn.hidden = true;

    startTime = performance.now();
    firstFixTime = null;
    lastTimestamp = null;

    resetMetricsUI();
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

            // 1. Time To First Fix (ms since recording started)
            if (firstFixTime === null) {
                firstFixTime = now;
                ttffValue.innerText = `${Math.round(firstFixTime - startTime)}ms`;
            }
            const ttff = Math.round(firstFixTime - startTime);

            // 2. Update delta (ms since previous fix)
            let deltaTime = null;
            if (lastTimestamp !== null) {
                deltaTime = Math.round(now - lastTimestamp);
                deltaValue.innerText = `${deltaTime}ms`;
            }
            lastTimestamp = now;

            // 3. Static drift (distance from previous point)
            let drift = 0;
            if (dataPoints.length > 0) {
                const lastPoint = dataPoints[dataPoints.length - 1];
                drift = calculateDistance(lastPoint.latitude, lastPoint.longitude, latitude, longitude);
                driftValue.innerText = `${drift.toFixed(2)}m`;
            }

            // Log raw values; format only for display/export fallbacks
            dataPoints.push({
                timestamp,
                ttff,
                deltaTime: deltaTime ?? '',
                latitude,
                longitude,
                accuracy,
                altitude: altitude ?? '',
                altAccuracy: altitudeAccuracy ?? '',
                speed: speed ?? '',
                driftDistance: drift.toFixed(2)
            });

            // Always update the dashboard (it is cheap), so it is fresh after unlock
            accValue.innerText = formatNumber(accuracy, 0);
            accValueLocked.innerText = `${formatNumber(accuracy, 0)} m`;
            latValue.innerText = formatNumber(latitude, 6);
            lngValue.innerText = formatNumber(longitude, 6);
            altValue.innerText = formatNumber(altitude, 1);
            altAccValue.innerText = formatNumber(altitudeAccuracy, 1);
            speedValue.innerText = formatNumber(speed, 2);
            countDisplay.innerText = String(dataPoints.length);
        },
        (error) => {
            console.warn(`ERROR(${error.code}): ${error.message}`);
            accValue.innerText = 'ERR';
            accValueLocked.innerText = 'ERR';
            // Permission denied will never produce fixes; stop instead of idling
            if (error.code === error.PERMISSION_DENIED) {
                stopRecording();
                alert('Geolocation permission was denied. Recording stopped.');
            }
        },
        options
    );

    isRecording = true;
    recordBtn.innerText = 'Stop Recording';
    recordBtn.classList.add('recording');
}

function stopRecording() {
    if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
    }
    releaseWakeLock();

    isRecording = false;
    recordBtn.innerText = 'Start Recording';
    recordBtn.classList.remove('recording');

    exportBtn.hidden = dataPoints.length === 0;
}

// Event Listeners
recordBtn.addEventListener('click', () => {
    if (isRecording) stopRecording();
    else startRecording();
});

exportBtn.addEventListener('click', () => {
    if (dataPoints.length === 0) return;

    let csvContent = 'Timestamp,TTFF_ms,DeltaTime_ms,Latitude,Longitude,Accuracy_m,Altitude_m,AltAccuracy_m,Speed_ms,DriftDistance_m\n';

    dataPoints.forEach(row => {
        csvContent += `${row.timestamp},${row.ttff},${row.deltaTime},${row.latitude},${row.longitude},${row.accuracy},${row.altitude},${row.altAccuracy},${row.speed},${row.driftDistance}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const dateStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `geobench_metrics_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// Touch-lock overlay handlers
function unlockScreen() {
    touchLockOverlay.style.display = 'none';
    unlockSlider.value = 0;
}

lockScreenBtn.addEventListener('click', () => {
    touchLockOverlay.style.display = 'flex';
    unlockSlider.value = 0; // Reset slider position
});

// Continuously check the slider value as the user drags it
unlockSlider.addEventListener('input', (e) => {
    if (Number(e.target.value) >= UNLOCK_THRESHOLD) {
        unlockScreen();
    }
});

unlockSlider.addEventListener('change', (e) => {
    if (Number(e.target.value) < UNLOCK_THRESHOLD) {
        e.target.value = 0; // Snap back unless fully slid
    }
});

// Service Worker registration for PWA caching (after page load)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch(err => console.error('Service Worker registration failed:', err));
    });
}
