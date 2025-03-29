// roof-manager.js - Roof data and UI management functionality

// Complete the drawing process
function completeDrawing() {
    if (polygonAreas.length === 0) {
        alert('Please outline at least one roof area first.');
        return;
    }
    
    // Reset the active polygon so nothing remains selected
    activePolygonIndex = -1;
    
    // Hide drawing panel
    document.getElementById('drawing-panel').style.setProperty('display', 'none', 'important');

    // Show roof questions
    const roofQuestions = document.querySelector('.roof-questions');
    roofQuestions.style.display = 'flex';

    // Show only the pitch question initially
    document.getElementById('pitch-question').style.display = 'block';
    document.getElementById('direction-question').style.display = 'none';

    // Add event listeners for pitch options
    document.querySelectorAll('.pitch-option').forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all pitch options
            document.querySelectorAll('.pitch-option').forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            this.classList.add('selected');
            // Store the pitch value
            const selectedPitch = this.getAttribute('data-pitch');
            polygonAreas[polygonAreas.length - 1].pitch = selectedPitch;

            // Hide pitch question and show direction question
            document.getElementById('pitch-question').style.display = 'none';
            document.getElementById('direction-question').style.display = 'block';
        });
    });

    // Add event listeners for direction options
    document.querySelectorAll('.direction-option').forEach(button => {
        button.addEventListener('click', function() {
            // Remove selected class from all direction options
            document.querySelectorAll('.direction-option').forEach(btn => btn.classList.remove('selected'));
            // Add selected class to clicked button
            this.classList.add('selected');
            // Store the direction value
            const selectedDirection = this.getAttribute('data-direction');
            polygonAreas[polygonAreas.length - 1].direction = selectedDirection;

            // Hide roof questions
            roofQuestions.style.display = 'none';
            
            // Show results summary
            document.querySelector('.roof-summary').style.display = 'block';
            document.getElementById('get-quote-btn').style.display = 'block';

            // Update the roof summary with the new details
            updateRoofSummary();

            // Generate screenshot
            generateScreenshot();
        });
    });
}

// Helper function to generate screenshot
function generateScreenshot() {
    const mapContainer = document.getElementById('map-container');
    const drawingCanvas = document.getElementById('drawing-canvas');
    const screenshotContainer = document.getElementById('canvas-screenshot-container');
    
    if (!mapContainer || !drawingCanvas || !screenshotContainer) {
        console.error('Required elements not found');
        return;
    }
    
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = mapContainer.offsetWidth + 'px';
    tempDiv.style.height = mapContainer.offsetHeight + 'px';
    document.body.appendChild(tempDiv);
    
    // Clone only the map, excluding UI elements
    const mapClone = mapContainer.cloneNode(true);
    
    // Remove UI elements from map clone
    const compass = mapClone.querySelector('.compass');
    const magnifierInfo = mapClone.querySelector('.magnifier-info');
    const drawingPanel = mapClone.querySelector('.drawing-panel');
    if (compass) compass.remove();
    if (magnifierInfo) magnifierInfo.remove();
    if (drawingPanel) drawingPanel.remove();
    
    // Position the map clone
    mapClone.style.position = 'absolute';
    mapClone.style.top = '0';
    mapClone.style.left = '0';
    
    tempDiv.appendChild(mapClone);
    
    // Use html2canvas to capture the map first
    html2canvas(tempDiv, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 1,
        logging: false,
        onclone: function(clonedDoc) {
            // Ensure the map is fully loaded in the clone
            const clonedMap = clonedDoc.querySelector('#map-container');
            if (clonedMap && map) {
                clonedMap.style.visibility = 'visible';
                clonedMap.style.opacity = '1';
            }
        }
    }).then(function(mapCanvas) {
        // Create a new canvas to combine map and drawings
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = mapCanvas.width;
        finalCanvas.height = mapCanvas.height;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Draw the map first
        finalCtx.drawImage(mapCanvas, 0, 0);
        
        // Draw the current drawings on top
        finalCtx.drawImage(drawingCanvas, 0, 0);
        
        // Convert to data URL and create image element
        const dataUrl = finalCanvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        
        // Clear previous content and add new screenshot
        screenshotContainer.innerHTML = '';
        screenshotContainer.appendChild(img);
        
        // Clean up temporary elements
        document.body.removeChild(tempDiv);
    }).catch(function(error) {
        console.error('Error generating screenshot:', error);
        // Clean up temporary elements in case of error
        if (tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
        }
    });
    
    // Disable drawing
    document.getElementById('drawing-panel').classList.add('completed');
    updateInstructions('Roof drawing completed. Review your summary or get your quote.');
    
    // Redraw without any active polygon
    redrawPolygons();
}

// Update the roof summary information
function updateRoofSummary() {
    console.log("Updating roof summary with polygons:", polygonAreas);
    
    let totalArea = 0;
    let totalPanels = 0;
    
    // Recalculate all polygon properties to ensure accurate data
    for (const polygon of polygonAreas) {
        // Force recalculation
        calculatePolygonProperties(polygon);
        
        console.log("Polygon after calculation:", polygon);
        
        totalArea += polygon.areaMeters || 0;
        totalPanels += polygon.estimatedPanels || 0;
    }
    
    // Create a summary for each roof
    const summaryContainer = document.querySelector('.roof-details');
    summaryContainer.innerHTML = '';
    
    polygonAreas.forEach((polygon, index) => {
        const roofItem = document.createElement('div');
        roofItem.className = 'roof-item';
        
        // Choose color class based on polygon color
        let colorClass = 'green-roof';
        if (polygon.color === 'purple') colorClass = 'purple-roof';
        else if (polygon.color === 'orange') colorClass = 'orange-roof';
        else if (polygon.color === 'blue') colorClass = 'blue-roof';
        
        // Ensure values are defined and formatted properly
        const areaValue = (polygon.areaMeters || 0).toFixed(1);
        const panelsValue = polygon.estimatedPanels || 0;
        const pitchValue = polygon.pitch ? polygon.pitch.charAt(0).toUpperCase() + polygon.pitch.slice(1) : 'Not specified';
        const directionValue = polygon.direction || 'Not specified';
        
        console.log(`Roof ${index+1} - Area: ${areaValue}, Panels: ${panelsValue}, Pitch: ${pitchValue}, Direction: ${directionValue}`);
        
        // Only show delete button if there's more than one roof
        const deleteButton = polygonAreas.length > 1 
            ? `<button class="delete-btn" data-index="${index}"><i class="fas fa-trash"></i></button>`
            : '';
        
        roofItem.innerHTML = `
            <div class="roof-number">${index + 1}</div>
            <div class="roof-info-grid">
                <div class="roof-info">
                    <div class="roof-label"><i class="fas fa-ruler-combined"></i> Roof area</div>
                    <div class="roof-value">${areaValue} m²</div>
                </div>
                <div class="roof-info">
                    <div class="roof-label"><i class="fas fa-solar-panel"></i> Suitable for</div>
                    <div class="roof-value">${panelsValue} panels</div>
                </div>
                <div class="roof-info">
                    <div class="roof-label"><i class="fas fa-home"></i> Roof pitch</div>
                    <div class="roof-value">${pitchValue}</div>
                </div>
                <div class="roof-info">
                    <div class="roof-label"><i class="fas fa-compass"></i> Direction</div>
                    <div class="roof-value">${directionValue}</div>
                </div>
            </div>
            <div class="roof-actions">
                <button class="edit-btn" data-index="${index}"><i class="fas fa-edit"></i></button>
                ${deleteButton}
            </div>
        `;
        
        summaryContainer.appendChild(roofItem);
    });
    
    // Add total summary with safeguards against undefined values
    document.getElementById('total-area').textContent = totalArea.toFixed(1);
    document.getElementById('total-panels').textContent = totalPanels;
    
    // Add event listeners to edit/delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            editRoof(index);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            deleteRoof(index);
        });
    });
    
    // Update the buttons for add another roof as well
    const addRoofBtn = document.getElementById('add-3rd-roof');
    if (addRoofBtn) {
        addRoofBtn.removeEventListener('click', addAnotherRoof);
        addRoofBtn.addEventListener('click', addAnotherRoof);
    }
    
    // Dispatch an event to indicate the roof summary was updated
    // This allows other components to react to the update
    document.dispatchEvent(new CustomEvent('roofSummaryUpdated'));
}

// Edit an existing roof
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
    
    // For edit mode, we'll enter a special state rather than removing the polygon
    // This keeps the polygon intact while allowing point adjustments
    
    // Set the active polygon index to the one being edited
    activePolygonIndex = index;
    
    // Hide the roof summary temporarily while editing
    document.querySelector('.roof-summary').style.display = 'none';
    
    // Make the drawing panel visible again
    const drawingPanel = document.getElementById('drawing-panel');
    drawingPanel.style.setProperty('display', 'flex', 'important');
    drawingPanel.classList.remove('completed');
    
    // Update UI and instructions
    updateInstructions('Editing roof #' + (index + 1) + '. Drag the points to adjust the shape, then click Done.');
    document.getElementById('clear-btn').style.display = 'block';
    
    // Show the draw status and enable buttons
    const drawStatus = document.querySelector('.draw-status');
    drawStatus.style.display = 'block';
    
    // Update the canvas to highlight the active polygon
    redrawPolygons();
}

// Delete a roof
function deleteRoof(index) {
    if (confirm('Are you sure you want to delete this roof?')) {
        polygonAreas.splice(index, 1);
        
        if (polygonAreas.length === 0) {
            clearAllRoofs();
        } else {
            redrawPolygons();
            updateRoofSummary();
        }
    }
}

// Submit the quote request
window.getQuote = function() {
    // Get the map container and drawing canvas
    const mapContainer = document.getElementById('map-container');
    const drawingCanvas = document.getElementById('drawing-canvas');
    const screenshotContainer = document.getElementById('canvas-screenshot-container');
    
    if (!mapContainer || !drawingCanvas || !screenshotContainer) {
        console.error('Required elements not found');
        return;
    }
    
    // Create a temporary container
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = mapContainer.offsetWidth + 'px';
    tempDiv.style.height = mapContainer.offsetHeight + 'px';
    document.body.appendChild(tempDiv);
    
    // Clone only the map, excluding UI elements
    const mapClone = mapContainer.cloneNode(true);
    
    // Remove UI elements from map clone
    const compass = mapClone.querySelector('.compass');
    const magnifierInfo = mapClone.querySelector('.magnifier-info');
    const drawingPanel = mapClone.querySelector('.drawing-panel');
    if (compass) compass.remove();
    if (magnifierInfo) magnifierInfo.remove();
    if (drawingPanel) drawingPanel.remove();
    
    // Position the map clone
    mapClone.style.position = 'absolute';
    mapClone.style.top = '0';
    mapClone.style.left = '0';
    
    tempDiv.appendChild(mapClone);
    
    // Use html2canvas to capture the map first
    html2canvas(tempDiv, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 1,
        logging: false,
        onclone: function(clonedDoc) {
            // Ensure the map is fully loaded in the clone
            const clonedMap = clonedDoc.querySelector('#map-container');
            if (clonedMap && map) {
                clonedMap.style.visibility = 'visible';
                clonedMap.style.opacity = '1';
            }
        }
    }).then(function(mapCanvas) {
        // Create a new canvas to combine map and drawings
        const finalCanvas = document.createElement('canvas');
        finalCanvas.width = mapCanvas.width;
        finalCanvas.height = mapCanvas.height;
        const finalCtx = finalCanvas.getContext('2d');
        
        // Draw the map first
        finalCtx.drawImage(mapCanvas, 0, 0);
        
        // Draw the current drawings on top
        finalCtx.drawImage(drawingCanvas, 0, 0);
        
        // Convert to data URL and create image element
        const dataUrl = finalCanvas.toDataURL('image/png');
        const img = document.createElement('img');
        img.src = dataUrl;
        
        // Clear previous content and add new screenshot
        screenshotContainer.innerHTML = '';
        screenshotContainer.appendChild(img);
        
        // Clean up temporary elements
        document.body.removeChild(tempDiv);
        
        // Show success message
        const quoteSuccess = document.getElementById('quote-success');
        const getQuoteBtn = document.getElementById('get-quote-btn');
        if (quoteSuccess) quoteSuccess.style.display = 'block';
        if (getQuoteBtn) getQuoteBtn.style.display = 'none';
    }).catch(function(error) {
        console.error('Error generating screenshot:', error);
        // Clean up temporary elements in case of error
        if (tempDiv.parentNode) {
            document.body.removeChild(tempDiv);
        }
    });
}

// Calculate total system size for all roofs
function calculateTotalSystemSize() {
    let totalSystemSize = 0;
    
    for (const polygon of polygonAreas) {
        if (polygon.systemSizeKW) {
            totalSystemSize += polygon.systemSizeKW;
        }
    }
    
    return totalSystemSize.toFixed(2);
}

// Calculate total annual production for all roofs
function calculateTotalAnnualProduction() {
    let totalProduction = 0;
    
    for (const polygon of polygonAreas) {
        if (polygon.annualProductionKWh) {
            totalProduction += polygon.annualProductionKWh;
        }
    }
    
    return Math.round(totalProduction);
}