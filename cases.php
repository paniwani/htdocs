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

?>

<!DOCTYPE HTML>
<html>
<head>
    <link href="css/bootstrap.min.css" rel="stylesheet">
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

  <div class="container">

    <!-- <ul class="nav nav-pills" id="sites-nav">
      <li role="presentation" class="active"><a href="#">H&N</a></li>
      <li role="presentation"><a href="#">CNS</a></li>
      <li role="presentation"><a href="#">Thorax</a></li>
      <li role="presentation"><a href="#">Breast</a></li>
      <li role="presentation"><a href="#">GI</a></li>
      <li role="presentation"><a href="#">GU</a></li>
      <li role="presentation"><a href="#">GYN</a></li>
      <li role="presentation"><a href="#">Lymphoma</a></li>
      <li role="presentation"><a href="#">Thorax</a></li>
      <li role="presentation"><a href="#">MSK/Sarcoma</a></li>
    </ul> -->

    <div class="btn-group btn-group-lg" role="group" id="sites">
      <button type="button" class="btn btn-primary">H&N</button>
      <button type="button" class="btn btn-default">CNS</button>
      <button type="button" class="btn btn-default">Thorax</button>
      <button type="button" class="btn btn-default">Breast</button>
      <button type="button" class="btn btn-default">GI</button>
      <button type="button" class="btn btn-default">GU</button>
      <button type="button" class="btn btn-default">GYN</button>
      <button type="button" class="btn btn-default">Lymphoma</button>
      <button type="button" class="btn btn-default">Sarcoma</button>
    </div>

    <br />

    <h2 class="page-header">Cases</h2>

    <table class="table table-striped" id="cases">

      <thead>
        <tr>
          <th>#</th>
          <th>Site</th>
          <th>Subsite</th>
          <th>Stage</th>
          <th>Assessment</th>
        </tr>
      </thead>

      <tbody>

        <?php
          $result = $conn->query("SELECT * FROM images");
          
          while ($img = $result->fetch_assoc()):
        ?>

          <tr class="clickable-row" data-href="/atlas.php?id=<?=$img['id']?>">
            <td><?= $img['id'] ?></td>
            <td><?= $img['site'] ?></td>
            <td>
              <?php 
                $sitename = ucwords($img['subsite']);
                if (!empty($img['subsubsite'])) {
                  $sitename = $sitename . " -- " . $img['subsubsite'];
                }

                echo $sitename;
              ?>
            </td>
            <td><?= $img['stage'] ?></td>
            <td><?= $img['assessment'] ?></td>
          </tr>

        <?php endwhile ?>
        
      </tbody>
    </table>
  </div>

</body>

<script src="js/jquery.min.js"></script>
<script src="js/bootstrap.min.js"></script>
<script src="js/cases.js"></script>

</html>

<?php 

$conn->close();

?>































