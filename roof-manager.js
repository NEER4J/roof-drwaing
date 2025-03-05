// roof-manager.js - Roof data and UI management functionality

// Complete the drawing process
function completeDrawing() {
    if (polygonAreas.length === 0) {
        alert('Please outline at least one roof area first.');
        return;
    }
    
    // Reset the active polygon so nothing remains selected
    activePolygonIndex = -1;
    
    // Show results summary
    document.querySelector('.roof-summary').style.display = 'block';
    document.getElementById('get-quote-btn').style.display = 'block';
    
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
        
        console.log(`Roof ${index+1} - Area: ${areaValue}, Panels: ${panelsValue}`);
        
        roofItem.innerHTML = `
            <div class="roof-thumbnail ${colorClass}">
                <div class="roof-number">${index + 1}</div>
            </div>
            <div class="roof-info">
                <div class="roof-label">Roof area</div>
                <div class="roof-value">${areaValue} m²</div>
            </div>
            <div class="roof-info">
                <div class="roof-label">Suitable for</div>
                <div class="roof-value">${panelsValue} panels</div>
            </div>
            <div class="roof-actions">
                <button class="edit-btn" data-index="${index}">✏️</button>
                <button class="delete-btn" data-index="${index}">🗑️</button>
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
    drawingPanel.style.display = 'block';
    drawingPanel.classList.remove('completed');
    
    // Update UI and instructions
    updateInstructions('Editing roof #' + (index + 1) + '. Drag the points to adjust the shape, then click Done.');
    document.getElementById('clear-btn').style.display = 'block';
    
    // Show the draw status and enable buttons
    const drawStatus = document.querySelector('.draw-status');
    drawStatus.style.display = 'block';
    document.getElementById('done-btn').disabled = false;
    document.getElementById('add-roof-btn').disabled = true; // Disable during edit
    
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
function getQuote() {
    // You would typically send the data to a server here
    // For now we just show a success message
    document.getElementById('quote-success').style.display = 'block';
    document.getElementById('get-quote-btn').style.display = 'none';
    
    // Prepare data for submission
    const quoteData = {
        address: document.getElementById('address-input').value,
        roofs: polygonAreas.map((polygon, index) => ({
            id: index + 1,
            area: polygon.areaMeters.toFixed(1),
            estimatedPanels: polygon.estimatedPanels,
            systemSizeKW: polygon.systemSizeKW ? polygon.systemSizeKW.toFixed(2) : "0.00",
            annualProductionKWh: polygon.annualProductionKWh ? Math.round(polygon.annualProductionKWh) : 0,
            annualCO2OffsetKg: polygon.annualCO2OffsetKg ? Math.round(polygon.annualCO2OffsetKg) : 0
        })),
        totalArea: parseFloat(document.getElementById('total-area').textContent),
        totalPanels: parseInt(document.getElementById('total-panels').textContent),
        totalSystemSize: calculateTotalSystemSize(),
        totalAnnualProduction: calculateTotalAnnualProduction()
    };
    
    console.log('Quote data ready for submission:', quoteData);
    
    // You would typically do something like this:
    // fetch('/api/submit-quote', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //     },
    //     body: JSON.stringify(quoteData),
    // })
    // .then(response => response.json())
    // .then(data => {
    //     console.log('Success:', data);
    // })
    // .catch((error) => {
    //     console.error('Error:', error);
    // });
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