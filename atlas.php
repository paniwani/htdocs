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

$overlays = explode(",", $img["overlays"]);

$conn->close();
?>

<!DOCTYPE HTML>
<html>
<head>
    <link href="css/bootstrap.min.css" rel="stylesheet">
     
    <link href="css/bootstrap-slider.min.css" rel="stylesheet">
    <link href="css/bootstrap-switch.min.css" rel="stylesheet">
    <link href="css/bootstrap-select.min.css" rel="stylesheet">
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

        <ul class="nav navbar-nav navbar-left">
          <ol class="breadcrumb" id="crumbs">
            <li><a href="/cases.php"><?= $img['site'] ?></a></li>
            <li><a href="/cases.php"><?= ucwords($img['subsite']) ?></a></li>
            <li class="active">Case #<?= $img['id'] ?></li>
          </ol>
        </ul>

        <ul class="nav navbar-nav navbar-right">
          <div id="logged-in pull-right">
            <?php include("views/logged_in.php"); ?>
          </div>
        </ul>
      </div>
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
          <p><?= $img["assessment"] ?></p>
        </div>
    </div>
    
    <div class="row">


        <div class="col-md-2" id="legend">

          <div class="row">

              <ul class="nav nav-tabs" role="tablist">
                <li role="presentation" class="active"><a href="#OAR_regions" aria-controls="OAR_regions" role="tab" data-toggle="tab"><span data-toggle="tooltip" data-placement="top" title="Organs At Risk">OARs</span></a></li>
                <li role="presentation"><a href="#TV_regions" aria-controls="TV_regions" role="tab" data-toggle="tab"><span data-toggle="tooltip" data-placement="top" title="Treatment Volumes">Targets</span></a></li>
              </ul>

              <div class="tab-content">
                <div class="tab-pane fade active in" id="OAR_regions">
                  
                  <input type="checkbox" id="OAR_switch" data-label-text="Contours" checked>

                  <?php foreach($regions_OAR as $region): ?>

                    <div class="region" data-id=<?= $region['ROINumber'] ?>>

                      <div class="checkbox">
                          <input type="checkbox" class="label_checkboxes" checked> 

                          <div class="color-swatch" style="background-color: rgb(<?= $region['color'] ?>);"></div>
                          <div class="regionName"><?= $region["name"] ?></div>
                      </div>
                      
                    </div>

                  <?php endforeach; ?>

                </div>
                  
                <div class="tab-pane fade in" id="TV_regions">
                  
                  <input type="checkbox" id="TV_switch" data-label-text="Contours" checked>

                  <?php foreach($regions_TV as $region): ?>

                    <div class="region" data-id=<?= $region['ROINumber'] ?>>

                      <div class="checkbox">
                          <input type="checkbox" class="label_checkboxes" checked> 

                          <div class="color-swatch" style="background-color: rgb(<?= $region['color'] ?>);"></div>
                          <div class="regionName"><?= $region["name"] ?></div>
                      </div>
                      
                    </div>

                  <?php endforeach; ?>

                  
                </div>
              </div>

          </div>

        </div>








        <div class="col-md-7">

            <ul class="nav nav-pills" id="toolbar">
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-in" data-toggle="tooltip" data-placement="top" title="Zoom In"> <i class="glyphicon glyphicon-zoom-in" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="zoom-out" data-toggle="tooltip" data-placement="top" title="Zoom Out"> <i class="glyphicon glyphicon-zoom-out" aria-hidden="true"></i></button></li>
              <li><button type="button" class="btn btn-default navbar-btn" id="pan" data-toggle="tooltip" data-placement="top" title="Pan"> <i class="glyphicon glyphicon-move" aria-hidden="true"></i></button></li>
              <!-- <li><button type="button" class="btn btn-default navbar-btn" id="wwwc" data-toggle="tooltip" data-placement="top" title="Window/Level"> <i class="glyphicon glyphicon-align-left" aria-hidden="true"></i></button></li> -->
            </ul>

            <select class="selectpicker show-tick pull-right" id="overlaySelect" data-width="150px" data-style="btn-primary">
             
              <option value="NONE">Select Overlay</option>

              <?php 
                foreach($overlays as $overlay): 

                  switch ($overlay) {
                    case "DOSE":
                      echo "<option value='DOSE'>RT Dose</option>";
                      break;

                    case "PT":
                      echo "<option value='PT'>PET/CT</option>";
                      break;

                    case "MR1":
                      echo "<option value='MR1'>MRI T1-weighted</option>";
                      break;

                    case "MR2":
                      echo "<option value='MR2'>MRI T2-weighted</option>";
                      break;
                  }

                endforeach;

              ?>

            </select> 

            </ul>

            <div id="dicomImageWrapper"
                 class="cornerstone-enabled-image"
                 oncontextmenu="return false"
                 unselectable='on'
                 onselectstart='return false;'
                 onmousedown='return false;'>
                
                <div id="dicomImage" oncontextmenu="return false" tabindex="0">


                    <div id="imgtopleft"></div>
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

                <div id="alphaSliderDiv">
                  <input type="text" id="alphaSlider" />
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

        <div class="col-md-3" >
          
          <ul class="nav nav-tabs" role="tablist">
            <li role="presentation" class="active"><a href="#plan" aria-controls="plan" role="tab" data-toggle="tab">RT Plan</a></li>
            <li role="presentation"><a href="#pearls" aria-controls="pearls" role="tab" data-toggle="tab">Clinical Pearls</a></li>
          </ul>

          <div class="tab-content">

            <div class="tab-pane fade active in" id="plan">
              <p><?= $img['plan'] ?></p>
            </div>

            <div class="tab-pane fade in" id="pearls">
              <?php
                if (empty($img['pearls'])) {
                  echo "<p>No clinical pearls available yet.</p>";
                } else {
                  echo $img['pearls'];
                }
              ?>
            </div>
              
          </div>

        </div>

        
    </div>

    <div class="row" id="overlayImages">
      <div id="doseImage"></div>
      <div id="petImage"></div>
      <div id="mr1Image"></div>
      <div id="mr2Image"></div>
      <canvas id="canvasTemp" width="512" height="512"></canvas>
    </div>
</div>

<div id="image-data" data-id="<?= $imageID ?>" data-name="<?= $img['name'] ?>" data-basename="<?= $img['basename'] ?>" data-numslices="<?= $img['numSlices'] ?>" data-loadmode="<?= $loadMode ?>" data-numrequests="<?= $numRequests ?>" data-dosemaximum="<?= $img['doseMaximum'] ?>" data-overlays="<?= $img['overlays'] ?>"></div>


</body>

<script src="js/jquery.min.js"></script>
<script src="js/bootstrap.min.js"></script>
<script src="js/bootstrap-slider.min.js"></script>
<script src="js/bootstrap-switch.min.js"></script>
<script src="js/bootstrap-select.min.js"></script>
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






























