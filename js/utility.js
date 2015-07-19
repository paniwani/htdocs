var colormap = require('colormap');
var cm = colormap( { colormap: "jet", nshades: 256, format: "rgba", alpha: 0.5 } );
cm.splice(-1, 1); cm.splice(0, 1);

function pad(num, size) { 
    return ('000000000' + num).substr(-size); 
}

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

function drawContours(contours, ctx) {
    for (var i=0; i<contours.length; i++) {
        var c = contours[i];
        var regionId = c.ROINumber;

        if (!_.contains(ignoreRegions, regionId)) {
            highlightFlag = (regionId == hoverRegion) || _.contains(highlightedRegions, regionId);
            drawContour(c.points, c.color, ctx, highlightFlag);
        }
    } 
}

function drawDose(ctx) {
    var doseImageObject = cornerstone.getImage(doseElement);
    if (doseImageObject === undefined) return;
    var canvasDose = doseImageObject.getCanvas();
    var ctxDose = canvasDose.getContext("2d");

    // Dose is only relevant within a certain region of the image
    var d = ctxDose.getImageData(81, 81, 350, 350); 

    var max = 80;
    var min = 0;
    for (var i = 0; i < d.data.length; i += 4) {
        var f = parseFloat(d.data[i] - min) / (max - min);
        if (f < 0) { f = 0; }
        f = Math.round(f * cm.length);
        
        d.data[i]     = cm[f][0]
        d.data[i+1]   = cm[f][1]
        d.data[i+2]   = cm[f][2]
        d.data[i+3]   = 150; // alpha on scale 0-255
    }

    var canvasTemp = $("#canvasTemp").get(0);
    var ctxTemp = canvasTemp.getContext("2d");
    ctxTemp.putImageData(d, 81, 81);

    ctx.drawImage(canvasTemp, 0, 0);
}






























