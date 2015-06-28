<?php
require("config.php");

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE);

// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// Set image
$imageID = 3;

// Get image information
$sql = "select * from images where id=$imageID";
$result = $conn->query($sql);
$img = mysqli_fetch_assoc($result);

// Get all regions for this image
$sql = "select * from regions where image_id=$imageID order by name asc";
$result = $conn->query($sql);
$regions = mysqli_fetch_all($result, MYSQLI_ASSOC);

?>

<!DOCTYPE HTML>
<html>
<head>
    <link href="css/bootstrap.min.css" rel="stylesheet">

    <link href="css/atlas.css" rel="stylesheet">
</head>

<body>

<?php
    // Store image data in DOM for JS
    echo "<div id='image-data' data-id='".$imageID."' data-name='".$img['name']."' data-baseName='".$img['basename']."' data-numSlices=".$img['numSlices']."></div>";
?>

<div class="container">
    <div class="row">
        <div class="col-md-6">
            <div id="dicomImageWrapper" style="width:512px;height:512px;position:relative;color: white;"
                 class="cornerstone-enabled-image"
                 oncontextmenu="return false"
                 unselectable='on'
                 onselectstart='return false;'
                 onmousedown='return false;'>
                
                <div id="dicomImage" oncontextmenu="return false"
                     style="width:512px;height:512px;top:0px;left:0px; position:absolute">
                    <div id="mrbottomright" style="position: absolute;bottom:6px; right:3px">
                        <div id="frameRate"></div>
                        <div id="zoomText">Zoom: </div>
                        <div id="sliceText">Image: </div>
                    </div>
                    <div id="mrbottomleft" style="position: absolute;bottom:3px; left:3px">
                        WW/WC:
                    </div>
                </div>
            </div>
        </div>

        <div id="legend" class="col-md-6">
            <div class="col-md-3">
                <?php
                    foreach(array_slice($regions,0,21) as $region) {
                        echo "<div>";
                        echo "<div class='color-swatch' style='background-color: rgb(".$region["color"].");')></div>";
                        echo "<p>".$region["name"]."</p>";
                        echo "</div>";
                    }
                ?>
            </div>

            <div class="col-md-3">
                <?php
                    foreach(array_slice($regions,22,-1) as $region) {
                        echo "<div>";
                        echo "<div class='color-swatch' style='background-color: rgb(".$region["color"].");')></div>";
                        echo "<p>".$region["name"]."</p>";
                        echo "</div>";
                    }
                ?>
            </div>
        </div>
    </div>
</div>
</body>

<script src="js/jquery.min.js"></script>
<script src="js/cornerstone.min.js"></script>
<script src="js/cornerstoneMath.min.js"></script>
<script src="js/cornerstoneTools.min.js"></script>
<script src="js/dicomParser.min.js"></script>
<script src="js/jpx.min.js"></script>
<script src="js/cornerstoneWADOImageLoader.min.js"></script>
<script src="js/sizeof.min.js"></script>
<script src="js/atlas.js"></script>

</html>






























