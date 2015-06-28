var element = $('#dicomImage').get(0);

// Get image information from DOM
var imgdata = $('#image-data').get(0).dataset;
var imageID = imgdata.id;
var numSlices = parseInt(imgdata.numslices);
var imageName = imgdata.name;
var baseName = imgdata.basename;

// Set up stack
var imageIds = [];
for (var i=1; i < numSlices+1; i++) {
    imageIds.push("dicomweb:img/" + imageName + "/CT/" + baseName + "." + i + ".dcm");
};

var stack = {
    currentImageIdIndex : 40,
    imageIds: imageIds
};

var stackContours = new Array(numSlices);
for (var i=0; i<numSlices; i++) {
    stackContours[i] = new Array;
}

// Grab the stack of contours upfront and sort them by z
$.get("contours.php", {imageID: imageID}).done(function(data) {
    var contours = $.parseJSON(data);
        
    for (var i=0; i<contours.length; i++) {
        c = contours[i];

        // Clean up the JSON
        c.points = c.points.split(",").map(Number);
        c.color = c.color.split(",").map(Number);
        c.sliceIndex = parseInt(c.sliceIndex);

        // Store it in the stack sorted by z index
        stackContours[c.sliceIndex-1].push(c);
    }

    // Now that we have the whole stack
    // Setup the image
    setupImage();
});

// Enable the dicomImage element
cornerstone.enable(element);

function setupImage() {
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
        cornerstoneTools.stackScrollWheel.activate(element);

        cornerstoneTools.pan.activate(element, 1);
        // cornerstoneTools.wwwc.activate(element, 1);
        // cornerstoneTools.zoomWheel.activate(element);
        // cornerstoneTools.zoom.activate(element, 2);

        // Set default zoom scale
        viewport = cornerstone.getViewport(element);
        viewport.scale = 2.5;
        cornerstone.setViewport(element, viewport);
    });
}

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
    ctx.closePath();
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

    // Get existing contour and draw it
    contours = stackContours[stack.currentImageIdIndex];
    drawContours(contours, ctx);
});

// Image text
function onViewportUpdated(e, data) {
    var viewport = data.viewport;
    $('#wwwcText').text("WW/WC: " + Math.round(viewport.voi.windowWidth) + "/" + Math.round(viewport.voi.windowCenter));
    $('#zoomText').text("Zoom: " + viewport.scale.toFixed(2));
    $("#sliceText").text("Image: " + (stack.currentImageIdIndex + 1) + "/" + numSlices);
};
$(element).on("CornerstoneImageRendered", onViewportUpdated);

// Toolbar
$("#zoom-in").click(function() {
    viewport = cornerstone.getViewport(element);
    viewport.scale += 0.5;
    cornerstone.setViewport(element, viewport);
});

$("#zoom-out").click(function() {
    viewport = cornerstone.getViewport(element);
    viewport.scale -= 0.5;
    cornerstone.setViewport(element, viewport);
});  

$("#pan").click(function() {
    cornerstoneTools.pan.activate(element, 1);
    cornerstoneTools.wwwc.deactivate(element, 1);
});

$("#wwwc").click(function() {
    cornerstoneTools.pan.deactivate(element, 1);
    cornerstoneTools.wwwc.activate(element, 1);
});

$(function(){
    $("[data-toggle='tooltip']").tooltip();
});
