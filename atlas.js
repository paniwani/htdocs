var element = {};
var imgdata = {};
var ignoreRegions = [];
var highlightedRegions = [];
var hoverRegion = 0;
var stack = {};
var stackContours = [];
var loadProgress = {};
var imageIds = [];

var doseElement = {};
var doseImageIds = [];
var doseStack = {};
var doseOn = false;

$(function() {
    element = $('#dicomImage').get(0);
    doseElement = $('#doseImage').get(0);

    // Get image information from DOM
    imgdata = $('#image-data').data();

    // Set up stack of images to load
    for (var i=1; i < imgdata.numslices + 1; i++) {
        var dir = "";
        switch (imgdata.loadmode) {
            case "J2K":
                dir = "CT_j2k";
                imageIds.push("dicomweb:img/" + imgdata.name + "/" + dir + "/" + imgdata.basename + "." + i + ".dcm");
                break;
            case "OSIRIX":
                dir = "CT_osirix";
                imageIds.push("dicomweb:img/" + imgdata.name + "/" + dir + "/" + "IM-0001-" + pad(i,4) + ".dcm");
                break;
            default:
                dir = "CT_jpg";
                imageIds.push(location.origin + "/atlas/img/" + imgdata.name + "/" + dir + "/" + imgdata.basename + "." + i + ".jpg");
                break;
        }
    };

    for (var i=1; i < imgdata.numslices + 1; i++) {
        doseImageIds.push(location.origin + "/atlas/img/" + imgdata.name + "/Dose/" + "dose." + i + ".jpg");
    }

    stack = {
        currentImageIdIndex : 0,
        imageIds: imageIds
    };

    doseStack = {
        currentImageIdIndex: 0,
        imageIds: doseImageIds
    };

    // Setup stack progress loader
    loadProgress = {
        "imageIds": stack.imageIds.slice(0),
        "total": stack.imageIds.length,
        "remaining": stack.imageIds.length,
        "percentLoaded": 0,
    };

    console.time("Stack Loading");
    $(cornerstone).on("CornerstoneImageLoaded", onImageProgressLoaded); // Image loading events are bound to the cornerstone object, not the element

    // Get stack contours from server and organize them by z
    for (var i=0; i < imgdata.numslices; i++) {
        stackContours[i] = [];
    }

    $.getJSON("img/" + imgdata.name + "/contours.json", function(data) {
        var contours = data;

        for (var i=0; i<contours.length; i++) {
            c = contours[i];

            // Store it in the stack sorted by z index
            stackContours[c.sliceIndex - 1].push(c);
        }
    })
    .done(function() {

        console.log("Retrieved contours from database.");

        //-------------------------------------------
        // EVENTS
        //-------------------------------------------

        // Draw the contours and dose
        $(element).on("CornerstoneImageRendered", function(event, detail) {
            ctx = detail.canvasContext;
            cornerstone.setToPixelCoordinateSystem(detail.enabledElement, ctx);  

            if (doseOn) { drawDose(ctx); }
            drawContours(stackContours[stack.currentImageIdIndex], ctx);
        });

        // Update viewport when image is rendered
        $(element).on("CornerstoneImageRendered", function(event, detail) {
            var viewport = detail.viewport;
            $('#wwwcText').text("WW/WC: " + Math.round(viewport.voi.windowWidth) + "/" + Math.round(viewport.voi.windowCenter));
            $('#zoomText').text("Zoom: " + viewport.scale.toFixed(2));
            $("#sliceText").text("Image: " + (stack.currentImageIdIndex + 1) + "/" + imgdata.numslices);
        });

        // Toolbar
        $("#zoom-in").click(function() {
            viewport = cornerstone.getViewport(element);
            viewport.scale += 0.5;
            cornerstone.setViewport(element, viewport);
        });

        $("#zoom-out").click(function() {
            viewport = cornerstone.getViewport(element);
            if (viewport.scale > 0.5) {
                viewport.scale -= 0.5;
                cornerstone.setViewport(element, viewport);
            }
        });  

        $("#pan").click(function() {
            cornerstoneTools.pan.activate(element, 1);
            cornerstoneTools.wwwc.deactivate(element, 1);
        });

        $("#wwwc").click(function() {
            cornerstoneTools.pan.deactivate(element, 1);
            cornerstoneTools.wwwc.activate(element, 1);
        });

        $("#doseBtn button").click(function() {
            doseOn = !doseOn;
            $("#doseBtn button").toggleClass("active");
            cornerstone.updateImage(element);
        });

        // Tooltips
        $(function(){
            $("[data-toggle='tooltip']").tooltip({delay: {"show": 1000, "hide": 0}});
        });

        $("[data-toggle='tooltip']").on("click", function() {
            $(this).tooltip('hide');
        });

        // Toggle on and off contours
        $("#legend input[type='checkbox']").click( function() {
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
            hoverRegion = regionId;
            cornerstone.updateImage(element);
        });

        $("#legend .region").mouseleave(function() {
            regionId = parseInt($(this).get(0).dataset.id);
            hoverRegion = 0;
            cornerstone.updateImage(element);
        });

        $("#legend .regionName").click(function(e) {
            regionId = parseInt($(this).parents('.region').get(0).dataset.id)

            if (!_.contains(highlightedRegions, regionId)) {
                highlightedRegions.push(regionId);
                $(this).parents('.region').addClass('highlighted');
                cornerstone.updateImage(element);
            } else {
                index = highlightedRegions.indexOf(regionId);
                if (index > -1) {
                    highlightedRegions.splice(index, 1);
                    $(this).parents('.region').removeClass('highlighted');
                    cornerstone.updateImage(element);
                }
            }
        });

        // ww/wc presets
        $('#tissue').click(function(e) {
            var viewport = cornerstone.getViewport(element);
            viewport.voi.windowWidth = 400;
            viewport.voi.windowCenter = 20;
            cornerstone.setViewport(element, viewport);
        });

        $('#lung').click(function(e) {
            var viewport = cornerstone.getViewport(element);
            viewport.voi.windowWidth = 1600;
            viewport.voi.windowCenter = -600;
            cornerstone.setViewport(element, viewport);
        });

        $('#bone').click(function(e) {
            var viewport = cornerstone.getViewport(element);
            viewport.voi.windowWidth = 2000;
            viewport.voi.windowCenter = 300;
            cornerstone.setViewport(element, viewport);
        });

        // On/Off OARs and TVs
        $("#OAR_off").click(function() { changeAllContours("OAR", false); });
        $("#OAR_on").click(function()  { changeAllContours("OAR", true); });
        $("#TV_off").click(function()  { changeAllContours("TV", false); });
        $("#TV_on").click(function()   { changeAllContours("TV", true); });

        // Re-focus for keyboard to work
        $("body").click(function() {
            $(element).focus();
        });

        // Now that we have the whole contour stack, setup and load the image
        setupImage();
    });
});

function onImageProgressLoaded (event, args){
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

    // Update progress bar in DOM
    var pb = $("#progress-bar");
    pb.attr("aria-valuenow", loadProgress["percentLoaded"]);
    pb.width(loadProgress["percentLoaded"] + "%");
    pb.html(loadProgress["percentLoaded"] + "%");
    $("#progressText").html("Loaded: " + (loadProgress["total"] - loadProgress["remaining"]) + "/" + loadProgress["total"] + " images");

    // When loading is complete, show the main content and hide the progress bar

    if ((loadProgress["remaining"] / loadProgress["total"]) === 0) {
        console.timeEnd("Stack Loading");
        $("#progressContainer").hide();
        $("#mainContainer").css("visibility", "visible");
        $(element).focus();
    }
}

function changeAllContours(regionType, flag) {
    var el;
    if (regionType == "OAR") {
        el = $("#OAR-regions");
    } else if (regionType == "TV") {
        el = $("#TV-regions");
    }

    inputs = $(el).find("input[type='checkbox']");

    for (var i=0; i < inputs.length; i++) {
        input = inputs[i];
        regionId = parseInt($(input).parents('.region').get(0).dataset.id);
        index = ignoreRegions.indexOf(regionId);

        if (flag) {
            $(input).prop("checked", true);
            if (index > -1) {
                ignoreRegions.splice(index,1);
            }
        } else {
            $(input).prop("checked", false);
            if (index < 0) {
                ignoreRegions.push(regionId);
            }
        }
    }
    cornerstone.updateImage(element);
}

function setupImage() {
    // Enable the dicomImage element
    cornerstone.enable(element);
    cornerstone.enable(doseElement);

    var synchronizer = new cornerstoneTools.Synchronizer("CornerstoneNewImage", cornerstoneTools.stackImageIndexSynchronizer);

    cornerstone.loadImage(imageIds[0]).then(function(image) {
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
        // $(element).focus();

        // Enable all stack tools we want to use with this element
        cornerstoneTools.stackScrollKeyboard.activate(element);
        cornerstoneTools.stackScrollWheel.activate(element);
        // cornerstoneTools.pan.activate(element, 1);
        // cornerstoneTools.stackScroll.activate(element, 1);
        cornerstoneTools.wwwc.activate(element, 1);
        // cornerstoneTools.zoomWheel.activate(element);
        // cornerstoneTools.zoom.activate(element, 2);

        // Prefetch the whole stack
        var config = { "maxSimultaneousRequests" : imgdata.numrequests };
        cornerstoneTools.stackPrefetch.setConfiguration(config);
        cornerstoneTools.stackPrefetch.enable(element, 3);

        // Set default viewport
        viewport = cornerstone.getViewport(element);
        viewport.scale = 2.5;
        viewport.translation = {
            x: -3.6,
            y: 33.2
        };
        cornerstone.setViewport(element, viewport);

        synchronizer.add(element);
    });

    cornerstone.loadImage(doseImageIds[0]).then(function(doseImage) {
        // cornerstone.displayImage(doseElement, doseImage);

        // Enable mouse and keyboard inputs
        cornerstoneTools.keyboardInput.enable(doseElement);
        cornerstoneTools.mouseInput.enable(doseElement);
        cornerstoneTools.mouseWheelInput.enable(doseElement);

        // Set the stack as tool state
        cornerstoneTools.addStackStateManager(doseElement, ['stack']);
        cornerstoneTools.addToolState(doseElement, 'stack', doseStack);

        cornerstoneTools.stackScrollKeyboard.activate(doseElement);
        cornerstoneTools.stackScrollWheel.activate(doseElement);

        cornerstoneTools.stackPrefetch.enable(doseElement, 3);

        synchronizer.add(doseElement);


    });

    
}