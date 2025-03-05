// map-handler.js - Map initialization and geocoding functionality

let map;
let geocoder;
let isMapAdjustmentMode = false;

// Initialize Google Maps// Add this to your map-handler.js file to initialize the map correctly

// Initialize Google Maps
function initMap() {
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: { lat: 37.7749, lng: -122.4194 },
        zoom: 20,
        mapTypeId: 'satellite',
        tilt: 0
    });
    
    geocoder = new google.maps.Geocoder();
    setupDrawingCanvas();
    
    // Initialize the magnifier map after the main map is ready
    if (typeof initMagnifierMap === 'function') {
        initMagnifierMap();
    }
    
    google.maps.event.addListener(map, 'bounds_changed', function() {
        updateCanvasSize();
        
        // Update magnifier map zoom level when main map zoom changes
        if (magnifierMap) {
            magnifierMap.setZoom(map.getZoom() + 3);
        }
    });
    
    // Show initial instructions more prominently
    updateInstructions('Please search for your address to begin');
    
    // Add pointer cursor to canvas to indicate it's interactive
    document.getElementById('drawing-canvas').style.cursor = 'crosshair';
}

// Handle address search and geocoding
function searchAddress() {
    const address = document.getElementById('address-input').value;
    if (!address) return;
    
    geocoder.geocode({ 'address': address }, function(results, status) {
        if (status === 'OK') {
            map.setCenter(results[0].geometry.location);
            
            // Create a marker using AdvancedMarkerElement if available
            if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
                new google.maps.marker.AdvancedMarkerElement({
                    map: map,
                    position: results[0].geometry.location
                });
            } else {
                // Fall back to legacy Marker
                new google.maps.Marker({
                    map: map,
                    position: results[0].geometry.location
                });
            }
            
            map.setZoom(20);
            
            // Clear any existing drawings
            if (typeof clearDrawing === 'function') {
                clearDrawing();
            }
            
            // Enter map adjustment mode instead of drawing mode
            isMapAdjustmentMode = true;
            isDrawing = false;
            
            // Make the map draggable during adjustment mode
            // Ensure the canvas doesn't interfere with map dragging
            const drawingCanvasContainer = document.getElementById('drawing-canvas-container');
            if (drawingCanvasContainer) {
                drawingCanvasContainer.style.pointerEvents = 'none';
            }
            
            // Show clear instructions with animation to grab attention
            const instructions = document.getElementById('drawing-instructions');
            instructions.textContent = 'Adjust the map to center your house perfectly, then click Next to start drawing';
            instructions.classList.add('highlight');
            setTimeout(() => instructions.classList.remove('highlight'), 2000);
            
            // Make sure the drawing panel is visible
            document.getElementById('drawing-panel').style.display = 'block';
            
            // Show the Next button to proceed to drawing
            const nextBtn = document.getElementById('next-btn');
            if (nextBtn) {
                nextBtn.style.display = 'block';
            }
            
            // Hide the clear button until drawing starts
            const clearBtn = document.getElementById('clear-btn');
            if (clearBtn) {
                clearBtn.style.display = 'none';
            }
            
        } else {
            alert('Geocode was not successful for the following reason: ' + status);
        }
    });
}

// Function to start drawing mode after map adjustment
function startDrawingMode() {
    isMapAdjustmentMode = false;
    isDrawing = true;
    
    // Re-enable drawing canvas interactions
    const drawingCanvasContainer = document.getElementById('drawing-canvas-container');
    if (drawingCanvasContainer) {
        drawingCanvasContainer.style.pointerEvents = 'auto';
    }
    
    // Update instructions for drawing
    updateInstructions('Click on the roof corners to start outlining your roof');
    
    // Hide Next button and show Clear button
    const nextBtn = document.getElementById('next-btn');
    if (nextBtn) {
        nextBtn.style.display = 'none';
    }
    
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'block';
    }
}

// Update instruction text
function updateInstructions(text) {
    document.getElementById('drawing-instructions').textContent = text;
}

// Function to convert from LatLng to pixel coordinates
function latLngToPixel(latLng) {
    if (!map || !map.getProjection()) return null;
    
    const scale = Math.pow(2, map.getZoom());
    const projection = map.getProjection();
    const bounds = map.getBounds();
    
    if (!projection || !bounds) return null;
    
    const topRight = projection.fromLatLngToPoint(bounds.getNorthEast());
    const bottomLeft = projection.fromLatLngToPoint(bounds.getSouthWest());
    const worldPoint = projection.fromLatLngToPoint(latLng);
    
    return {
        x: (worldPoint.x - bottomLeft.x) * scale,
        y: (worldPoint.y - topRight.y) * scale
    };
}

// Modify the setupDrawingCanvas function to include magnifier behavior
function setupDrawingCanvas() {
    const mapContainer = document.getElementById('map-container');
    const canvasContainer = document.getElementById('drawing-canvas-container');
    drawingCanvas = document.getElementById('drawing-canvas');
    
    canvasContainer.style.width = mapContainer.offsetWidth + 'px';
    canvasContainer.style.height = mapContainer.offsetHeight + 'px';
    
    drawingCanvas.width = mapContainer.offsetWidth;
    drawingCanvas.height = mapContainer.offsetHeight;
    
    ctx = drawingCanvas.getContext('2d');
    
    drawingCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    drawingCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    drawingCanvas.addEventListener('mouseup', handleCanvasMouseUp);
    
    // These events are now handled by the magnifier functions
    // We don't need to add additional listeners here
}