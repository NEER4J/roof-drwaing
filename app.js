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
    
    // Load Google Maps API with async loading pattern
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    
    // Set up callback to initialize map when API is loaded
    script.onload = function() {
        initMap();
    };
    
    // Set up all event listeners
    setupEventListeners();
}

document.getElementById('done-btn').addEventListener('click', completeDrawing);

function setupEventListeners() {
    // Search address button
    document.getElementById('search-address-btn').addEventListener('click', searchAddress);
    
    // Clear button
    document.getElementById('clear-btn').addEventListener('click', clearDrawing);
    document.getElementById('clear-btn-two').addEventListener('click', clearDrawing);
    
    // Done button

    
    // Add another roof button
    document.getElementById('add-roof-btn').addEventListener('click', addAnotherRoof);
    
    // Get quote button - only add listener if getQuote function exists
    const getQuoteBtn = document.getElementById('get-quote-btn');
    if (getQuoteBtn && typeof window.getQuote === 'function') {
        getQuoteBtn.addEventListener('click', window.getQuote);
    }
    
    // Add a button to start drawing after map adjustment
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', startDrawingMode);
    }
    
    // Add third roof button (in the summary section)
    const addThirdRoofBtn = document.getElementById('add-3rd-roof');
    if (addThirdRoofBtn) {
        addThirdRoofBtn.addEventListener('click', function() {
            // Show the drawing panel
            const drawingPanel = document.getElementById('drawing-panel');
            if (drawingPanel) {
                drawingPanel.style.display = 'flex';
            }
            // Hide the roof summary
            const roofSummary = document.getElementById('roof-summary');
            if (roofSummary) {
                roofSummary.style.display = 'none';
            }
            // Call the addAnotherRoof function
            addAnotherRoof();
        });
    }
    
    // Update roof details with solar potential when summary shown
    document.addEventListener('roofSummaryUpdated', function() {
        if (typeof calculateSolarPotential === 'function') {
            updatePotentialDetails();
        }
    });
    
    // Update direction text when azimuth changes
    const azimuthInput = document.getElementById('roof-azimuth');
    if (azimuthInput) {
        azimuthInput.addEventListener('input', function() {
            updateDirectionText(this.value);
        });
        
        // Set initial direction text
        updateDirectionText(azimuthInput.value);
    }
}

// Update the direction text based on azimuth value
function updateDirectionText(azimuth) {
    const directionTextElement = document.getElementById('direction-text');
    if (!directionTextElement) return;
    
    // Convert azimuth to cardinal direction
    azimuth = parseInt(azimuth);
    
    let direction = "";
    if (azimuth >= 90 && azimuth < 135) {
        direction = "East";
    } else if (azimuth >= 135 && azimuth < 225) {
        direction = "South";
    } else if (azimuth >= 225 && azimuth <= 270) {
        direction = "West";
    }
    
    directionTextElement.textContent = direction;
}

// Update potential details in the roof summary
function updatePotentialDetails() {
    // Make sure we have polygons to calculate
    if (polygonAreas.length === 0) return;
    
    // Calculate or refresh solar potential
    for (const polygon of polygonAreas) {
        enhancedCalculatePolygonProperties(polygon);
    }
    
    // Calculate totals
    let totalSystemSize = 0;
    let totalDailyProduction = 0;
    let totalAnnualProduction = 0;
    let totalCO2Offset = 0;
    
    for (const polygon of polygonAreas) {
        totalSystemSize += polygon.systemSizeKW || 0;
        totalDailyProduction += polygon.dailyProductionKWh || 0;
        totalAnnualProduction += polygon.annualProductionKWh || 0;
        totalCO2Offset += polygon.annualCO2OffsetKg || 0;
    }
    
    // Update the solar potential details in the summary
    const solarDetailsContainer = document.getElementById('solar-potential-details');
    if (solarDetailsContainer) {
        solarDetailsContainer.innerHTML = `
            <div class="potential-item">
                <div class="potential-label"><i class="fas fa-bolt"></i> System Size</div>
                <div class="potential-value">${totalSystemSize.toFixed(2)} kW</div>
            </div>
            <div class="potential-item">
                <div class="potential-label"><i class="fas fa-sun"></i> Daily Production</div>
                <div class="potential-value">${totalDailyProduction.toFixed(1)} kWh</div>
            </div>
            <div class="potential-item">
                <div class="potential-label"><i class="fas fa-calendar-alt"></i> Annual Production</div>
                <div class="potential-value">${Math.round(totalAnnualProduction)} kWh</div>
            </div>
            <div class="potential-item">
                <div class="potential-label"><i class="fas fa-leaf"></i> CO₂ Offset</div>
                <div class="potential-value">${Math.round(totalCO2Offset)} kg/year</div>
            </div>
        `;
    }
}