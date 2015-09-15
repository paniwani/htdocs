<?php
require("../config.php");
require_once("classes/Login.php");

ini_set('display_startup_errors',1);
ini_set('display_errors',1);
error_reporting(-1);

// Ensure user is logged in
$login = new Login();
if ($login->isUserLoggedIn() == false) {
  header('Location: /index.php');
}

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_DATABASE);

// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

// Set image
$imageID = isset($_GET['id']) ? $_GET['id'] : 1;

// Set loading mode
$loadMode = isset($_GET['loadMode']) ? $_GET['loadMode'] : 'ORIGINAL';

// Get image information
$sql = "select * from images where id=$imageID";
$result = $conn->query($sql);
$img = mysqli_fetch_assoc($result);

// Get all enabled regions for this image
$sql = "select * from regions where image_id=$imageID AND disabled=0 order by name asc";
$result = $conn->query($sql);
$regions = mysqli_fetch_all($result, MYSQLI_ASSOC);

// Sort regions by target vs OAR
$regions_TV = [];
$regions_OAR = [];
foreach ($regions as $region) {
  if (preg_match("/(gtv)|(ctv)|(ptv)/i", $region["name"])) {
    $regions_TV[] = $region;
  } else {
    $regions_OAR[] = $region;
  }
}

$conn->close();
?>

<!DOCTYPE HTML>
<html>
<head>
    <link href="css/bootstrap.min.css" rel="stylesheet">
    <link href="css/bootstrap-slider.min.css" rel="stylesheet">
    <link href="css/bootstrap-switch.min.css" rel="stylesheet">
    <link href="css/atlas.css" rel="stylesheet">
    
    <!-- Fonts -->
    <link href='https://fonts.googleapis.com/css?family=Poiret+One' rel='stylesheet' type='text/css'>

    <title>Rad Onc Atlas</title>
</head>

<body>

  <!-- Static navbar -->
  <nav id="mainNavBar" class="navbar navbar-default navbar-static-top">
    <div class="container">
      
      <div class="navbar-header">
        <div id="logo">eContour</div>
      </div>

      <div id="navbar" class="navbar-collapse collapse">

        <ul class="nav navbar-nav navbar-right">
          <div id="logged-in">
            <?php include("views/logged_in.php"); ?>
          </div>
        </ul>
      </div><!--/.nav-collapse -->
    </div>
  </nav>




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
        <div class="col-md-12">
          <p><?= $img["description"] ?></p>
        </div>
    </div>
    
    <div class="row">
        <div class="col-md-8">

            <ul class="nav nav-pills" id="toolbar">
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-in" data-toggle="tooltip" data-placement="top" title="Zoom In"> <i class="glyphicon glyphicon-zoom-in" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-out" data-toggle="tooltip" data-placement="top" title="Zoom Out"> <i class="glyphicon glyphicon-zoom-out" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="pan" data-toggle="tooltip" data-placement="top" title="Pan"> <i class="glyphicon glyphicon-move" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="wwwc" data-toggle="tooltip" data-placement="top" title="Window/Level"> <i class="glyphicon glyphicon-align-left" aria-hidden="true"></i></button></li>
            </ul>

            <ul class="nav nav-pills" id="overlayBtns">
              <li>
                <input type="checkbox" name="doseSwitch" id="doseSwitch">
              </li>

              <li>
                <input type="checkbox" name="petSwitch" id="petSwitch">
              </li>

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

                <div id="doseSliderDiv">
                  <input type="text" id="doseSlider" />
                </div>
            </div>

            <div class="row">
              <div class="col-md-8">

                <div class="directions">
                  <p>Use mouse or keyboard arrows up/down to scroll through images.</p>
                  <p>Scroll over and click labels to highlight contour.</p>
                </div>

              </div>

              <div class="col-md-4">
                <div class="btn-group" role="group" id="ww-presets">
                  <button type="button" class="btn btn-sm btn-default" id="tissue">Tissue</button>
                  <button type="button" class="btn btn-sm btn-default" id="lung">Lung</button>
                  <button type="button" class="btn btn-sm btn-default" id="bone">Bone</button>
                </div>
              </div>
            </div>
        </div>

        <div class="col-md-4" id="legend">
          <div class="row">

            <div class="col-md-6" id="OAR-regions">

                <h5>OARs</h5>

                <?php 
                  foreach($regions_OAR as $region):
                ?>

                <div class="region" data-id=<?= $region['ROINumber'] ?>>

                  <div class="checkbox">
                      <input type="checkbox" checked> 

                      <div class="color-swatch" style="background-color: rgb(<?= $region['color'] ?>);"></div>
                      <div class="regionName"><?= $region["name"] ?></div>
                  </div>
                  
                </div>

                <?php endforeach; ?>


            </div>

            <div class="col-md-6" id="TV-regions">

                <h5>Target Volumes</h5>

                <?php 
                  foreach($regions_TV as $region):
                ?>

                <div class="region" data-id=<?= $region['ROINumber'] ?>>

                  <div class="checkbox">
                      <input type="checkbox" checked> 

                      <div class="color-swatch" style="background-color: rgb(<?= $region['color'] ?>);"></div>
                      <div class="regionName"><?= $region["name"] ?></div>
                  </div>
                  
                </div>

                <?php endforeach; ?>


            </div>

          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm btn-default" id="OAR_on">On</button>
                <button type="button" class="btn btn-sm btn-default" id="OAR_off">Off</button>
              </div>
            </div>

            <div class="col-md-6">
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm btn-default" id="TV_on">On</button>
                <button type="button" class="btn btn-sm btn-default" id="TV_off">Off</button>
              </div>
            </div>
          </div>


        </div>
    </div>

    <div class="row">
      <div id="doseImage"></div>
      <div id="petImage"></div>
      <canvas id="canvasTemp" width="512" height="512"></canvas>
    </div>
</div>



<div id="image-data" data-id="<?= $imageID ?>" data-name="<?= $img['name'] ?>" data-basename="<?= $img['basename'] ?>" data-numslices="<?= $img['numSlices'] ?>" data-loadmode="<?= $loadMode ?>" data-numrequests="<?= $numRequests ?>" data-dosemaximum="<?= $img['doseMaximum'] ?>"></div>

</body>

<script src="js/jquery.min.js"></script>
<script src="js/bootstrap.min.js"></script>
<script src="js/bootstrap-slider.min.js"></script>
<script src="js/bootstrap-switch.min.js"></script>
<script src="js/cornerstone.min.js"></script>
<script src="js/cornerstoneMath.min.js"></script>
<script src="js/cornerstoneTools.min.js"></script>
<script src="js/dicomParser.min.js"></script>
<script src="js/jpx.min.js"></script>
<script src="js/cornerstoneWADOImageLoader.min.js"></script>
<script src="js/cornerstoneWebImageLoader.min.js"></script>
<script src="js/sizeof.min.js"></script>
<script src="js/underscore.min.js"></script>
<script src="js/bundle.js"></script>
<script src="js/utility.js"></script>
<script src="atlas.js"></script>

</html>






























