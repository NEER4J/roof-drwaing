// map-handler.js - Map initialization and geocoding functionality

let map;
let geocoder;
let isMapAdjustmentMode = false;

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
    google.maps.event.addListener(map, 'bounds_changed', updateCanvasSize);
    
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
            
            // Create a marker at the location
            new google.maps.Marker({
                map: map,
                position: results[0].geometry.location
            });
            
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