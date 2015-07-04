var element = $('#dicomImage').get(0);

// Get image information from DOM
var imgdata = $('#image-data').get(0).dataset;
var imageID = imgdata.id;
var numSlices = parseInt(imgdata.numslices);
var imageName = imgdata.name;
var baseName = imgdata.basename;

// Do not draw certain regions
var ignoreRegions = [];
var highlightedRegion = 0;

function pad(num, size){ return ('000000000' + num).substr(-size); }

// Set up stack
var imageIds = [];
for (var i=1; i < numSlices+1; i++) {
    // imageIds.push("dicomweb:img/" + imageName + "/CT_clean/" + baseName + "." + i + ".dcm");
    // imageIds.push("dicomweb:img/osirix/compressed/IM-0001-" + pad(i,4) + ".dcm")
    imageIds.push("http://45.55.10.4/atlas/img/osirix/jpg/IM-0001-" + pad(i,4) + ".jpg")
};

var stack = {
    currentImageIdIndex : 0,
    imageIds: imageIds
};



// Stack loading
var loadProgress = {"imageIds": stack.imageIds.slice(0),
                "total": stack.imageIds.length,
                "remaining": stack.imageIds.length,
                "percentLoaded": 0,
                };

function onImageLoaded (event, args){
    var imId = args.image.imageId;
    var imIds = loadProgress["imageIds"];

    // Remove all instances, in case the stack repeats imageIds
    for(var i = imIds.length - 1; i >= 0; i--) {
        if(imIds[i] === imId) {
           imIds.splice(i, 1);
        }
    }

    // Populate the load progress object
    loadProgress["remaining"] = imIds.length;
    loadProgress["percentLoaded"] = parseInt(100 - loadProgress["remaining"] / loadProgress["total"] * 100, 10);

    if ((loadProgress["remaining"] / loadProgress["total"]) === 0) {
        console.timeEnd("Stack Loading");
    }

    // Update progress bar in DOM
    var pb = $("#progress-bar");
    pb.attr("aria-valuenow", loadProgress["percentLoaded"]);
    pb.width(loadProgress["percentLoaded"] + "%");
    pb.html(loadProgress["percentLoaded"] + "%");
    $("#progressText").html("Loaded: " + (loadProgress["total"] - loadProgress["remaining"]) + "/" + loadProgress["total"] + " images");

    // When loading is complete, show the main content and hide the progress bar
    if (loadProgress["percentLoaded"] == 100) {
        $("#progressContainer").hide();
        $("#mainContainer").css("visibility", "visible");
    }

}
// Image loading events are bound to the cornerstone object, not the element
$(cornerstone).on("CornerstoneImageLoaded", onImageLoaded);

// Setup and get stack contours
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

    // Now that we have the whole contour stack
    // Setup the image
    setupImage();
});

function setupImage() {

    // Enable the dicomImage element
    console.time("Stack Loading");
    cornerstone.enable(element);


    cornerstone.loadImage(imageIds[stack.currentImageIdIndex]).then(function(image) {
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
        $(element).focus();

        // Enable all tools we want to use with this element
        cornerstoneTools.stackScrollKeyboard.activate(element);
        // cornerstoneTools.stackScroll.activate(element, 1);
        cornerstoneTools.stackScrollWheel.activate(element);

        // cornerstoneTools.pan.activate(element, 1);
        cornerstoneTools.wwwc.activate(element, 1);
        // cornerstoneTools.zoomWheel.activate(element);
        // cornerstoneTools.zoom.activate(element, 2);

        // Prefetch the whole stack
        cornerstoneTools.stackPrefetch.enable(element, 3);

        // Set default zoom
        viewport = cornerstone.getViewport(element);
        viewport.scale = 2.0;
        cornerstone.setViewport(element, viewport);
    });
}

$("#dicomImageWrapper").click(function() {
    $(element).focus();
});

function drawContour(points, color, ctx, highlight) {

    if (typeof(highlight)==='undefined') highlight = false;

    // console.log('Drawing contour.');

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

    // Close the contour
    ctx.closePath();
    ctx.stroke();

    if (highlight == true) {
        ctx.fillStyle = "rgba(" + color.join(",") + ", 0.5)";
        ctx.fill();
    }

    
};

function drawContours(contours, ctx) {

    for (var i=0; i<contours.length; i++) {
        c = contours[i];
        regionId = parseInt(c.region_id);

        if (!_.contains(ignoreRegions, regionId)) {

            if (regionId == highlightedRegion) {
                drawContour(c.points, c.color, ctx, true);
            } else {
                drawContour(c.points, c.color, ctx, false);
            }

            
        }
    } 
};

$(element).on("CornerstoneImageRendered", function(event, detail) {
    // console.log("Image rendereded event fired. Stack ID: " + stack.currentImageIdIndex);

    // Setup drawing and get canvas context
    cornerstone.setToPixelCoordinateSystem(detail.enabledElement, detail.canvasContext);  
    var ctx = detail.canvasContext;

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
    $("[data-toggle='tooltip']").tooltip({delay: {show: 1000, hide: 0}});
});

// Toggle on and off contours
$("#legend input[type='checkbox']").change( function() {
    regionId = parseInt($(this).parents('.region').get(0).dataset.id)
    index = ignoreRegions.indexOf(regionId);

    if( $(this).is(':checked') ) {
        if (index > -1) {
            ignoreRegions.splice(index,1);
        }
    } else {
        ignoreRegions.push(regionId);
    }
    cornerstone.updateImage(element);
});

// Highlight active region on mouse over
$("#legend .region").mouseenter(function() {
    regionId = parseInt($(this).get(0).dataset.id);
    highlightedRegion = regionId;
    cornerstone.updateImage(element);
});

$("#legend .region").mouseleave(function() {
    highlightedRegion = 0;
    cornerstone.updateImage(element);
});




































