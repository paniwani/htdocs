<?php
require("config.php");

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE);

// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// Set image
$imageID = isset($_GET['id']) ? $_GET['id'] : 1;

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

<div class="container">
    <div class="row">
        <div class="col-md-8">
            <div id="dicomImageWrapper" style="width:700px;height:700px;position:relative;color: white;"
                 class="cornerstone-enabled-image"
                 oncontextmenu="return false"
                 unselectable='on'
                 onselectstart='return false;'
                 onmousedown='return false;'>
                
                <div id="dicomImage" oncontextmenu="return false"
                     style="width:700px;height:700px;top:0px;left:0px; position:absolute">
                    <div id="imgtopright" style="position: absolute;top:6px; right:3px">
                        <div id="zoomText">Zoom: </div>
                        <div id="sliceText">Image: </div>
                    </div>
                    <div id="imgbottomleft" style="position: absolute;bottom:3px; left:3px">
                        <div id="wwwcText">WW/WC: </div>
                    </div>
                </div>
            </div>

            <ul class="nav nav-pills">
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-in"> <i class="glyphicon glyphicon-zoom-in" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-out"> <i class="glyphicon glyphicon-zoom-out" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="pan"> <i class="glyphicon glyphicon-move" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="wwwc"> <i class="glyphicon glyphicon-align-left" aria-hidden="true"></i></button></li>
            </ul>
        </div>

        <div id="legend">
            <div class="col-md-2">
                <?php
                    foreach(array_slice($regions,0,30) as $region) {
                        echo "<div>";
                        echo "<div class='color-swatch' style='background-color: rgb(".$region["color"].");')></div>";
                        echo "<p>".$region["name"]."</p>";
                        echo "</div>";
                    }
                ?>
            </div>

            <div class="col-md-2">
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

<?php
    // Store image data in DOM for JS
    echo "<div id='image-data' data-id='".$imageID."' data-name='".$img['name']."' data-baseName='".$img['basename']."' data-numSlices=".$img['numSlices']."></div>";
?>
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






























