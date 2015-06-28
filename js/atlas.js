var element = $('#dicomImage').get(0);

var imageIds = [];
var NUM_SLICES = 206;

for (var i=1; i < NUM_SLICES+1; i++) {
    imageIds.push("dicomweb:img/BP_30056267/CT/CT.1.2.840.113619.2.55.3.346865037.294.1409320864.82." + i + ".dcm");
};

var stack = {
    currentImageIdIndex : 40,
    imageIds: imageIds
};

var stackContours = new Array(NUM_SLICES);

// Enable the dicomImage element
cornerstone.enable(element);

cornerstone.loadAndCacheImage(imageIds[stack.currentImageIdIndex]).then(function(image) {
    // Display the image
    cornerstone.displayImage(element, image);

    // Enable mouse and keyboard inputs
    cornerstoneTools.keyboardInput.enable(element);
    cornerstoneTools.mouseInput.enable(element);
    cornerstoneTools.mouseWheelInput.enable(element);

    // Set the stack as tool state
    cornerstoneTools.addStackStateManager(element, ['stack']);
    cornerstoneTools.addToolState(element, 'stack', stack);

    // Set the div to focused, so keypress events are handled
    $(element).attr("tabindex", 0).focus();

    // Enable all tools we want to use with this element
    cornerstoneTools.stackScrollKeyboard.activate(element);
    // cornerstoneTools.stackScroll.activate(element, 1);
    // cornerstoneTools.stackScrollWheel.activate(element);

    // cornerstoneTools.pan.activate(element, 1);
    cornerstoneTools.wwwc.activate(element, 1);
    cornerstoneTools.zoomWheel.activate(element);
    cornerstoneTools.zoom.activate(element, 2);

    // Set default zoom scale
    viewport = cornerstone.getViewport(element);
    viewport.scale = 2.5;
    cornerstone.setViewport(element, viewport);
});

function drawContour(points, color, ctx) {
    // console.log('Drawing contour.');
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

    // Close the contour
    ctx.lineTo(points[0], points[1]);
    ctx.stroke();
};

function drawContours(contours, ctx) {
    for (var i=0; i<contours.length; i++) {
        c = contours[i];
        drawContour(c.points, c.color, ctx);
    } 
};

$(element).on("CornerstoneImageRendered", function(event, detail) {
    // console.log("Image rendereded event fired. Stack ID: " + stack.currentImageIdIndex);

    // Setup drawing and get canvas context
    cornerstone.setToPixelCoordinateSystem(detail.enabledElement, detail.canvasContext);  
    var ctx = detail.canvasContext;
    ctx.lineWidth = 1;

    // Get the contour for this slice from the server and draw it
    if (! stackContours[stack.currentImageIdIndex] ) {
        $.get("contours.php", {imageID: 1, sliceIndex: stack.currentImageIdIndex+1}).done(function(data) {
            var contours = $.parseJSON(data);
                
            // Map json back to arrays
            for (var i=0; i<contours.length; i++) {
                contours[i].points = contours[i].points.split(",").map(Number);
                contours[i].color = contours[i].color.split(",").map(Number);
            }

            stackContours[stack.currentImageIdIndex] = contours;
            drawContours(contours, ctx);
        });
    } else {
        // Get existing contour and draw it
        contours = stackContours[stack.currentImageIdIndex];
        drawContours(contours, ctx);
    }
});

function onViewportUpdated(e, data) {
    var viewport = data.viewport;
    $('#mrbottomleft').text("WW/WC: " + Math.round(viewport.voi.windowWidth) + "/" + Math.round(viewport.voi.windowCenter));
    $('#zoomText').text("Zoom: " + viewport.scale.toFixed(2));
    $("#sliceText").text("Image: " + (stack.currentImageIdIndex + 1) + "/" + NUM_SLICES);
};

$(element).on("CornerstoneImageRendered", onViewportUpdated);



























