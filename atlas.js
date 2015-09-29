var element, doseElement, petElement, mr1Element, mr2Element;
var stack = {};
var doseStack = {};
var petStack = {};
var mr1Stack = {};
var mr2Stack = {};
var loadProgress = {};
var overlays;
var overlayMode = "NONE";
var overlayAlpha = 0.5;

$(function() {
    var imgdata = {};
    var ignoreRegions = [];
    var highlightedRegions = [];
    var hoverRegion = 0;
    var stackContours = [];
    var imageIds = [];
    var doseThreshold = 2;

    var doseImageIds = [];
    var petImageIds = [];
    var mr1ImageIds = [];
    var mr2ImageIds = [];

    // Setup cornerstone elements
    element = $('#dicomImage').get(0);
    doseElement = $('#doseImage').get(0);
    petElement = $('#petImage').get(0);
    mr1Element = $('#mr1Image').get(0);
    mr2Element = $('#mr2Image').get(0);

    // Get image information from DOM
    imgdata = $('#image-data').data();

    // Get overlays
    overlays = imgdata.overlays.split(",");

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
                imageIds.push(location.origin + "/img/" + imgdata.name + "/" + dir + "/CT." + i + ".jpg");
                break;
        }
    };

    for (var i=1; i < imgdata.numslices + 1; i++) {
        doseImageIds.push(location.origin + "/img/" + imgdata.name + "/Dose/" + "dose." + i + ".jpg");

        petImageIds.push(location.origin + "/img/" + imgdata.name + "/PT/" + "PT." + i + ".jpg");

        mr1ImageIds.push(location.origin + "/img/" + imgdata.name + "/MR1/" + "MR1." + i + ".jpg");

        mr2ImageIds.push(location.origin + "/img/" + imgdata.name + "/MR2/" + "MR2." + i + ".jpg");
    }

    stack = {
        currentImageIdIndex : 0,
        imageIds: imageIds
    };

    doseStack = {
        currentImageIdIndex: 0,
        imageIds: doseImageIds
    };

    petStack = {
        currentImageIdIndex: 0,
        imageIds: petImageIds
    }

    mr1Stack = {
        currentImageIdIndex: 0,
        imageIds: mr1ImageIds
    }

    mr2Stack = {
        currentImageIdIndex: 0,
        imageIds: mr2ImageIds
    }

    // Setup color maps
    var cm = require('colormap');
    var dose_colormap = cm( { colormap: "jet", nshades: 256, format: "rgba", alpha: 0.5 } );
    dose_colormap.splice(-1, 1); dose_colormap.splice(0, 1);

    var pet_colormap = cm( { colormap: "hot", nshades: 256, format: "rgba", alpha: 0.5 } );
    pet_colormap.splice(-1, 1); pet_colormap.splice(0, 1);

    // Setup stack progress loader

    // Load all images upfront
    var all_imageIds = [];
    all_imageIds.push(stack.imageIds.slice(0));
    all_imageIds.push(doseStack.imageIds.slice(0));

    // Only load overlays if they exist
    if (_.contains(overlays, "PT"))  { all_imageIds.push(petStack.imageIds.slice(0)); }
    if (_.contains(overlays, "MR1")) { all_imageIds.push(mr1Stack.imageIds.slice(0)); }
    if (_.contains(overlays, "MR2")) { all_imageIds.push(mr2Stack.imageIds.slice(0)); }

    all_imageIds = [].concat.apply([], all_imageIds);

    loadProgress = {
        "imageIds": all_imageIds,
        "total": all_imageIds.length,
        "remaining": all_imageIds.length,
        "percentLoaded": 0
    }

    console.time("Stack Loading");
    $(cornerstone).on("CornerstoneImageLoaded", onImageProgressLoaded);

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

            if (overlayMode == "DOSE") { drawDose(ctx, dose_colormap, doseThreshold, imgdata.dosemaximum); }
            if (overlayMode == "PT")  { drawPET(ctx, pet_colormap); }
            if (overlayMode == "MR1") { drawMRI(ctx, mr1Element); }
            if (overlayMode == "MR2") { drawMRI(ctx, mr2Element); }
            drawContours(ctx, stackContours[stack.currentImageIdIndex], ignoreRegions, highlightedRegions, hoverRegion) 
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

        var doseMax = imgdata.dosemaximum;
        var ticks = _.range(0, doseMax, doseMax > 35 ? 10 : 5);
        if ( (doseMax % 10) !== 0 ) { ticks.push(doseMax) }
        
        var ticksStrings = [];
        for (var i=0; i < ticks.length; i++) {
            ticksStrings.push( ticks[i] + " Gy");
        }
        ticksStrings.reverse();
        ticks[0] = 2; // Default minimum threshold

        // Dose slider
        $("#doseSlider").slider({
            id: "doseSlider",
            orientation: "vertical",
            reversed: true,
            ticks: ticks,
            ticks_labels: ticksStrings,
            value: 2, // threshold dose at 2 Gy
            tooltip: "hide"
        }).on("slide", function(data) {
            doseThreshold = data.value;
            cornerstone.updateImage(element);
        });

        // Alpha slider
        $("#alphaSlider").slider({
            id: "alphaSlider",
            orientation: "vertical",
            reversed: false,
            min: 0,
            max: 1,
            step: 0.1,
            value: overlayAlpha,
            ticks: [0, 1],
            ticks_labels: ["CT SIM", "Overlay"]
        }).on("slide", function(data) {
            overlayAlpha = data.value;
            cornerstone.updateImage(element);
        });

        // Overlay select
        $('.selectpicker').selectpicker().change(function() {
            overlayMode = $(this).val();

            if (overlayMode == "DOSE") {
                $("#doseSliderDiv").css("visibility", "visible");

            } else {
                $("#doseSliderDiv").css("visibility", "hidden");
            }

            if (overlayMode == "NONE") {
                $("#alphaSliderDiv").css("visibility", "hidden");
            } else {
                $("#alphaSliderDiv").css("visibility", "visible");
            }

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
        $("#OAR_off").click(function() { changeAllContours("OAR", false, ignoreRegions); });
        $("#OAR_on").click(function()  { changeAllContours("OAR", true, ignoreRegions); });
        $("#TV_off").click(function()  { changeAllContours("TV", false, ignoreRegions); });
        $("#TV_on").click(function()   { changeAllContours("TV", true, ignoreRegions); });

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

function changeAllContours(regionType, flag, ignoreRegions) {
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

    if (_.contains(overlays, "PT"))  { cornerstone.enable(petElement); }
    if (_.contains(overlays, "MR1")) { cornerstone.enable(mr1Element); }
    if (_.contains(overlays, "MR2")) { cornerstone.enable(mr2Element); }

    var synchronizer = new cornerstoneTools.Synchronizer("CornerstoneNewImage", cornerstoneTools.stackImageIndexSynchronizer);

    cornerstone.loadImage(stack.imageIds[0]).then(function(image) {
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
        // cornerstoneTools.wwwc.activate(element, 1);
        // cornerstoneTools.zoomWheel.activate(element);
        // cornerstoneTools.zoom.activate(element, 2);

        // Prefetch the whole stack
        cornerstoneTools.stackPrefetch.enable(element, 3);

        // Set default viewport
        viewport = cornerstone.getViewport(element);
        viewport.scale = 2.5;
        // viewport.translation = {
        //     x: -3.6,
        //     y: 33.2
        // };
        cornerstone.setViewport(element, viewport);

        synchronizer.add(element);
    });

    cornerstone.loadImage(doseStack.imageIds[0]).then(function(doseImage) {
        // Set the stack as tool state
        cornerstoneTools.addStackStateManager(doseElement, ['stack']);
        cornerstoneTools.addToolState(doseElement, 'stack', doseStack);

        cornerstoneTools.stackPrefetch.enable(doseElement, 3);

        synchronizer.add(doseElement);
    });

    if (_.contains(overlays, "PT")) {
        cornerstone.loadImage(petStack.imageIds[0]).then(function(petImage) {
            // Set the stack as tool state
            cornerstoneTools.addStackStateManager(petElement, ['stack']);
            cornerstoneTools.addToolState(petElement, 'stack', petStack);

            cornerstoneTools.stackPrefetch.enable(petElement, 3);

            synchronizer.add(petElement);
        });
    }

    if (_.contains(overlays, "MR1")) {
        cornerstone.loadImage(mr1Stack.imageIds[0]).then(function(mrImage) {
            // Set the stack as tool state
            cornerstoneTools.addStackStateManager(mr1Element, ['stack']);
            cornerstoneTools.addToolState(mr1Element, 'stack', mr1Stack);

            cornerstoneTools.stackPrefetch.enable(mr1Element, 3);

            synchronizer.add(mr1Element);
        });
    }

    if (_.contains(overlays, "MR2")) {
        cornerstone.loadImage(mr2Stack.imageIds[0]).then(function(mrImage) {
            // Set the stack as tool state
            cornerstoneTools.addStackStateManager(mr2Element, ['stack']);
            cornerstoneTools.addToolState(mr2Element, 'stack', mr2Stack);

            cornerstoneTools.stackPrefetch.enable(mr2Element, 3);

            synchronizer.add(mr2Element);
        });
    }
}