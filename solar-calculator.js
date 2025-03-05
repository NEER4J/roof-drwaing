// solar-calculator.js - Simplified version without preview canvas

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Add event listener for roof summary updates
    document.addEventListener('roofSummaryUpdated', function() {
        updatePotentialDetails();
    });
});

// Enhanced polygon property calculation (simplified)
function enhancedCalculatePolygonProperties(polygon) {
    if (!polygon) return;
    
    // Basic area calculations are already done in the main function
    // Let's enhance with solar production values
    
    // Default values if not specified
    if (!polygon.orientation) polygon.orientation = 'landscape';
    if (!polygon.angle === undefined) polygon.angle = 20;
    if (!polygon.azimuth === undefined) polygon.azimuth = 180;
    
    // Calculate energy production
    calculateEnergyProduction(polygon);
    
    return polygon;
}

// Calculate energy production based on roof orientation and angle
function calculateEnergyProduction(polygon) {
    if (!polygon) return;
    
    // Default values if not specified
    if (!polygon.angle) polygon.angle = 20;
    if (!polygon.azimuth) polygon.azimuth = 180;
    
    const roofAngle = polygon.angle;
    const roofAzimuth = polygon.azimuth;
    
    // Adjust for roof angle (optimal is around 30 degrees)
    let angleFactor = 1 - Math.abs(roofAngle - 30) / 60;
    angleFactor = Math.max(0.7, Math.min(1, angleFactor));
    
    // Adjust for roof azimuth (optimal is facing south - 180 degrees)
    let azimuthFactor = 1 - Math.abs(roofAzimuth - 180) / 180;
    azimuthFactor = Math.max(0.7, Math.min(1, azimuthFactor));
    
    // Combined efficiency factor
    const efficiencyFactor = angleFactor * azimuthFactor;
    
    // Calculate production
    const avgSunlightHours = (CONFIG && CONFIG.AVERAGE_SUNLIGHT_HOURS) || 4.5;
    const panelPower = (CONFIG && CONFIG.PANEL_POWER) || 350;
    
    // Make sure we have a valid estimatedPanels value
    if (!polygon.estimatedPanels || polygon.estimatedPanels < 1) {
        polygon.estimatedPanels = Math.max(1, Math.floor(polygon.areaMeters * 0.5));
    }
    
    // Calculate system size
    polygon.systemSizeKW = (polygon.estimatedPanels * panelPower) / 1000;
    
    // Calculate energy production
    polygon.dailyProductionKWh = polygon.systemSizeKW * avgSunlightHours * efficiencyFactor;
    polygon.annualProductionKWh = polygon.dailyProductionKWh * 365;
    
    // Calculate environmental impact
    const kgCO2PerKWh = 0.5;
    polygon.annualCO2OffsetKg = polygon.annualProductionKWh * kgCO2PerKWh;
    
    return polygon;
}

// Update potential details in the summary section
function updatePotentialDetails() {
    // Make sure we have polygons to calculate
    if (polygonAreas.length === 0 || !document.getElementById('solar-potential-details')) {
        return;
    }
    
    // Make sure all polygons have proper energy calculations
    for (const polygon of polygonAreas) {
        // Force set a default estimatedPanels value if it's missing or 0
        if (!polygon.estimatedPanels || polygon.estimatedPanels < 1) {
            polygon.estimatedPanels = Math.max(1, Math.floor(polygon.areaMeters * 0.5));
            calculateEnergyProduction(polygon);
        }
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
    solarDetailsContainer.innerHTML = `
        <div class="potential-item">
            <div class="potential-label">System Size</div>
            <div class="potential-value">${totalSystemSize.toFixed(2)} kW</div>
        </div>
        <div class="potential-item">
            <div class="potential-label">Daily Production</div>
            <div class="potential-value">${totalDailyProduction.toFixed(1)} kWh</div>
        </div>
        <div class="potential-item">
            <div class="potential-label">Annual Production</div>
            <div class="potential-value">${Math.round(totalAnnualProduction)} kWh</div>
        </div>
        <div class="potential-item">
            <div class="potential-label">CO₂ Offset</div>
            <div class="potential-value">${Math.round(totalCO2Offset)} kg/year</div>
        </div>
    `;
}

// Recalculate active polygon - stub function for compatibility
function recalculateActiveArea() {
    // This is just a stub since we removed the UI controls
    console.log("recalculateActiveArea called, but UI controls removed");
}