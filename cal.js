let layoutPreviewCanvas;
let previewCtx;

document.addEventListener('DOMContentLoaded', function() {
    setupLayoutPreviewCanvas();
});

function setupLayoutPreviewCanvas() {
    layoutPreviewCanvas = document.getElementById('layout-preview-canvas');
    layoutPreviewCanvas.width = layoutPreviewCanvas.offsetWidth;
    layoutPreviewCanvas.height = layoutPreviewCanvas.offsetHeight;
    previewCtx = layoutPreviewCanvas.getContext('2d');
}

function calculatePolygonProperties(polygon) {
    const pixelsToMeters = getPixelsToMetersRatio();
    let area = 0;
    const points = polygon.points;
    
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }
    area = Math.abs(area) / 2;
    
    polygon.areaPixels = area;
    polygon.areaMeters = area * Math.pow(pixelsToMeters, 2);
    
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
    
    calculatePanelFit(polygon);
}

function calculatePanelFit(polygon) {
    const panelWidth = CONFIG.PANEL_WIDTH;
    const panelHeight = CONFIG.PANEL_HEIGHT;
    const spacing = CONFIG.PANEL_SPACING;
    
    let effectiveWidth = polygon.orientation === 'landscape' ? panelWidth : panelHeight;
    let effectiveHeight = polygon.orientation === 'landscape' ? panelHeight : panelWidth;
    
    const pixelsToMeters = getPixelsToMetersRatio();
    const panelWidthPx = effectiveWidth / pixelsToMeters;
    const panelHeightPx = effectiveHeight / pixelsToMeters;
    const spacingPx = spacing / pixelsToMeters;
    
    const bb = polygon.boundingBox;
    const availableWidthPx = bb.width;
    const availableHeightPx = bb.height;
    
    const panelsWide = Math.floor((availableWidthPx + spacingPx) / (panelWidthPx + spacingPx));
    const panelsHigh = Math.floor((availableHeightPx + spacingPx) / (panelHeightPx + spacingPx));
    
    let estimatedPanels = panelsWide * panelsHigh;
    
    const rectangleArea = bb.width * bb.height;
    const areaRatio = polygon.areaPixels / rectangleArea;
    estimatedPanels = Math.floor(estimatedPanels * areaRatio);
    
    polygon.panelLayout = {
        panelsWide,
        panelsHigh,
        estimatedPanels,
        panelWidthPx,
        panelHeightPx,
        spacingPx
    };
    
    const panelPower = CONFIG.PANEL_POWER;
    polygon.systemSizeKW = (estimatedPanels * panelPower) / 1000;
    
    calculateEnergyProduction(polygon);
}

function calculateEnergyProduction(polygon) {
    const roofAngle = polygon.angle;
    const roofAzimuth = polygon.azimuth;
    
    let angleFactor = 1 - Math.abs(roofAngle - 30) / 60;
    angleFactor = Math.max(0.7, Math.min(1, angleFactor));
    
    let azimuthFactor = 1 - Math.abs(roofAzimuth - 180) / 180;
    azimuthFactor = Math.max(0.7, Math.min(1, azimuthFactor));
    
    const efficiencyFactor = angleFactor * azimuthFactor;
    
    const avgSunlightHours = CONFIG.AVERAGE_SUNLIGHT_HOURS;
    polygon.dailyProductionKWh = polygon.systemSizeKW * avgSunlightHours * efficiencyFactor;
    polygon.annualProductionKWh = polygon.dailyProductionKWh * 365;
    
    const kgCO2PerKWh = 0.5;
    polygon.annualCO2OffsetKg = polygon.annualProductionKWh * kgCO2PerKWh;
}

function calculateSolarPotential() {
    document.getElementById('results-panel').style.display = 'block';
    document.getElementById('results-panel').scrollIntoView({ behavior: 'smooth' });
    
    updateResults();
    
    if (activePolygonIndex !== -1) {
        drawPanelLayout(polygonAreas[activePolygonIndex]);
    } else if (polygonAreas.length > 0) {
        activePolygonIndex = 0;
        redrawPolygons();
        drawPanelLayout(polygonAreas[activePolygonIndex]);
    }
}

function drawPanelLayout(polygon) {
    previewCtx.clearRect(0, 0, layoutPreviewCanvas.width, layoutPreviewCanvas.height);
    
    if (!polygon || !polygon.panelLayout) return;
    
    const layout = polygon.panelLayout;
    const points = polygon.points;
    const bb = polygon.boundingBox;
    
    const canvasWidth = layoutPreviewCanvas.width;
    const canvasHeight = layoutPreviewCanvas.height;
    const padding = 20;
    
    const scaleX = (canvasWidth - 2 * padding) / bb.width;
    const scaleY = (canvasHeight - 2 * padding) / bb.height;
    const scale = Math.min(scaleX, scaleY);
    
    const transformedPoints = points.map(point => ({
        x: (point.x - bb.minX) * scale + padding,
        y: (point.y - bb.minY) * scale + padding
    }));
    
    previewCtx.beginPath();
    previewCtx.moveTo(transformedPoints[0].x, transformedPoints[0].y);
    for (let i = 1; i < transformedPoints.length; i++) {
        previewCtx.lineTo(transformedPoints[i].x, transformedPoints[i].y);
    }
    previewCtx.closePath();
    previewCtx.fillStyle = 'rgba(200, 200, 200, 0.5)';
    previewCtx.fill();
    previewCtx.strokeStyle = '#888';
    previewCtx.lineWidth = 2;
    previewCtx.stroke();
    
    const panelWidth = layout.panelWidthPx * scale;
    const panelHeight = layout.panelHeightPx * scale;
    const spacing = layout.spacingPx * scale;
    
    const gridWidth = layout.panelsWide;
    const gridHeight = layout.panelsHigh;
    
    const startX = (bb.minX + (bb.width - (gridWidth * (layout.panelWidthPx + layout.spacingPx))) / 2) * scale + padding;
    const startY = (bb.minY + (bb.height - (gridHeight * (layout.panelHeightPx + layout.spacingPx))) / 2) * scale + padding;
    
    let panelsDrawn = 0;
    
    for (let row = 0; row < gridHeight; row++) {
        for (let col = 0; col < gridWidth; col++) {
            const x = startX + col * (panelWidth + spacing);
            const y = startY + row * (panelHeight + spacing);
            
            const centerX = x + panelWidth / 2;
            const centerY = y + panelHeight / 2;
            
            const originalX = bb.minX + (centerX - padding) / scale;
            const originalY = bb.minY + (centerY - padding) / scale;
            
            if (isPointInPolygon(originalX, originalY, polygon.points)) {
                previewCtx.fillStyle = 'rgba(21, 101, 192, 0.8)';
                previewCtx.fillRect(x, y, panelWidth, panelHeight);
                
                previewCtx.strokeStyle = '#0D47A1';
                previewCtx.lineWidth = 1;
                previewCtx.strokeRect(x, y, panelWidth, panelHeight);
                
                panelsDrawn++;
            }
        }
    }
    
    if (panelsDrawn < polygon.panelLayout.estimatedPanels) {
        polygon.panelLayout.estimatedPanels = panelsDrawn;
        polygon.systemSizeKW = (panelsDrawn * CONFIG.PANEL_POWER) / 1000;
        calculateEnergyProduction(polygon);
    }
}

function updateResults() {
    let totalArea = 0;
    let totalPanels = 0;
    let totalSystemSize = 0;
    let totalDailyProduction = 0;
    let totalAnnualProduction = 0;
    let totalCO2Offset = 0;
    
    for (const polygon of polygonAreas) {
        totalArea += polygon.areaMeters;
        totalPanels += polygon.panelLayout.estimatedPanels;
        totalSystemSize += polygon.systemSizeKW;
        totalDailyProduction += polygon.dailyProductionKWh;
        totalAnnualProduction += polygon.annualProductionKWh;
        totalCO2Offset += polygon.annualCO2OffsetKg;
    }
    
    document.getElementById('roof-area').textContent = totalArea.toFixed(1);
    document.getElementById('panel-count').textContent = totalPanels;
    document.getElementById('system-size').textContent = totalSystemSize.toFixed(2);
    document.getElementById('daily-production').textContent = totalDailyProduction.toFixed(1);
    document.getElementById('annual-production').textContent = totalAnnualProduction.toFixed(0);
    document.getElementById('co2-offset').textContent = totalCO2Offset.toFixed(0);
}

function recalculateActiveArea() {
    if (activePolygonIndex !== -1) {
        polygonAreas[activePolygonIndex].orientation = document.getElementById('panel-orientation').value;
        polygonAreas[activePolygonIndex].angle = parseFloat(document.getElementById('panel-angle').value);
        polygonAreas[activePolygonIndex].azimuth = parseFloat(document.getElementById('roof-azimuth').value);
        
        calculatePolygonProperties(polygonAreas[activePolygonIndex]);
        
        if (document.getElementById('results-panel').style.display === 'block') {
            drawPanelLayout(polygonAreas[activePolygonIndex]);
            updateResults();
        }
    }
}

function getPixelsToMetersRatio() {
    return 0.1;
}