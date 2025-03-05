// app.js - Main application entry point that connects all modules

// Global polygon tracking state
window.polygonAreas = [];
window.activePolygonIndex = -1;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    console.log("Initializing application");
    
    // Ensure polygonAreas is accessible from all files
    if (typeof polygonAreas === 'undefined') {
        window.polygonAreas = [];
    }
    
    // Load Google Maps API with callback to initMap
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    // Set up all event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Search address button
    document.getElementById('search-address-btn').addEventListener('click', searchAddress);
    
    // Clear button
    document.getElementById('clear-btn').addEventListener('click', clearDrawing);
    
    // Done button
    document.getElementById('done-btn').addEventListener('click', completeDrawing);
    
    // Add another roof button
    document.getElementById('add-roof-btn').addEventListener('click', addAnotherRoof);
    
    // Get quote button
    document.getElementById('get-quote-btn').addEventListener('click', getQuote);
    
    // Add a button to start drawing after map adjustment
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', startDrawingMode);
    }
    
    // Add third roof button (in the summary section)
    const addThirdRoofBtn = document.getElementById('add-3rd-roof');
    if (addThirdRoofBtn) {
        addThirdRoofBtn.addEventListener('click', addAnotherRoof);
    }
}