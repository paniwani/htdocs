function pad(num, size) { 
    return ('000000000' + num).substr(-size); 
}

function drawContour(points, color, ctx, highlight) {

    if (typeof(highlight)==='undefined') highlight = false;

    ctx.lineWidth = 1;

    ctx.strokeStyle = "rgba(" + color.join(",") + ", 1)";

    for (var i=0; i < points.length; i+=2) {
        x = points[i];
        y = points[i+1];

        if (i == 0) {
            ctx.beginPath();
            ctx.moveTo(x, y); // Start the contour
        } else {
            ctx.lineTo(x, y); // Draw each line
        }
    };

    ctx.closePath();
    ctx.stroke();

    if (highlight == true) {
        ctx.fillStyle = "rgba(" + color.join(",") + ", 0.5)";
        ctx.fill();
    }
}

function drawContours(contours, ctx) {
    for (var i=0; i<contours.length; i++) {
        c = contours[i];
        regionId = c.region_id;

        if (!_.contains(ignoreRegions, regionId)) {
            highlightFlag = (regionId == hoverRegion) || _.contains(highlightedRegions, regionId);
            drawContour(c.points, c.color, ctx, highlightFlag);
        }
    } 
}