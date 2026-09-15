# GeoBench

A lightweight, mobile-first Progressive Web App (PWA) designed to test, benchmark, and compare GNSS (Global Navigation Satellite System) location accuracy across different smartphone models.

<img width="303.75" height="675" alt="input1" src="https://github.com/user-attachments/assets/f2a28d2b-4a88-4ae4-9cde-2d1b13afbb9f" />
<img width="303.75" height="675" alt="input2" src="https://github.com/user-attachments/assets/42587421-a446-436c-81f4-1d0473bc6fb3" />

## Features

- **Real-Time GNSS Metrics:** Tracks accuracy (meters), latitude, longitude, altitude, altitude accuracy, speed, and update intervals.
- **Advanced Benchmarks:**
  - **TTFF (Time To First Fix):** Measures how quickly the device acquires an initial position lock.
  - **Static Drift (Δ):** Calculates position jitter using the Haversine formula while the device is stationary.
- **Lock Screen:** Covers the UI with near-black pixels to prevent accidental touches and reduce OLED power draw while the GPS loop keeps running (does not turn the screen off by itself).
- **Screen Wake Lock API:** Actively prevents the phone's screen from going to sleep (and GPS from being suspended) during active recording sessions. Re-acquired automatically when the page becomes visible again.
- **CSV Data Export:** Exports full performance datasets for post-analysis across different environments and device models.
- **Offline-Ready PWA:** Works seamlessly in remote testing zones via an integrated Service Worker and Web Manifest.

## How to Use

1. Tap **Start Recording** to begin logging data points.
2. Monitor real-time accuracy and performance telemetry on the dashboard.
3. Tap **Lock Screen** when testing in the field to hide the UI behind a black overlay.
4. **To Unlock:** Slide the unlock slider all the way to the right (letting go early will snap it back).
5. Tap **Stop Recording** when finished, then click **Export CSV** to download your session log. 
