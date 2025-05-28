// Wait for the DOM to be fully loaded before running the script
document.addEventListener('DOMContentLoaded', () => {
    // DOM Element References
    const mapElement = document.getElementById('map');
    const startTimeElement = document.getElementById('start-time');
    const durationElement = document.getElementById('duration');
    const distanceElement = document.getElementById('distance');
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');

    // Application State
    let map = null;
    let polyline = null;
    let watchId = null;
    let startTime = null;
    let timerInterval = null;
    let pausedTime = 0;
    let totalPausedDuration = 0;
    let distance = 0;
    let coordinates = [];
    let isPaused = false;

    // --- MAP INITIALIZATION ---
    /**
     * Initializes the Leaflet map.
     */
    function initMap() {
        // Default view (e.g., a central location) if geolocation is not immediately available
        map = L.map(mapElement).setView([0, 0], 2); // Default to a wide view

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    // --- GEOLOCATION AND TRACKING ---
    /**
     * Handles successful geolocation position updates.
     * @param {GeolocationPosition} position - The position object from the geolocation API.
     */
    function onPositionUpdate(position) {
        const { latitude, longitude, accuracy } = position.coords;
        const newCoord = [latitude, longitude];

        // Update map view to current location
        if (map) {
            map.setView(newCoord, 16); // Zoom level 16
        }

        // Add new coordinate to the list
        coordinates.push(newCoord);

        // Update polyline on the map
        if (polyline) {
            polyline.setLatLngs(coordinates);
        } else {
            polyline = L.polyline(coordinates, { color: 'blue' }).addTo(map);
        }

        // Calculate distance if more than one point is available
        if (coordinates.length > 1) {
            const prevCoord = coordinates[coordinates.length - 2];
            distance += calculateDistance(prevCoord[0], prevCoord[1], newCoord[0], newCoord[1]);
            distanceElement.textContent = distance.toFixed(2);
        }

        // Optional: Add a marker for current position (can be performance intensive)
        // L.marker(newCoord).addTo(map).bindPopup(`Accuracy: ${accuracy.toFixed(0)}m`).openPopup();
    }

    /**
     * Handles errors from the geolocation API.
     * @param {GeolocationPositionError} error - The error object.
     */
    function onPositionError(error) {
        console.error('Geolocation error:', error.message);
        alert(`Error getting location: ${error.message}. Please ensure location services are enabled.`);
    }

    /**
     * Starts watching the user's position.
     */
    function startTracking() {
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                onPositionUpdate,
                onPositionError,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
        }
    }

    /**
     * Stops watching the user's position.
     */
    function stopTracking() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
    }

    // --- DISTANCE CALCULATION ---
    /**
     * Calculates the distance between two GPS coordinates using the Haversine formula.
     * @param {number} lat1 - Latitude of the first point.
     * @param {number} lon1 - Longitude of the first point.
     * @param {number} lat2 - Latitude of the second point.
     * @param {number} lon2 - Longitude of the second point.
     * @returns {number} The distance in kilometers.
     */
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    }

    // --- TIMER AND DURATION ---
    /**
     * Starts or resumes the activity timer.
     */
    function startTimer() {
        if (timerInterval) clearInterval(timerInterval); // Clear existing interval if any

        // If resuming from pause, adjust start time by the duration of the pause
        if (isPaused && pausedTime > 0) {
            totalPausedDuration += Date.now() - pausedTime;
            pausedTime = 0; // Reset pausedTime
        }

        timerInterval = setInterval(() => {
            if (startTime && !isPaused) {
                const now = Date.now();
                const elapsedMilliseconds = now - startTime - totalPausedDuration;
                const seconds = Math.floor((elapsedMilliseconds / 1000) % 60);
                const minutes = Math.floor((elapsedMilliseconds / (1000 * 60)) % 60);
                const hours = Math.floor(elapsedMilliseconds / (1000 * 60 * 60));
                durationElement.textContent =
                    `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }, 1000);
    }

    /**
     * Stops the activity timer.
     */
    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // --- CONTROL BUTTON EVENT HANDLERS ---
    /**
     * Handles the Start button click.
     */
    function handleStart() {
        if (watchId !== null) { // Already started
            alert("Activity already started. Pause or Reset first.");
            return;
        }
        console.log("Start button clicked");
        startTime = Date.now();
        totalPausedDuration = 0; // Reset total paused duration
        pausedTime = 0; // Reset paused time
        isPaused = false;
        startTimeElement.textContent = new Date(startTime).toLocaleTimeString();
        durationElement.textContent = '00:00:00';
        distanceElement.textContent = '0.00';
        coordinates = [];
        distance = 0;

        if (map) { // Clear previous route if any before starting new
            if (polyline) {
                map.removeLayer(polyline);
                polyline = null;
            }
        } else {
            initMap(); // Initialize map if not already initialized
        }

        startTracking();
        startTimer();

        // Update button states
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        pauseBtn.textContent = 'Pause';
        resetBtn.disabled = false;
    }

    /**
     * Handles the Pause/Resume button click.
     */
    function handlePause() {
        console.log("Pause/Resume button clicked");
        isPaused = !isPaused;
        if (isPaused) {
            stopTracking(); // Stop GPS updates while paused
            pausedTime = Date.now(); // Record when pause started
            pauseBtn.textContent = 'Resume';
            // Timer continues to run but accounts for pausedTime when calculating duration
        } else {
            startTracking(); // Resume GPS updates
            // totalPausedDuration is updated in startTimer when it resumes
            startTimer(); // Effectively resumes timer by adjusting for pause
            pauseBtn.textContent = 'Pause';
        }
    }

    /**
     * Handles the Reset button click.
     */
    function handleReset() {
        console.log("Reset button clicked");
        stopTracking();
        stopTimer();

        // Reset all state variables
        startTime = null;
        pausedTime = 0;
        totalPausedDuration = 0;
        distance = 0;
        coordinates = [];
        isPaused = false;

        // Clear map
        if (map && polyline) {
            map.removeLayer(polyline);
            polyline = null;
        }
        if (map) {
             // Optionally reset map view to default
            map.setView([0, 0], 2);
        }


        // Reset display elements
        startTimeElement.textContent = '-';
        durationElement.textContent = '-';
        distanceElement.textContent = '-';

        // Update button states
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        pauseBtn.textContent = 'Pause';
        resetBtn.disabled = true;
    }

    // --- INITIAL SETUP ---
    /**
     * Initial setup when the script loads.
     */
    function initialize() {
        initMap(); // Initialize map on load

        // Attach event listeners to buttons
        startBtn.addEventListener('click', handleStart);
        pauseBtn.addEventListener('click', handlePause);
        resetBtn.addEventListener('click', handleReset);

        // Initial button states
        pauseBtn.disabled = true;
        resetBtn.disabled = true;
    }

    initialize(); // Run the initialization function
});
