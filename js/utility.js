function pad(num, size) { 
    return ('000000000' + num).substr(-size); 
}

jQuery.fn.visibilityToggle = function() {
    return this.css('visibility', function(i, visibility) {
        return (visibility == 'visible') ? 'hidden' : 'visible';
    });
};

function drawContour(points, color, ctx, highlight) {

    if (typeof(highlight)==='undefined') highlight = false;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(" + color + ", 1)";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (var i=1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y); // Draw each line
    }

    ctx.closePath();
    ctx.stroke();

    if (highlight == true) {
        ctx.fillStyle = "rgba(" + color + ", 0.5)";
        ctx.fill();
    }
}

function drawContours(ctx, contours, ignoreRegions, highlightedRegions, hoverRegion) {
    for (var i=0; i<contours.length; i++) {
        var c = contours[i];
        var regionId = c.ROINumber;

        var hoverFlag = (regionId == hoverRegion);

        if (!_.contains(ignoreRegions, regionId) || hoverFlag ) {
            highlightFlag = hoverFlag || _.contains(highlightedRegions, regionId);
            drawContour(c.points, c.color, ctx, highlightFlag);
        }
    } 
}

function drawDose(ctx, colormap, threshold, max) {
    var doseImageObject = cornerstone.getImage(doseElement);
    if (doseImageObject === undefined) return;
    var canvasDose = doseImageObject.getCanvas();
    var ctxDose = canvasDose.getContext("2d");

    // Dose is only relevant within a certain region of the image
    var d = ctxDose.getImageData(81, 81, 350, 350); 

    var min = 0;

    for (var i = 0; i < d.data.length; i += 4) {

        // Threshold dose color image
        if (d.data[i] < threshold) {
            d.data[i+3] = 0; // Transparent
            continue;
        }

        var f = parseFloat(d.data[i] - min) / (max - min);
        if (f < 0) { f = 0; }
        f = Math.round(f * (colormap.length-1));
        
        d.data[i]     = colormap[f][0]
        d.data[i+1]   = colormap[f][1]
        d.data[i+2]   = colormap[f][2]
        d.data[i+3]   = 150; // alpha on scale 0-255
    }

    var canvasTemp = $("#canvasTemp").get(0);
    var ctxTemp = canvasTemp.getContext("2d");
    ctxTemp.putImageData(d, 81, 81);

    ctx.drawImage(canvasTemp, 0, 0);
}

function drawPET(ctx, colormap) {
    var petImageObject = cornerstone.getImage(petElement);
    if (petImageObject === undefined) return;
    var canvasPet = petImageObject.getCanvas();
    var ctxPet = canvasPet.getContext("2d");

    var d = ctxPet.getImageData(0, 0, canvasPet.width, canvasPet.height);

    max = 255;
    min = 0;

    for (var i = 0; i < d.data.length; i += 4) {

        var f = parseFloat(d.data[i] - min) / (max - min);
        if (f < 0) { f = 0; }
        f = Math.round(f * (colormap.length-1));
        
        d.data[i]     = colormap[f][0]
        d.data[i+1]   = colormap[f][1]
        d.data[i+2]   = colormap[f][2]
        d.data[i+3]   = 150; // alpha on scale 0-255
    }

    var canvasTemp = $("#canvasTemp").get(0);
    var ctxTemp = canvasTemp.getContext("2d");
    ctxTemp.putImageData(d, 0, 0);

    ctx.drawImage(canvasTemp, 0, 0);

}

function drawMRI(ctx) {
    var mrImageObject = cornerstone.getImage(mrElement);
    if (mrImageObject === undefined) return;
    var mrCanvas = mrImageObject.getCanvas();
    var mrCtx = mrCanvas.getContext("2d");

    var d = mrCtx.getImageData(0, 0, mrCanvas.width, mrCanvas.height);

    for (var i = 0; i < d.data.length; i += 4) {
        d.data[i+3]   = 220; // alpha on scale 0-255
    }

    var canvasTemp = $("#canvasTemp").get(0);
    var ctxTemp = canvasTemp.getContext("2d");
    ctxTemp.putImageData(d, 0, 0);

    ctx.drawImage(canvasTemp, 0, 0);
}






























