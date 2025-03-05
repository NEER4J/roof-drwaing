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
let mapSnapshotCanvas;
let mapSnapshotCtx;
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
    
    // Check if we're clicking on an existing point in a drawn polygon
    if (!isDrawing && polygonAreas.length > 0) {
        // First check if we're clicking on a point in any completed polygon
        for (let polygonIndex = 0; polygonIndex < polygonAreas.length; polygonIndex++) {
            const points = polygonAreas[polygonIndex].points;
            for (let i = 0; i < points.length; i++) {
                const distance = Math.sqrt(Math.pow(points[i].x - x, 2) + Math.pow(points[i].y - y, 2));
                if (distance < 10) {  // If clicking within 10px of a point
                    selectedPointIndex = i;
                    activePolygonIndex = polygonIndex;
                    isDraggingPoint = true;
                    // Change cursor to indicate dragging
                    drawingCanvas.style.cursor = 'move';
                    return;
                }
            }
        }
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
            
            // Draw magnifier circle
            drawMagnifierCircle(x, y);
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
            
            // Draw magnifier circle
            drawMagnifierCircle(x, y);
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

// Draw a magnifier circle for precision
function initMapSnapshot() {
    mapSnapshotCanvas = document.createElement('canvas');
    mapSnapshotCtx = mapSnapshotCanvas.getContext('2d');
    
    // Size it to match the map container
    const mapContainer = document.getElementById('map-container');
    mapSnapshotCanvas.width = mapContainer.offsetWidth;
    mapSnapshotCanvas.height = mapContainer.offsetHeight;
}

// Capture the current state of the map
function captureMapSnapshot() {
    // Make sure we have a snapshot canvas
    if (!mapSnapshotCanvas) {
        initMapSnapshot();
    }
    
    // HTML2Canvas would be ideal here, but since we can't add external libraries,
    // we'll use a placeholder method
    
    // In a real implementation, you would use:
    // html2canvas(document.getElementById('map-container')).then(canvas => {
    //     mapSnapshotCtx.clearRect(0, 0, mapSnapshotCanvas.width, mapSnapshotCanvas.height);
    //     mapSnapshotCtx.drawImage(canvas, 0, 0);
    // });
    
    // Instead, we'll draw a simplified representation of the map
    mapSnapshotCtx.clearRect(0, 0, mapSnapshotCanvas.width, mapSnapshotCanvas.height);
    
    // Draw a simplified satellite-like map background
    const gridSize = 10;
    mapSnapshotCtx.fillStyle = '#1E5B1E'; // Base green for vegetation
    mapSnapshotCtx.fillRect(0, 0, mapSnapshotCanvas.width, mapSnapshotCanvas.height);
    
    // Add some texture with darker green patches
    mapSnapshotCtx.fillStyle = '#174217';
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * mapSnapshotCanvas.width;
        const y = Math.random() * mapSnapshotCanvas.height;
        const size = 20 + Math.random() * 30;
        mapSnapshotCtx.beginPath();
        mapSnapshotCtx.arc(x, y, size, 0, Math.PI * 2);
        mapSnapshotCtx.fill();
    }
    
    // Add some "buildings" as gray rectangles
    mapSnapshotCtx.fillStyle = '#555';
    for (let i = 0; i < 8; i++) {
        const x = Math.random() * mapSnapshotCanvas.width;
        const y = Math.random() * mapSnapshotCanvas.height;
        const width = 60 + Math.random() * 80;
        const height = 60 + Math.random() * 80;
        mapSnapshotCtx.fillRect(x, y, width, height);
    }
    
    // Add "roads" as light gray lines
    mapSnapshotCtx.strokeStyle = '#aaa';
    mapSnapshotCtx.lineWidth = 8;
    mapSnapshotCtx.beginPath();
    mapSnapshotCtx.moveTo(0, mapSnapshotCanvas.height / 2);
    mapSnapshotCtx.lineTo(mapSnapshotCanvas.width, mapSnapshotCanvas.height / 2);
    mapSnapshotCtx.stroke();
    
    mapSnapshotCtx.beginPath();
    mapSnapshotCtx.moveTo(mapSnapshotCanvas.width / 2, 0);
    mapSnapshotCtx.lineTo(mapSnapshotCanvas.width / 2, mapSnapshotCanvas.height);
    mapSnapshotCtx.stroke();
}

// Function to draw magnifier with map content
function drawMagnifierCircle(x, y) {
    // Capture current map state if we haven't already
    if (!mapSnapshotCanvas) {
        captureMapSnapshot();
    }
    
    // Draw zoom circle with an offset from the cursor
    const radius = 30;
    const zoomFactor = 2; // Magnification level
    
    // Add offset to position the magnifier to the top-right of the cursor
    const offsetX = 40;
    const offsetY = -40;
    
    // Adjusted position for the magnifier
    const magX = x + offsetX;
    const magY = y + offsetY;
    
    // Make sure the magnifier stays within canvas bounds
    const adjustedX = Math.min(Math.max(magX, radius), drawingCanvas.width - radius);
    const adjustedY = Math.min(Math.max(magY, radius), drawingCanvas.height - radius);
    
    // Save the current state
    ctx.save();
    
    // Create a circular clipping region for the magnifier
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY, radius, 0, Math.PI * 2);
    ctx.clip();
    
    // Clear the clipped area
    ctx.clearRect(adjustedX - radius, adjustedY - radius, radius * 2, radius * 2);
    
    // Draw the map snapshot (simplified representation)
    const sourceRadius = radius / zoomFactor;
    
    // Draw the map snapshot inside the magnifier circle
    ctx.drawImage(
        // Source is the map snapshot canvas
        mapSnapshotCanvas,
        // Source rectangle (the area around the cursor)
        x - sourceRadius, y - sourceRadius, 
        sourceRadius * 2, sourceRadius * 2,
        // Destination rectangle (the magnifier area)
        adjustedX - radius, adjustedY - radius, 
        radius * 2, radius * 2
    );
    
    // Draw any active polygon points that might be in the magnifier view
    if (polygonPoints.length > 0) {
        // Calculate the transformation for points inside the magnifier
        const transformPoint = (px, py) => {
            // Convert point coordinates to magnifier space
            const relativeX = px - (x - sourceRadius);
            const relativeY = py - (y - sourceRadius);
            
            // Scale by zoom factor
            const scaledX = relativeX * zoomFactor;
            const scaledY = relativeY * zoomFactor;
            
            // Offset to magnifier position
            return {
                x: adjustedX - radius + scaledX,
                y: adjustedY - radius + scaledY
            };
        };
        
        // Draw connection lines between points in the magnifier
        if (polygonPoints.length > 1) {
            ctx.beginPath();
            let firstPointInMag = false;
            let firstPointCoords = null;
            
            for (let i = 0; i < polygonPoints.length; i++) {
                const px = polygonPoints[i].x;
                const py = polygonPoints[i].y;
                const distanceFromCursor = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
                
                if (distanceFromCursor <= sourceRadius) {
                    const transformedPoint = transformPoint(px, py);
                    
                    if (!firstPointInMag) {
                        ctx.moveTo(transformedPoint.x, transformedPoint.y);
                        firstPointInMag = true;
                        firstPointCoords = transformedPoint;
                    } else {
                        ctx.lineTo(transformedPoint.x, transformedPoint.y);
                    }
                }
            }
            
            // Complete shape if needed
            if (firstPointInMag && isHoveringFirstPoint) {
                ctx.lineTo(firstPointCoords.x, firstPointCoords.y);
            }
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        // Draw polygon points that would appear in the magnifier area
        for (let i = 0; i < polygonPoints.length; i++) {
            const px = polygonPoints[i].x;
            const py = polygonPoints[i].y;
            
            // Check if point is within magnifier source area
            const distanceFromCursor = Math.sqrt(Math.pow(px - x, 2) + Math.pow(py - y, 2));
            if (distanceFromCursor <= sourceRadius) {
                // Transform point to magnifier space
                const transformedPoint = transformPoint(px, py);
                
                // Draw the point in the magnifier
                ctx.beginPath();
                ctx.arc(transformedPoint.x, transformedPoint.y, 5 * zoomFactor, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
            }
        }
    }
    
    // End the clipping and restore state
    ctx.restore();
    
    // Draw the circle border
    ctx.beginPath();
    ctx.arc(adjustedX, adjustedY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw crosshair inside the magnifier
    ctx.beginPath();
    ctx.moveTo(adjustedX - 5, adjustedY);
    ctx.lineTo(adjustedX + 5, adjustedY);
    ctx.moveTo(adjustedX, adjustedY - 5);
    ctx.lineTo(adjustedX, adjustedY + 5);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Draw a small indicator line connecting cursor to magnifier
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(adjustedX, adjustedY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
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
    
    // Draw connecting lines - we don't draw these here anymore
    // They're drawn in the drawPolygon function with proper colors
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
    }
    
    // If roof summary is showing, hide it temporarily
    const roofSummary = document.querySelector('.roof-summary');
    if (roofSummary && roofSummary.style.display !== 'none') {
        roofSummary.style.display = 'none';
    }
    
    // Show the clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'block';
    }
}

// Calculate polygon properties like area and estimated panels
// Calculate polygon properties like area and estimated panels
function calculatePolygonProperties(polygon) {
    // Make sure the polygon object exists
    if (!polygon) {
        console.error("Cannot calculate properties for undefined polygon");
        return;
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