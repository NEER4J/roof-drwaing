// map-handler.js - Map initialization and geocoding functionality

let map;
let geocoder;
let isMapAdjustmentMode = false;

// Initialize Google Maps// Add this to your map-handler.js file to initialize the map correctly

// Initialize Google Maps
// Add this to the map-handler.js file to preload the magnifier map

// Modify the initMap function
function initMap() {
    map = new google.maps.Map(document.getElementById('map-container'), {
        center: { lat: 51.5074, lng: -0.1278 }, // Center on UK
        zoom: 20,
        mapTypeId: 'satellite',
        tilt: 0,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        gestureHandling: 'greedy' // Makes it easier to move the map on mobile
    });
    
    geocoder = new google.maps.Geocoder(); 
    setupDrawingCanvas();
    
    // Initialize the magnifier map immediately after the main map
    if (typeof initMagnifierMap === 'function') {
        console.log("Initializing magnifier map");
        initMagnifierMap();
    }
    
    // Handle resize events properly
    window.addEventListener('resize', debounce(function() {
        updateMapSize();
        updateCanvasSize();
        if (magnifierMap) {
            updateMagnifierSize();
        }
    }, 250));

    // Handle orientation change on mobile
    window.addEventListener('orientationchange', function() {
        setTimeout(function() {
            updateMapSize();
            updateCanvasSize();
            if (magnifierMap) {
                updateMagnifierSize();
            }
        }, 200);
    });
    
    // Initial size update
    updateMapSize();
    
    // Show initial instructions
    updateInstructions('Please search for your address to begin');
    
    // Add pointer cursor to canvas
    document.getElementById('drawing-canvas').style.cursor = 'crosshair';
}

// Debounce function to limit rapid firing of resize events
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// Update map container size
function updateMapSize() {
    const mapContainer = document.getElementById('map-container');
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    
    // Adjust map height for mobile
    if (windowWidth <= 768) {
        mapContainer.style.height = (windowHeight - 60) + 'px'; // Account for header/search bar
    } else {
        // mapContainer.style.height = '100%';
    }
    
    // Trigger a resize event on the map
    if (map) {
        google.maps.event.trigger(map, 'resize');
    }
}

// Update canvas size to match map
function updateCanvasSize() {
    const mapContainer = document.getElementById('map-container');
    const canvasContainer = document.getElementById('drawing-canvas-container');
    const drawingCanvas = document.getElementById('drawing-canvas');
    
    if (!mapContainer || !canvasContainer || !drawingCanvas) return;
    
    // Get the computed size of the map container
    const mapRect = mapContainer.getBoundingClientRect();
    
    // Update container size
    canvasContainer.style.width = mapRect.width + 'px';
    canvasContainer.style.height = mapRect.height + 'px';
    
    // Update canvas size
    drawingCanvas.width = mapRect.width;
    drawingCanvas.height = mapRect.height;
    
    // Redraw any existing polygons
    if (typeof redrawPolygons === 'function') {
        redrawPolygons();
    }
}

// Setup drawing canvas with touch support
function setupDrawingCanvas() {
    const mapContainer = document.getElementById('map-container');
    const canvasContainer = document.getElementById('drawing-canvas-container');
    const drawingCanvas = document.getElementById('drawing-canvas');
    
    if (!mapContainer || !canvasContainer || !drawingCanvas) return;
    
    const ctx = drawingCanvas.getContext('2d');
    
    // Set initial size
    updateCanvasSize();
    
    // Add touch event listeners
    drawingCanvas.addEventListener('touchstart', handleCanvasTouch, { passive: false });
    drawingCanvas.addEventListener('touchmove', handleCanvasTouch, { passive: false });
    drawingCanvas.addEventListener('touchend', handleCanvasTouch, { passive: false });
    
    // Keep mouse event listeners for desktop
    drawingCanvas.addEventListener('mousedown', handleCanvasMouseDown);
    drawingCanvas.addEventListener('mousemove', handleCanvasMouseMove);
    drawingCanvas.addEventListener('mouseup', handleCanvasMouseUp);
}

// Handle touch events
function handleCanvasTouch(event) {
    event.preventDefault(); // Prevent scrolling while drawing
    
    const touch = event.touches[0] || event.changedTouches[0];
    if (!touch) return;
    
    const rect = event.target.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    switch(event.type) {
        case 'touchstart':
            handleCanvasMouseDown({ offsetX: x, offsetY: y });
            break;
        case 'touchmove':
            handleCanvasMouseMove({ offsetX: x, offsetY: y });
            break;
        case 'touchend':
            handleCanvasMouseUp({ offsetX: x, offsetY: y });
            break;
    }
}

// Handle address search and geocoding
function searchAddress() {
    const address = document.getElementById('address-input').value;
    if (!address) {
        return;
    }
    
    // Use Google's geocoding service
    geocoder.geocode({ 'address': address, 'region': 'uk' }, function(results, status) {
        if (status === 'OK') {
            map.setCenter(results[0].geometry.location);
            map.setZoom(20);
            
            // Clear any existing drawings
            if (typeof clearDrawing === 'function') {
                clearDrawing();
            }
            
            // Hide the search elements
            document.querySelector('.address-search').style.display = 'none';
            
            // Enter map adjustment mode instead of drawing mode
            isMapAdjustmentMode = true;
            isDrawing = false;
            
            // Create container for crosshair elements
            const crosshairContainer = document.createElement('div');
            crosshairContainer.id = 'map-center-crosshair';
            crosshairContainer.style.position = 'absolute';
            crosshairContainer.style.top = '0';
            crosshairContainer.style.left = '0';
            crosshairContainer.style.width = '100%';
            crosshairContainer.style.height = '100%';
            crosshairContainer.style.pointerEvents = 'none';
            crosshairContainer.style.zIndex = '10';

            // Add horizontal line
            const horizontalLine = document.createElement('div');
            horizontalLine.style.position = 'absolute';
            horizontalLine.style.width = '100%';
            horizontalLine.style.height = '3px';
            horizontalLine.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
            horizontalLine.style.top = '50%';
            horizontalLine.style.left = '0';
            horizontalLine.style.borderTop = '2px dashed rgba(255, 255, 255, 0.7)';
            horizontalLine.style.backgroundColor = 'transparent';

            // Add vertical line
            const verticalLine = document.createElement('div');
            verticalLine.style.position = 'absolute';
            verticalLine.style.width = '3px';
            verticalLine.style.height = '100%';
            verticalLine.style.backgroundColor = 'transparent';
            verticalLine.style.left = '50%';
            verticalLine.style.top = '0';
            verticalLine.style.borderLeft = '2px dashed rgba(255, 255, 255, 0.7)';

            // Add center dot
            const centerDot = document.createElement('div');
            centerDot.style.position = 'absolute';
            centerDot.style.top = '50%';
            centerDot.style.left = '50%';
            centerDot.style.transform = 'translate(-50%, -50%)';
            centerDot.style.width = '12px';
            centerDot.style.height = '12px';
            centerDot.style.backgroundColor = '#439a5a';
            centerDot.style.borderRadius = '50%';
            
            // Assemble the crosshair
            crosshairContainer.appendChild(horizontalLine);
            crosshairContainer.appendChild(verticalLine);
            crosshairContainer.appendChild(centerDot);
            
            document.getElementById('map-container').appendChild(crosshairContainer);
            
            // Make the map draggable during adjustment mode
            // Ensure the canvas doesn't interfere with map dragging
            const drawingCanvasContainer = document.getElementById('drawing-canvas-container');
            if (drawingCanvasContainer) {
                drawingCanvasContainer.style.pointerEvents = 'none';
            }
            
            // Show clear instructions with animation to grab attention
            const instructions = document.getElementById('drawing-instructions');
            instructions.innerHTML = '<i class="fas fa-crosshairs"></i> Adjust the map to center your house perfectly, then click Next to start drawing';
            instructions.classList.add('highlight');
            setTimeout(() => instructions.classList.remove('highlight'), 2000);
            
            // Show clear instructions with animation to grab attention
            const instructions_two = document.getElementById('drawing-instructions-two');
            instructions_two.innerHTML = '<i class="fas fa-crosshairs"></i> Adjust the map to center your house perfectly, then click Next to start drawing';
            instructions_two.classList.add('highlight');
            setTimeout(() => instructions_two.classList.remove('highlight'), 2000);
            
            // Make sure the drawing panel is visible
            document.getElementById('drawing-panel').style.display = 'flex';
            
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
            alert('Could not find address. Please try again.');
        }
    });
}

// Function to start drawing mode after map adjustment
function startDrawingMode() {
    isMapAdjustmentMode = false;
    isDrawing = true;
    
    // Remove the center crosshair
    const crosshairContainer = document.getElementById('map-center-crosshair');
    if (crosshairContainer) {
        crosshairContainer.remove();
    }
    
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
    const instructionElement = document.getElementById('drawing-instructions');
    
    // Choose icon based on the content of the message
    let icon = '<i class="fas fa-info-circle"></i> ';
    
    if (text.includes('search for your address')) {
        icon = '<i class="fas fa-search"></i> ';
    } else if (text.includes('Click') && text.includes('start drawing')) {
        icon = '<i class="fas fa-pencil-alt"></i> ';
    } else if (text.includes('Click') && text.includes('roof corners')) {
        icon = '<i class="fas fa-draw-polygon"></i> ';
    } else if (text.includes('outline your roof')) {
        icon = '<i class="fas fa-draw-polygon"></i> ';
    } else if (text.includes('Continue clicking')) {
        icon = '<i class="fas fa-pen"></i> ';
    } else if (text.includes('first point')) {
        icon = '<i class="fas fa-check-circle"></i> ';
    } else if (text.includes('Editing roof')) {
        icon = '<i class="fas fa-edit"></i> ';
    } else if (text.includes('Drag the points')) {
        icon = '<i class="fas fa-arrows-alt"></i> ';
    } else if (text.includes('Review your summary')) {
        icon = '<i class="fas fa-clipboard-check"></i> ';
    } else if (text.includes('completed') || text.includes('done')) {
        icon = '<i class="fas fa-check"></i> ';
    } else if (text.includes('last roof')) {
        icon = '<i class="fas fa-trash"></i> ';
    } else if (text.includes('Add another roof')) {
        icon = '<i class="fas fa-plus"></i> ';
    }
    
    instructionElement.innerHTML = icon + text;
    
    // Also update the second instruction element if it exists
    const instructionElement2 = document.getElementById('drawing-instructions-two');
    if (instructionElement2) {
        instructionElement2.innerHTML = icon + text;
    }
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

// Add this to handle browser back/forward navigation properly
window.addEventListener('popstate', function() {
    // Ensure magnifier is hidden when navigating back/forward
    if (typeof hideMagnifier === 'function') {
        hideMagnifier();
    }
});