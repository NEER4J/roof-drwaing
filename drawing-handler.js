// drawing-handler.js - Polygon drawing and manipulation functionality

let drawingCanvas;
let ctx;
let polygonPoints = [];
let isDrawing = false;
let selectedPointIndex = -1;
let polygonAreas = [];
let activePolygonIndex = -1;
let isHoveringFirstPoint = false;
let currentPolygonColor = 'green'; // Default color for first roof
let isDraggingPoint = false;
let magnifierMap = null;  // Will hold the secondary map for the magnifier
let magnifierDiv = null;  // DOM element for the magnifier
let isMagnifierActive = false;

// Set up the drawing canvas
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
    
    // Set up magnifier map
    setupMagnifier();
} 

// Enhanced magnifier implementation for drawing-handler.js

// Enhanced magnifier implementation for drawing-handler.js

// Setup a secondary map for the magnifier with preloading
function setupMagnifier() {
    // Create a div for the magnifier map
    magnifierDiv = document.createElement('div');
    magnifierDiv.id = 'magnifier-map';
    magnifierDiv.style.position = 'absolute';
    magnifierDiv.style.width = '150px'; // Increased from 120px
    magnifierDiv.style.height = '150px'; // Increased from 120px
    magnifierDiv.style.borderRadius = '50%';
    magnifierDiv.style.overflow = 'hidden';
    magnifierDiv.style.border = '2px solid white';
    magnifierDiv.style.boxShadow = '0 0 8px rgba(0,0,0,0.5)'; // Enhanced shadow
    magnifierDiv.style.zIndex = '1000';
    magnifierDiv.style.display = 'none';
    magnifierDiv.style.pointerEvents = 'none'; // Make sure it doesn't interfere with mouse events
    
    // Create a canvas overlay for drawing lines in the magnifier
    const magnifierCanvas = document.createElement('canvas');
    magnifierCanvas.id = 'magnifier-canvas';
    magnifierCanvas.style.position = 'absolute';
    magnifierCanvas.style.top = '0';
    magnifierCanvas.style.left = '0';
    magnifierCanvas.style.width = '100%';
    magnifierCanvas.style.height = '100%';
    magnifierCanvas.style.pointerEvents = 'none';
    magnifierCanvas.style.zIndex = '2'; // Above map but below crosshair
    magnifierDiv.appendChild(magnifierCanvas);
    
    // Add to the parent container
    const mapContainer = document.getElementById('map-container').parentElement;
    mapContainer.appendChild(magnifierDiv);
    
    // Add crosshair to magnifier
    const crosshair = document.createElement('div');
    crosshair.id = 'magnifier-crosshair';
    crosshair.style.position = 'absolute';
    crosshair.style.top = '50%';
    crosshair.style.left = '50%';
    crosshair.style.transform = 'translate(-50%, -50%)';
    crosshair.style.pointerEvents = 'none';
    crosshair.style.zIndex = '3'; // Above canvas
    
    // Create crosshair lines
    const horizontalLine = document.createElement('div');
    horizontalLine.style.position = 'absolute';
    horizontalLine.style.width = '0px';
    horizontalLine.style.height = '0px';
    horizontalLine.style.backgroundColor = 'black';
    horizontalLine.style.top = '0';
    horizontalLine.style.left = '-5px';
    
    const verticalLine = document.createElement('div');
    verticalLine.style.position = 'absolute';
    verticalLine.style.width = '0px';
    verticalLine.style.height = '0px';
    verticalLine.style.backgroundColor = 'white';
    verticalLine.style.top = '-5px';
    verticalLine.style.left = '0';
    
    crosshair.appendChild(horizontalLine);
    crosshair.appendChild(verticalLine);
    magnifierDiv.appendChild(crosshair);
    
    // Preload map as soon as possible
    if (typeof google !== 'undefined' && google.maps) {
        initMagnifierMap();
    } else {
        // If Google Maps isn't loaded yet, set up a check to initialize when it becomes available
        const checkGoogleMaps = setInterval(() => {
            if (typeof google !== 'undefined' && google.maps) {
                initMagnifierMap();
                clearInterval(checkGoogleMaps);
            }
        }, 100);
    }
}

// Initialize the magnifier map once Google Maps is ready
function initMagnifierMap() {
    if (!magnifierDiv) return;
    
    try {
        // Create a placeholder div if we need to wait for the main map
        if (!map) {
            console.log("Main map not ready yet, creating placeholder for magnifier map");
            const placeholderDiv = document.createElement('div');
            placeholderDiv.id = 'magnifier-map-content';
            placeholderDiv.style.width = '100%';
            placeholderDiv.style.height = '100%';
            magnifierDiv.appendChild(placeholderDiv);
            
            // We'll initialize properly when the main map is ready
            const checkMainMap = setInterval(() => {
                if (map) {
                    createMagnifierMap();
                    clearInterval(checkMainMap);
                }
            }, 100);
        } else {
            createMagnifierMap();
        }
    } catch (error) {
        console.error("Could not initialize magnifier map:", error);
    }
}

// Create the actual magnifier map
function createMagnifierMap() {
    // Find or create the content div
    let mapContentDiv = document.getElementById('magnifier-map-content');
    if (!mapContentDiv) {
        mapContentDiv = document.createElement('div');
        mapContentDiv.id = 'magnifier-map-content';
        mapContentDiv.style.width = '100%';
        mapContentDiv.style.height = '100%';
        magnifierDiv.appendChild(mapContentDiv);
    }
    
    // Create the magnifier map with higher zoom level
    magnifierMap = new google.maps.Map(mapContentDiv, {
        center: map.getCenter(),
        zoom: map.getZoom() + 3,  // Higher zoom level
        mapTypeId: 'satellite',
        disableDefaultUI: true,   // No controls needed
        draggable: false,
        zoomControl: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        tilt: 0  // Ensure top-down view
    });
    
    // Resize the magnifier canvas
    const magnifierCanvas = document.getElementById('magnifier-canvas');
    if (magnifierCanvas) {
        magnifierCanvas.width = 150;
        magnifierCanvas.height = 150;
    }
    
    console.log("Magnifier map initialized successfully");
}

// Update the magnifier position, content, and draw the polygon lines
function updateMagnifier(x, y) {
    if (!magnifierDiv || !map) return;
    
    // Make sure the magnifier is visible
    magnifierDiv.style.display = 'block';
    
    // Offset the magnifier from the cursor (top-right)
    const offsetX = -50;
    const offsetY = 50;
    
    // Position the magnifier div
    magnifierDiv.style.left = (x + offsetX) + 'px';
    magnifierDiv.style.top = (y + offsetY) + 'px';
    
    // Update the map center to match the cursor position
    try {
        const point = new google.maps.Point(x, y);
        const latLng = pixelToLatLng(point);
        if (latLng && magnifierMap) {
            magnifierMap.setCenter(latLng);
            
            // Now draw the polygon lines on the magnifier canvas
            drawPolygonLinesInMagnifier(x, y);
        }
    } catch (error) {
        console.error("Error updating magnifier position:", error);
    }
}

// Draw polygon lines in the magnifier canvas
function drawPolygonLinesInMagnifier(cursorX, cursorY) {
    const magnifierCanvas = document.getElementById('magnifier-canvas');
    if (!magnifierCanvas) return;
    
    const ctx = magnifierCanvas.getContext('2d');
    ctx.clearRect(0, 0, magnifierCanvas.width, magnifierCanvas.height);
    
    // Calculate the center of the magnifier
    const centerX = magnifierCanvas.width / 2;
    const centerY = magnifierCanvas.height / 2;
    
    // Calculate the scale factor between the main canvas and magnifier
    // The magnifier is zoomed in by 3 levels typically
    const zoomDifference = magnifierMap ? (magnifierMap.getZoom() - map.getZoom()) : 3;
    const scaleFactor = Math.pow(2, zoomDifference);
    
    // Draw the completed polygons
    if (polygonAreas && polygonAreas.length > 0) {
        for (const polygon of polygonAreas) {
            drawPolygonInMagnifier(ctx, polygon, cursorX, cursorY, centerX, centerY, scaleFactor);
        }
    }
    
    // Draw the current polygon being drawn
    if (isDrawing && polygonPoints && polygonPoints.length > 0) {
        // Choose the color based on currentPolygonColor
        let strokeColor;
        if (currentPolygonColor === 'green') {
            strokeColor = 'rgba(76, 175, 80, 0.8)';
        } else if (currentPolygonColor === 'purple') {
            strokeColor = 'rgba(156, 39, 176, 0.8)';
        } else if (currentPolygonColor === 'orange') {
            strokeColor = 'rgba(255, 152, 0, 0.8)';
        } else {
            strokeColor = 'rgba(33, 150, 243, 0.8)';
        }
        
        // Draw lines connecting the points
        if (polygonPoints.length > 1) {
            ctx.beginPath();
            
            // Get first point position relative to cursor
            let relX = polygonPoints[0].x - cursorX;
            let relY = polygonPoints[0].y - cursorY;
            
            // Scale and translate to magnifier center
            let magnifierX = centerX + (relX * scaleFactor);
            let magnifierY = centerY + (relY * scaleFactor);
            
            ctx.moveTo(magnifierX, magnifierY);
            
            // Draw remaining points
            for (let i = 1; i < polygonPoints.length; i++) {
                relX = polygonPoints[i].x - cursorX;
                relY = polygonPoints[i].y - cursorY;
                magnifierX = centerX + (relX * scaleFactor);
                magnifierY = centerY + (relY * scaleFactor);
                ctx.lineTo(magnifierX, magnifierY);
            }
            
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        // Draw the "rubber band" line from last point to cursor
        if (polygonPoints.length > 0) {
            const lastPoint = polygonPoints[polygonPoints.length - 1];
            const relX = lastPoint.x - cursorX;
            const relY = lastPoint.y - cursorY;
            
            ctx.beginPath();
            ctx.moveTo(centerX + (relX * scaleFactor), centerY + (relY * scaleFactor));
            ctx.lineTo(centerX, centerY); // Line to cursor (center of magnifier)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 4;
            ctx.stroke();
        }
        
        // Draw points in the in-progress polygon
        for (let i = 0; i < polygonPoints.length; i++) {
            const relX = polygonPoints[i].x - cursorX;
            const relY = polygonPoints[i].y - cursorY;
            const magnifierX = centerX + (relX * scaleFactor);
            const magnifierY = centerY + (relY * scaleFactor);
            
            ctx.beginPath();
            // Check if it's the first point and we have more than 2 points
            if (i === 0 && polygonPoints.length > 2) {
                // Apply a larger radius to reflect the zoom level
                const pointRadius = 16 * scaleFactor / 8; // Slightly larger based on zoom
                
                // Check if hovering over the first point
                if (isHoveringFirstPoint) {
                    // Draw check mark icon with larger, highlighted circle
                    const size = 16 * scaleFactor / 8; // Scale the checkmark size
                    
                    // Background circle
                    ctx.arc(magnifierX, magnifierY, pointRadius + 3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
                    ctx.fill();
                    
                    // Checkmark
                    ctx.beginPath();
                    ctx.moveTo(magnifierX - size/2, magnifierY);
                    ctx.lineTo(magnifierX - size/6, magnifierY + size/2);
                    ctx.lineTo(magnifierX + size/2, magnifierY - size/3);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2.5;
                    ctx.stroke();
                } else {
                    // Draw a larger, more noticeable first point
                    ctx.arc(magnifierX, magnifierY, pointRadius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
                    ctx.fill();
                    ctx.lineWidth = 2.5;
                    ctx.strokeStyle = 'white';
                    ctx.stroke();
                }
            } else {
                // Regular points - scale based on zoom level
                const pointRadius = 10 * scaleFactor / 8;
                ctx.arc(magnifierX, magnifierY, pointRadius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
                ctx.lineWidth = 4;
                ctx.strokeStyle = 'white';
                ctx.stroke();
            }
        }
    }
}

// Draw a completed polygon in the magnifier
function drawPolygonInMagnifier(ctx, polygon, cursorX, cursorY, centerX, centerY, scaleFactor) {
    if (!polygon || !polygon.points || polygon.points.length < 3) return;
    
    // Use the polygon's color
    const color = polygon.color || 'green';
    let strokeColor;
    
    if (color === 'green') {
        strokeColor = 'rgba(76, 175, 80, 0.8)';
    } else if (color === 'purple') {
        strokeColor = 'rgba(156, 39, 176, 0.8)';
    } else if (color === 'orange') {
        strokeColor = 'rgba(255, 152, 0, 0.8)';
    } else {
        strokeColor = 'rgba(33, 150, 243, 0.8)';
    }
    
    // Draw the polygon outline
    ctx.beginPath();
    
    // Get first point position relative to cursor
    let relX = polygon.points[0].x - cursorX;
    let relY = polygon.points[0].y - cursorY;
    
    // Scale and translate to magnifier center
    let magnifierX = centerX + (relX * scaleFactor);
    let magnifierY = centerY + (relY * scaleFactor);
    
    ctx.moveTo(magnifierX, magnifierY);
    
    // Draw remaining points
    for (let i = 1; i < polygon.points.length; i++) {
        relX = polygon.points[i].x - cursorX;
        relY = polygon.points[i].y - cursorY;
        magnifierX = centerX + (relX * scaleFactor);
        magnifierY = centerY + (relY * scaleFactor);
        ctx.lineTo(magnifierX, magnifierY);
    }
    
    ctx.closePath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Also draw a transparent fill
    ctx.fillStyle = strokeColor.replace('0.8', '0.2'); // More transparent version
    ctx.fill();
    
    // Draw the polygon points with increased size to reflect zoom
    for (let i = 0; i < polygon.points.length; i++) {
        const relX = polygon.points[i].x - cursorX;
        const relY = polygon.points[i].y - cursorY;
        const magnifierX = centerX + (relX * scaleFactor);
        const magnifierY = centerY + (relY * scaleFactor);
        
        // Scale point size based on zoom level
        const pointRadius = 12 * scaleFactor / 8;
        
        ctx.beginPath();
        ctx.arc(magnifierX, magnifierY, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }
}

// Optimize the performance of pixelToLatLng function
let lastProjection = null;
let lastBounds = null;
let lastZoom = null;
let lastScale = null;
let lastTopRight = null;
let lastBottomLeft = null;

function pixelToLatLng(pixel) {
    if (!map) return null;
    
    try {
        // Cache projection calculations if possible
        const currentZoom = map.getZoom();
        const currentBounds = map.getBounds();
        let needsUpdate = false;
        
        if (!lastProjection || !lastBounds || lastZoom !== currentZoom) {
            lastProjection = map.getProjection();
            lastBounds = currentBounds;
            lastZoom = currentZoom;
            lastScale = Math.pow(2, currentZoom);
            needsUpdate = true;
        }
        
        if (needsUpdate && lastProjection && lastBounds) {
            lastTopRight = lastProjection.fromLatLngToPoint(lastBounds.getNorthEast());
            lastBottomLeft = lastProjection.fromLatLngToPoint(lastBounds.getSouthWest());
        }
        
        if (!lastProjection || !lastTopRight || !lastBottomLeft) {
            return null;
        }
        
        const worldPoint = new google.maps.Point(
            pixel.x / lastScale + lastBottomLeft.x,
            pixel.y / lastScale + lastTopRight.y
        );
        
        return lastProjection.fromPointToLatLng(worldPoint);
    } catch (error) {
        console.error("Error converting pixel to LatLng:", error);
        return null;
    }
}

// Hide the magnifier
function hideMagnifier() {
    if (magnifierDiv) {
        magnifierDiv.style.display = 'none';
    }
}


// Update canvas size when map size changes
function updateCanvasSize() {
    const mapContainer = document.getElementById('map-container');
    const canvasContainer = document.getElementById('drawing-canvas-container');
    
    canvasContainer.style.width = mapContainer.offsetWidth + 'px';
    canvasContainer.style.height = mapContainer.offsetHeight + 'px';
    
    drawingCanvas.width = mapContainer.offsetWidth;
    drawingCanvas.height = mapContainer.offsetHeight;
    
    redrawPolygons();
}

// Handle mouse down events on the canvas
function handleCanvasMouseDown(e) {
    // If in map adjustment mode, ignore all drawing canvas interactions
    // to allow map dragging without interference
    if (isMapAdjustmentMode) {
        return;
    }
    
    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Make sure we're on the map after an address search
    if (document.getElementById('address-input').value === '') {
        updateInstructions('Please search for your address first before drawing');
        return;
    }
    
    // Check if we're in editing mode (activePolygonIndex >= 0)
    if (activePolygonIndex >= 0 && activePolygonIndex < polygonAreas.length) {
        // We're editing an existing polygon - only allow dragging points
        const points = polygonAreas[activePolygonIndex].points;
        for (let i = 0; i < points.length; i++) {
            const distance = Math.sqrt(Math.pow(points[i].x - x, 2) + Math.pow(points[i].y - y, 2));
            if (distance < 10) {  // If clicking within 10px of a point
                selectedPointIndex = i;
                isDraggingPoint = true;
                // Change cursor to indicate dragging
                drawingCanvas.style.cursor = 'move';
                return;
            }
        }
        // If we're in edit mode but not clicking on a point, ignore the click
        return;
    }
    
    // Prevent starting a new drawing if we've just completed a polygon
    // and haven't clicked "Add another roof"
    if (!isDrawing && polygonAreas.length > 0 && activePolygonIndex === -1) {
        // Only allow point dragging in completed polygons, not starting new ones
        // unless explicitly adding another roof
        
        // Check if we're clicking on a point in any completed polygon
        for (let polygonIndex = 0; polygonIndex < polygonAreas.length; polygonIndex++) {
            const points = polygonAreas[polygonIndex].points;
            for (let i = 0; i < points.length; i++) {
                const distance = Math.sqrt(Math.pow(points[i].x - x, 2) + Math.pow(points[i].y - y, 2));
                if (distance < 10) {  // If clicking within 10px of a point
                    updateInstructions('Use the edit button to modify this roof');
                    return;
                }
            }
        }
        
        updateInstructions('Click "Add another roof" to draw an additional roof area');
        return;
    }
    
    if (isDrawing && polygonPoints.length > 2) {
        // Check if we're clicking on the first point to close the polygon
        const firstPoint = polygonPoints[0];
        const distance = Math.sqrt(Math.pow(firstPoint.x - x, 2) + Math.pow(firstPoint.y - y, 2));
        if (distance < 15) {  // If within 15px of the first point
            completePolygon();
            return;
        }
    }
    
    // Check if we're clicking on a point in the current polygon being drawn
    if (isDrawing && polygonPoints.length > 0) {
        for (let i = 0; i < polygonPoints.length; i++) {
            const distance = Math.sqrt(Math.pow(polygonPoints[i].x - x, 2) + Math.pow(polygonPoints[i].y - y, 2));
            if (distance < 10) {  // If clicking within 10px of a point
                selectedPointIndex = i;
                isDraggingPoint = true;
                drawingCanvas.style.cursor = 'move';
                return;
            }
        }
    }
    
    if (!isDrawing) {
        // Start a new drawing
        isDrawing = true;
        polygonPoints = [];
        polygonPoints.push({ x, y });
        activePolygonIndex = -1;
        updateInstructions('Keep clicking to outline your roof area.');
    } else {
        // Continue existing drawing by adding a new point
        polygonPoints.push({ x, y });
        
        // Update instructions based on number of points
        if (polygonPoints.length === 2) {
            updateInstructions('Continue clicking around the roof perimeter');
        } else if (polygonPoints.length > 2) {
            updateInstructions('Click on the first point (green circle) to complete the outline');
        }
    }
    redrawPolygons();
}

// Handle mouse move events on the canvas
function handleCanvasMouseMove(e) {
    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Update the magnifier position
    if (isDrawing) {
        updateMagnifier(x, y);
    } else {
        hideMagnifier();
    }
    
    // If dragging a point in a completed polygon
    if (isDraggingPoint && activePolygonIndex !== -1 && selectedPointIndex !== -1) {
        polygonAreas[activePolygonIndex].points[selectedPointIndex].x = x;
        polygonAreas[activePolygonIndex].points[selectedPointIndex].y = y;
        
        // Recalculate properties as the polygon has changed
        calculatePolygonProperties(polygonAreas[activePolygonIndex]);
        updateRoofSummary();
        redrawPolygons();
        return;
    }
    
    // If dragging a point in the current drawing
    if (isDraggingPoint && isDrawing && selectedPointIndex !== -1) {
        polygonPoints[selectedPointIndex].x = x;
        polygonPoints[selectedPointIndex].y = y;
        redrawPolygons();
        return;
    }
    
    // Check if hovering over the first point in an active drawing to close polygon
    if (isDrawing && polygonPoints.length > 2) {
        const firstPoint = polygonPoints[0];
        const distance = Math.sqrt(Math.pow(firstPoint.x - x, 2) + Math.pow(firstPoint.y - y, 2));
        
        // Update hovering state for the first point with a slightly larger detection radius
        isHoveringFirstPoint = distance < 15; // 15px threshold
        
        // If hovering over first point, show a special cursor
        if (isHoveringFirstPoint) {
            drawingCanvas.style.cursor = 'pointer';
            redrawPolygons(); // Redraw to show the highlighted first point
            
            // Draw the "rubber band" line to the first point instead of to cursor
            ctx.beginPath();
            ctx.moveTo(polygonPoints[polygonPoints.length - 1].x, polygonPoints[polygonPoints.length - 1].y);
            ctx.lineTo(firstPoint.x, firstPoint.y);
            ctx.strokeStyle = 'rgba(76, 175, 80, 0.7)'; // Green line to indicate closing
            ctx.lineWidth = 2;
            ctx.stroke();
            return;
        }
    } else {
        isHoveringFirstPoint = false;
    }
    
    // Check if hovering over any polygon point to show the grab cursor
    let isOverPoint = false;
    
    // Check points in active drawings
    if (isDrawing && polygonPoints.length > 0) {
        for (let i = 0; i < polygonPoints.length; i++) {
            const distance = Math.sqrt(Math.pow(polygonPoints[i].x - x, 2) + Math.pow(polygonPoints[i].y - y, 2));
            if (distance < 10) {
                isOverPoint = true;
                break;
            }
        }
    }
    
    // Check points in completed polygons
    if (!isOverPoint && polygonAreas.length > 0) {
        for (const polygon of polygonAreas) {
            for (const point of polygon.points) {
                const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                if (distance < 10) {
                    isOverPoint = true;
                    break;
                }
            }
            if (isOverPoint) break;
        }
    }
    
    // Set appropriate cursor
    if (isOverPoint) {
        drawingCanvas.style.cursor = 'grab';
    } else if (!isDraggingPoint && !isMapAdjustmentMode) {
        drawingCanvas.style.cursor = 'crosshair';
    }
    
    if (isDrawing) {
        redrawPolygons();
        
        if (polygonPoints.length > 0) {
            // Draw the "rubber band" line from last point to cursor
            ctx.beginPath();
            ctx.moveTo(polygonPoints[polygonPoints.length - 1].x, polygonPoints[polygonPoints.length - 1].y);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// Handle mouse up events on the canvas
function handleCanvasMouseUp() {
    if (isDraggingPoint) {
        isDraggingPoint = false;
        selectedPointIndex = -1;
        
        // Change cursor back
        if (isDrawing) {
            drawingCanvas.style.cursor = 'crosshair';
        } else {
            drawingCanvas.style.cursor = 'default';
        }
    }
}

// Complete the polygon and add it to the list of areas
function completePolygon() {
    if (polygonPoints.length < 3) {
        alert('Please draw a polygon with at least 3 points.');
        return;
    }
    
    const newArea = {
        points: [...polygonPoints],
        color: currentPolygonColor,
        // Add default panel/roof settings (hidden from user but available for calculations)
        orientation: 'landscape',
        angle: 20,
        azimuth: 180
    };
    
    // Calculate properties before adding to array
    calculatePolygonProperties(newArea);
    
    // Double-check that we have a valid panel count - ensure it's at least 1
    if (!newArea.estimatedPanels || newArea.estimatedPanels < 1) {
        console.warn("Panel count was invalid, setting default value");
        newArea.estimatedPanels = Math.max(1, Math.floor(newArea.areaMeters * 0.5));
    }
    
    polygonAreas.push(newArea);
    activePolygonIndex = polygonAreas.length - 1;
    
    isDrawing = false;
    polygonPoints = [];
    isHoveringFirstPoint = false;
    
    // Hide the magnifier
    hideMagnifier();
    
    redrawPolygons();
    
    // Show success message and options
    const drawStatus = document.querySelector('.draw-status');
    drawStatus.style.display = 'block';

    
    // Add animation for better visibility
    drawStatus.classList.add('fade-in');
    setTimeout(() => drawStatus.classList.remove('fade-in'), 500);
    
    // Enable buttons
    document.getElementById('done-btn').disabled = false;
    document.getElementById('add-roof-btn').disabled = false;
    
    // Update the roof summary with the new area
    updateRoofSummary();
    
    // Scroll to make sure the success message and buttons are visible
    drawStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Redraw all polygons on the canvas
function redrawPolygons() {
    // Clear the canvas
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    // Draw the completed polygons first
    polygonAreas.forEach((polygon, index) => {
        drawPolygon(polygon, index === activePolygonIndex);
    });
    
    // Then draw the current polygon being drawn
    if (isDrawing && polygonPoints.length > 0) {
        // Draw the connecting lines for the in-progress polygon
        if (polygonPoints.length > 1) {
            ctx.beginPath();
            ctx.moveTo(polygonPoints[0].x, polygonPoints[0].y);
            for (let i = 1; i < polygonPoints.length; i++) {
                ctx.lineTo(polygonPoints[i].x, polygonPoints[i].y);
            }
            
            // Use color based on currentPolygonColor
            let strokeColor;
            if (currentPolygonColor === 'green') {
                strokeColor = 'rgba(76, 175, 80, 0.8)';
            } else if (currentPolygonColor === 'purple') {
                strokeColor = 'rgba(156, 39, 176, 0.8)';
            } else if (currentPolygonColor === 'orange') {
                strokeColor = 'rgba(255, 152, 0, 0.8)';
            } else {
                strokeColor = 'rgba(33, 150, 243, 0.8)';
            }
            
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw the points
        for (let i = 0; i < polygonPoints.length; i++) {
            ctx.beginPath();
            
            // Special handling for the first point when there are > 2 points
            if (i === 0 && polygonPoints.length > 2) {
                const x = polygonPoints[i].x;
                const y = polygonPoints[i].y;
                
                // Check if hovering over the first point
                if (isHoveringFirstPoint) {
                    // Draw check mark icon with larger, highlighted circle
                    const size = 10;
                    
                    // Background circle
                    ctx.arc(x, y, 10, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
                    ctx.fill();
                    
                    // Checkmark
                    ctx.beginPath();
                    ctx.moveTo(x - size/2, y);
                    ctx.lineTo(x - size/6, y + size/2);
                    ctx.lineTo(x + size/2, y - size/3);
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                } else {
                    // Draw a larger, more noticeable first point
                    ctx.arc(x, y, 7, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'white';
                    ctx.stroke();
                }
            } else {
                // Regular point
                ctx.arc(polygonPoints[i].x, polygonPoints[i].y, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            }
        }
    }
}

// Draw a single polygon
function drawPolygon(polygon, isActive) {
    const points = polygon.points;
    
    if (!points || points.length < 3) return;
    
    // Use the polygon's color
    const color = polygon.color || 'green';
    let fillColor, strokeColor;
    
    if (color === 'green') {
        fillColor = isActive ? 'rgba(76, 175, 80, 0.5)' : 'rgba(76, 175, 80, 0.3)';
        strokeColor = isActive ? 'rgba(76, 175, 80, 1.0)' : 'rgba(76, 175, 80, 0.8)';
    } else if (color === 'purple') {
        fillColor = isActive ? 'rgba(156, 39, 176, 0.5)' : 'rgba(156, 39, 176, 0.3)';
        strokeColor = isActive ? 'rgba(156, 39, 176, 1.0)' : 'rgba(156, 39, 176, 0.8)';
    } else if (color === 'orange') {
        fillColor = isActive ? 'rgba(255, 152, 0, 0.5)' : 'rgba(255, 152, 0, 0.3)';
        strokeColor = isActive ? 'rgba(255, 152, 0, 1.0)' : 'rgba(255, 152, 0, 0.8)';
    } else {
        fillColor = isActive ? 'rgba(33, 150, 243, 0.5)' : 'rgba(33, 150, 243, 0.3)';
        strokeColor = isActive ? 'rgba(33, 150, 243, 1.0)' : 'rgba(33, 150, 243, 0.8)';
    }
    
    // Draw the filled polygon
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    
    // Draw the polygon outline with the color
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = isActive ? 3 : 2; // Make active polygon's line thicker
    ctx.stroke();
    
    // Draw the points separately
    drawPolygonPoints(points, isActive);
}

// Draw the points of a polygon
function drawPolygonPoints(points, isActive = false) {
    if (!points || points.length === 0) return;
    
    const pointRadius = isActive ? 7 : 5; // Larger radius for active polygon points
    
    // Only allow showing checkmark/highlighting for the first point of the current drawing
    // not for completed polygons
    const isCurrentDrawing = isDrawing && !isActive;
    
    for (let i = 0; i < points.length; i++) {
        ctx.beginPath();
        
        // Make the first point more prominent for active drawings
        if (i === 0 && isCurrentDrawing && points.length > 2) {
            const x = points[i].x;
            const y = points[i].y;
            
            // Check if hovering over the first point
            if (isHoveringFirstPoint) {
                // Draw check mark icon with larger, highlighted circle
                const size = 10;
                
                // Background circle
                ctx.arc(x, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(76, 175, 80, 0.9)';
                ctx.fill();
                
                // Checkmark
                ctx.beginPath();
                ctx.moveTo(x - size/2, y);
                ctx.lineTo(x - size/6, y + size/2);
                ctx.lineTo(x + size/2, y - size/3);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
            } else {
                // Draw a larger, more noticeable first point
                ctx.arc(x, y, 7, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(76, 175, 80, 0.8)';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = 'white';
                ctx.stroke();
            }
        } else {
            // Regular point - with larger size if it's an active polygon being edited
            const pointX = points[i].x;
            const pointY = points[i].y;
            
            ctx.arc(pointX, pointY, pointRadius, 0, Math.PI * 2);
            
            if (isActive) {
                // Highlight points of active polygon being edited
                ctx.fillStyle = 'rgba(255, 255, 255, 1.0)';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.strokeStyle = '#fff';
            }
            
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }
}

// Clear the current drawing or the last completed polygon
function clearDrawing() {
    // If we're in the middle of drawing, just clear the current points
    if (isDrawing && polygonPoints.length > 0) {
        // Reset drawing state
        isDrawing = false;
        polygonPoints = [];
        isHoveringFirstPoint = false;
        selectedPointIndex = -1;
        isDraggingPoint = false;
        
        // Hide the magnifier
        hideMagnifier();
        
        // Update instructions
        updateInstructions('Click a corner of your roof to start drawing.');
    } 
    // If we're not actively drawing but have completed polygons, remove the last one
    else if (polygonAreas.length > 0) {
        // Remove the most recently added polygon
        polygonAreas.pop();
        
        // Update the roof summary
        updateRoofSummary();
        
        // Update instructions
        updateInstructions('Last roof area cleared. Click to start drawing again.');
    }
    
    // Redraw the canvas to show remaining polygons
    redrawPolygons();
    
    // Update UI buttons
    if (polygonAreas.length > 0) {
        document.getElementById('add-roof-btn').disabled = false;
        document.getElementById('done-btn').disabled = false;
    } else {
        document.getElementById('add-roof-btn').disabled = true;
        document.getElementById('done-btn').disabled = true;
        document.querySelector('.draw-status').style.display = 'none';
    }
}

// Clear all roofs and reset the application
function clearAllRoofs() {
    // Clear all roofs
    polygonAreas = [];
    activePolygonIndex = -1;
    isDrawing = false;
    polygonPoints = [];
    isHoveringFirstPoint = false;
    selectedPointIndex = -1;
    isDraggingPoint = false;
    
    // Hide the magnifier
    hideMagnifier();
    
    redrawPolygons();
    updateInstructions('Click a corner of your roof to start drawing.');
    document.getElementById('add-roof-btn').disabled = true;
    document.getElementById('done-btn').disabled = true;
    document.querySelector('.draw-status').style.display = 'none';
    document.querySelector('.roof-summary').style.display = 'none';
    
    // Reset polygon color to default green
    currentPolygonColor = 'green';
}

// Add another roof section
function addAnotherRoof() {
    // Set a different color for the next polygon
    if (currentPolygonColor === 'green') {
        currentPolygonColor = 'purple';
    } else if (currentPolygonColor === 'purple') {
        currentPolygonColor = 'orange';
    } else {
        currentPolygonColor = 'blue';
    }
    
    // Ready to draw again
    isDrawing = true;
    polygonPoints = [];
    isHoveringFirstPoint = false;
    
    // Reset active polygon index so we don't think we're editing
    activePolygonIndex = -1;
    
    updateInstructions('Click to start drawing another roof section.');
    
    // Make sure the drawing panel is visible and not in completed state
    const drawingPanel = document.getElementById('drawing-panel');
    if (drawingPanel) {
        drawingPanel.classList.remove('completed');
        drawingPanel.style.setProperty('display', 'flex', 'important');
    }
    
    // If roof summary is showing, hide it temporarily
    const roofSummary = document.querySelector('.roof-summary');
    if (roofSummary) {
        roofSummary.style.setProperty('display', 'none', 'important');
    }
    
    // Hide the draw-status div
    const drawStatus = document.querySelector('.draw-status');
    if (drawStatus) {
        drawStatus.style.setProperty('display', 'none', 'important');
    }
    
    // Show the draw-first-sec div
    const drawFirstSec = document.querySelector('.draw-first-sec');
    if (drawFirstSec) {
        drawFirstSec.style.setProperty('display', 'block', 'important');
    }
    
    // Show the clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.style.setProperty('display', 'block', 'important');
    }
}

// Calculate polygon properties like area and estimated panels
function calculatePolygonProperties(polygon) {
    // Make sure the polygon object exists
    if (!polygon) {
        console.error("Cannot calculate properties for undefined polygon");
        return;
    }
    
    // Hide the draw-first-sec section
    const drawFirstSec = document.querySelector('.draw-first-sec');
    if (drawFirstSec) {
        drawFirstSec.style.display = 'none';
    }
    
    // Calculate properties (simplified for user experience)
    const pixelsToMeters = 0.1; // Simple conversion ratio
    
    // Calculate area using Shoelace formula (Gauss's area formula)
    let area = 0;
    const points = polygon.points;
    
    // Make sure we have valid points before calculating
    if (!points || points.length < 3) {
        console.error("Cannot calculate area for polygon with less than 3 points");
        polygon.areaPixels = 0;
        polygon.areaMeters = 0;
        polygon.estimatedPanels = 0; // Ensure this is set to 0 not undefined
        polygon.systemSizeKW = 0;
        polygon.dailyProductionKWh = 0;
        polygon.annualProductionKWh = 0;
        polygon.annualCO2OffsetKg = 0;
        return;
    }
    
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    area = Math.abs(area) / 2;
    
    polygon.areaPixels = area;
    polygon.areaMeters = area * Math.pow(pixelsToMeters, 2);
    
    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
    }
    
    polygon.boundingBox = {
        minX, minY, maxX, maxY,
        width: maxX - minX,
        height: maxY - minY
    };
    
    // SIMPLIFIED PANEL CALCULATION - This ensures it works for the first roof
    // Very basic calculation: approximately 1 panel per 2 square meters
    const roofArea = Math.max(1, polygon.areaMeters);
    polygon.estimatedPanels = Math.max(1, Math.floor(roofArea * 0.5));
    
    // Set system size and production values
    polygon.systemSizeKW = (polygon.estimatedPanels * 350) / 1000;
    polygon.dailyProductionKWh = polygon.systemSizeKW * 4.5 * 0.8;
    polygon.annualProductionKWh = polygon.dailyProductionKWh * 365;
    polygon.annualCO2OffsetKg = polygon.annualProductionKWh * 0.5;
    
    // Force immediate recalculation for the first roof
    if (polygonAreas.length === 0) {
        // Set default orientation values
        polygon.orientation = 'landscape';
        polygon.angle = 20;
        polygon.azimuth = 180;
    }
    
    console.log("Calculated polygon properties:", {
        areaMeters: polygon.areaMeters,
        estimatedPanels: polygon.estimatedPanels,
        panelsSetDirectly: true
    });
    
    return polygon;
}

// Check if a point is inside a polygon
function isPointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x;
        const yi = points[i].y;
        const xj = points[j].x;
        const yj = points[j].y;
        
        const intersect = ((yi > y) !== (yj > y)) && 
                          (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

function generateRoofLayoutScreenshot() {
    // Create a temporary canvas for the screenshot
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Set canvas size to match the container
    const container = document.getElementById('canvas-screenshot-container');
    tempCanvas.width = container.offsetWidth;
    tempCanvas.height = container.offsetHeight;
    
    // Fill background
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw all polygons
    polygonAreas.forEach((polygon, index) => {
        // Scale points to fit the screenshot container
        const scaleX = tempCanvas.width / drawingCanvas.width;
        const scaleY = tempCanvas.height / drawingCanvas.height;
        
        // Draw polygon
        tempCtx.beginPath();
        polygon.points.forEach((point, i) => {
            const x = point.x * scaleX;
            const y = point.y * scaleY;
            
            if (i === 0) {
                tempCtx.moveTo(x, y);
            } else {
                tempCtx.lineTo(x, y);
            }
        });
        tempCtx.closePath();
        
        // Set color based on polygon index
        let fillColor;
        switch(index) {
            case 0: fillColor = 'rgba(37, 99, 235, 0.2)'; break; // blue
            case 1: fillColor = 'rgba(124, 58, 237, 0.2)'; break; // purple
            case 2: fillColor = 'rgba(245, 158, 11, 0.2)'; break; // orange
            default: fillColor = 'rgba(59, 130, 246, 0.2)'; // light blue
        }
        
        tempCtx.fillStyle = fillColor;
        tempCtx.fill();
        
        // Draw border
        tempCtx.strokeStyle = fillColor.replace('0.2', '0.8');
        tempCtx.lineWidth = 2;
        tempCtx.stroke();
        
        // Add roof number
        const center = calculatePolygonCenter(polygon.points);
        const centerX = center.x * scaleX;
        const centerY = center.y * scaleY;
        
        tempCtx.fillStyle = fillColor.replace('0.2', '0.8');
        tempCtx.font = 'bold 16px Inter';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(`Roof ${index + 1}`, centerX, centerY);
    });
    
    // Add the canvas to the container
    container.innerHTML = '';
    container.appendChild(tempCanvas);
}

function calculatePolygonCenter(points) {
    let sumX = 0;
    let sumY = 0;
    points.forEach(point => {
        sumX += point.x;
        sumY += point.y;
    });
    return {
        x: sumX / points.length,
        y: sumY / points.length
    };
}

function completeDrawing() {
    if (polygonPoints.length < 3) {
        alert('Please draw at least 3 points to complete the roof outline.');
        return;
    }
    
    // Complete the current polygon
    completePolygon();
    
    // Show the roof summary
    const roofSummary = document.getElementById('roof-summary');
    if (roofSummary) {
        roofSummary.style.setProperty('display', 'block', 'important');
    }
    
    // Hide the drawing panel with !important
    const drawingPanel = document.getElementById('drawing-panel');
    if (drawingPanel) {
        drawingPanel.style.setProperty('display', 'none', 'important');
    }
    
    // Enable the done button
    document.getElementById('done-btn').disabled = false;
    
    // Enable the add another roof button
    document.getElementById('add-roof-btn').disabled = false;
    
    // Trigger event to update roof details
    const event = new Event('roofSummaryUpdated');
    document.dispatchEvent(event);
    
    // Generate the roof layout screenshot
    generateRoofLayoutScreenshot();
    
    // Show success message
    const quoteSuccess = document.getElementById('quote-success');
    const getQuoteBtn = document.getElementById('get-quote-btn');
    
    if (quoteSuccess) {
        quoteSuccess.style.setProperty('display', 'block', 'important');
    }
    if (getQuoteBtn) {
        getQuoteBtn.style.setProperty('display', 'none', 'important');
    }
}

// Add this function to show the drawing panel when editing
function showDrawingPanel() {
    document.getElementById('drawing-panel').style.setProperty('display', 'flex', 'important');
    document.getElementById('roof-summary').style.display = 'none';
}

// Modify the editRoof function to show the drawing panel
function editRoof(index) {
    if (index < 0 || index >= polygonAreas.length) {
        console.error("Invalid roof index to edit");
        return;
    }
    
    // Check if we're already in drawing mode
    if (isDrawing) {
        if (confirm("You have an unfinished roof drawing. Discard it and edit this roof instead?")) {
            // Clear the current drawing
            polygonPoints = [];
        } else {
            return;
        }
    }
    
    // Set the active polygon index to the one being edited
    activePolygonIndex = index;
    
    // Hide the roof summary temporarily while editing
    const roofSummary = document.querySelector('.roof-summary');
    if (roofSummary) {
        roofSummary.style.setProperty('display', 'none', 'important');
    }
    
    // Make the drawing panel visible again
    const drawingPanel = document.getElementById('drawing-panel');
    if (drawingPanel) {
        drawingPanel.style.setProperty('display', 'flex', 'important');
        drawingPanel.classList.remove('completed');
    }
    
    // Update UI and instructions
    updateInstructions('Editing roof #' + (index + 1) + '. Drag the points to adjust the shape, then click Done.');
    
    // Show the clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.style.setProperty('display', 'block', 'important');
    }
    
    // Show the draw status and enable buttons
    const drawStatus = document.querySelector('.draw-status');
    if (drawStatus) {
        drawStatus.style.setProperty('display', 'block', 'important');
    }
    
    // Update the canvas to highlight the active polygon
    redrawPolygons();
}