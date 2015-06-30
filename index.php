<?php
require("../config.php");

ini_set('display_startup_errors',1);
ini_set('display_errors',1);
error_reporting(-1);

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

// Get all enabled regions for this image
$sql = "select * from regions where image_id=$imageID AND disabled=0 order by name asc";
$result = $conn->query($sql);
$regions = mysqli_fetch_all($result, MYSQLI_ASSOC);

$conn->close();
?>

<!DOCTYPE HTML>
<html>
<head>
    <link href="css/bootstrap.min.css" rel="stylesheet">

    <link href="css/atlas.css" rel="stylesheet">
</head>

<body>

<div class="container" id="progressContainer">
  <div class="progress">
    <div class="progress-bar progress-bar-striped progress-bar-info active" id="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%">
      0%
    </div>
  </div>
  <div id="progressText">
    Loaded:
  </div>
</div>

<div class="container" id="mainContainer">
    <div class="row" id="description">
        <p><?= $img["description"] ?></p>
    </div>
    
    <div class="row">
        <div class="col-md-8">

            <ul class="nav nav-pills" id="toolbar">
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-in" data-toggle="tooltip" data-placement="top" title="Zoom In"> <i class="glyphicon glyphicon-zoom-in" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-out" data-toggle="tooltip" data-placement="top" title="Zoom Out"> <i class="glyphicon glyphicon-zoom-out" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="pan" data-toggle="tooltip" data-placement="top" title="Pan"> <i class="glyphicon glyphicon-move" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="wwwc" data-toggle="tooltip" data-placement="top" title="Window/Level"> <i class="glyphicon glyphicon-align-left" aria-hidden="true"></i></button></li>
            </ul>

            <div id="dicomImageWrapper"
                 class="cornerstone-enabled-image"
                 oncontextmenu="return false"
                 unselectable='on'
                 onselectstart='return false;'
                 onmousedown='return false;'>
                
                <div id="dicomImage" oncontextmenu="return false" tabindex="0">
                    <div id="imgtopleft">
                      <div id="imgNameText"><?= $img["name"] ?></div>
                    </div>
                    <div id="imgtopright">
                        <div id="zoomText">Zoom: </div>
                        <div id="sliceText">Image: </div>
                    </div>
                    <div id="imgbottomleft">
                        <div id="wwwcText">WW/WC: </div>
                    </div>
                    <div id="imgmiddleleft">
                      <div>R</div>
                    </div>

                    <div id="imgmiddleright">
                      <div>L</div>
                    </div>
                </div>
            </div>

        </div>

        <div id="legend">
            <div class="col-md-2">
                <?php
                    foreach(array_slice($regions,0,15) as $region) {
                        echo "<div>";
                        echo "<div class='color-swatch' style='background-color: rgb(".$region["color"].");')></div>";
                        echo "<p>".$region["name"]."</p>";
                        echo "</div>";
                    }
                ?>
            </div>

            <div class="col-md-2">
                <?php
                    foreach(array_slice($regions,16,-1) as $region) {
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
<script src="js/bootstrap.min.js"></script>
<script src="js/cornerstone.min.js"></script>
<script src="js/cornerstoneMath.min.js"></script>
<script src="js/cornerstoneTools.min.js"></script>
<script src="js/dicomParser.min.js"></script>
<script src="js/jpx.min.js"></script>
<script src="js/cornerstoneWADOImageLoader.min.js"></script>
<script src="js/sizeof.min.js"></script>
<script src="js/atlas.js"></script>

</html>






























