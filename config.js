


  // config.js - Configuration settings for the solar panel application

const CONFIG = {
    // Google Maps API key (you'll need to replace this with your actual API key)
    GOOGLE_MAPS_API_KEY: "",
    
    // Panel specifications
    PANEL_WIDTH: 1.9, // meters
    PANEL_HEIGHT: 1.0, // meters
    PANEL_POWER: 350, // watts
    PANEL_SPACING: 0.1, // meters
    
    // Environmental factors
    AVERAGE_SUNLIGHT_HOURS: 4.5, // hours per day
    
    // System efficiency factors
    EFFICIENCY_FACTOR: 0.8, // 80% efficiency
    
    // CO2 offset calculations
    CARBON_OFFSET_PER_KWH: 0.5 // kg CO2 per kWh
};

// Make sure CONFIG is available in the global scope
window.CONFIG = CONFIG;
