# GeoBench

A lightweight, mobile-first Progressive Web App (PWA) designed to test, benchmark, and compare GNSS (Global Navigation Satellite System) location accuracy across different smartphone models.

## Features

- **Real-Time GNSS Metrics:** Tracks accuracy (meters), latitude, longitude, altitude, altitude accuracy, speed, and update intervals.
- **Advanced Benchmarks:**
  - **TTFF (Time To First Fix):** Measures how quickly the device acquires an initial position lock.
  - **Static Drift (Δ):** Calculates position jitter using the Haversine formula while the device is stationary.
- **Lock Screen:** Bypasses mobile OS throttling by keeping the GPS loop active while covering the screen in pitch-black pixels to prevent accidental touches and save battery.
- **Screen Wake Lock API:** Actively prevents your phone's physical screen from going to sleep during active recording sessions.
- **CSV Data Export:** Exports full performance datasets for post-analysis across different environments and device models.
- **Offline-Ready PWA:** Works seamlessly in remote testing zones via an integrated Service Worker and Web Manifest.

---

## How to Use

1. Tap **Start Recording** to begin logging data points.
2. Monitor real-time accuracy and performance telemetry on the dashboard.
3. Tap **Lock Screen** when testing in the field to hide the UI behind a black overlay.
4. **To Unlock:** Slide the unlock slider all the way to the right (letting go early will snap it back).
5. Tap **Stop Recording** when finished, then click **Export CSV** to download your session log.
