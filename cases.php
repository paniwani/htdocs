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
    <!-- <link href="css/bootstrap.min.css" rel="stylesheet"> -->

    <link href="https://maxcdn.bootstrapcdn.com/bootswatch/3.3.5/cyborg/bootstrap.min.css" rel="stylesheet">
    

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
    <h1 class="page-header">Cases</h1>

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
          $result = $conn->query("SELECT * FROM IMAGES");
          
          while ($img = $result->fetch_assoc()):
        ?>

          <tr class="clickable-row" data-href="/atlas.php?id=<?=$img['id']?>">
            <td><?= $img['id'] ?></td>
            <td><?= $img['site'] ?></td>
            <td><?= ucwords($img['subsite']) ?></td>
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































