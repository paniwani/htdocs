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

    <title>eContour</title>
</head>

<body>

  <?php include_once("analyticstracking.php") ?>

  <!-- Static navbar -->
  <nav id="mainNavBar" class="navbar navbar-default navbar-static-top">
    <div class="container">
      
      <div class="navbar-header">
        <div id="logo"><a href="/cases.php">eContour</a></div>
      </div>

      <div id="navbar" class="navbar-collapse collapse">

        <ul class="nav navbar-nav navbar-right">
          <div id="logged-in">
            <?php echo $_SESSION['user_name']; ?> | <a href="index.php?logout">Sign Out</a>
          </div>
        </ul>
      </div><!--/.nav-collapse -->
    </div>
  </nav>

  <div class="container">

    <?php
      $site = "";
      
      if (isset($_GET['site'])) { $site = $_GET['site']; }
    ?>

    <div class="btn-group btn-group-lg" role="group" id="sites">
      <a href="/cases.php?site=hn" class="btn <?= ($site == "hn") ? "btn-primary" : "btn-default" ?>">H&N</a>
      <a href="/cases.php?site=thorax" class="btn <?= ($site == "thorax") ? "btn-primary" : "btn-default" ?>">Thorax</a>
      <a href="/cases.php?site=breast" class="btn <?= ($site == "breast") ? "btn-primary" : "btn-default" ?>">Breast</a>
      <a href="/cases.php?site=gi" class="btn <?= ($site == "gi") ? "btn-primary" : "btn-default" ?>">GI</a>
      <a href="/cases.php?site=gu" class="btn <?= ($site == "gu") ? "btn-primary" : "btn-default" ?>">GU</a>
      <a href="/cases.php?site=gyn" class="btn <?= ($site == "gyn") ? "btn-primary" : "btn-default" ?>">GYN</a>
      <a href="/cases.php?site=lymphoma" class="btn <?= ($site == "lymphoma") ? "btn-primary" : "btn-default" ?>">Lymphoma</a>
      <a href="/cases.php?site=sarcoma" class="btn <?= ($site == "sarcoma") ? "btn-primary" : "btn-default" ?>">Sarcoma</a>      
    </div>

    <br />

    <h2 class="page-header">Cases</h2>

    <?php

    $query = "SELECT * FROM images";
    if(isset($_GET['site'])) {
      $site = $_GET['site'];
      if ($site == "hn") { $site = "h&n"; }

      $query .= " WHERE site = '" . $site . "'";
    }
    
    $result = $conn->query($query);

    if ($result->num_rows == 0):

    ?>

    <p id="nocases">No available cases. Please try again later!</p>

    <?php else: ?>

    <table class="table table-striped" id="cases">

      <thead>
        <tr>
          <th>Site</th>
          <th>Subsite</th>
          <th>Stage</th>
          <th>Assessment</th>
        </tr>
      </thead>

      <tbody>

      <?php while ($img = $result->fetch_assoc()): ?>

          <tr class="clickable-row" data-href="/atlas.php?id=<?=$img['id']?>">
            <td><?= $img['site'] ?></td>
            <td>
              <?php 
                $sitename = ucwords($img['subsite']);
                if (!empty($img['subsubsite'])) {
                  $sitename = $sitename . "<br />" . "<span class='subsubsite'>(" . $img['subsubsite'] . ")</span>";
                }

                echo $sitename;
              ?>
            </td>
            <td><?= $img['stage'] ?></td>
            <td><?= $img['assessment'] ?></td>
          </tr>

        <?php endwhile; ?>
        
      </tbody>
    </table>

    <?php endif; ?>
  </div>

</body>

<script src="js/jquery.min.js"></script>
<script src="js/bootstrap.min.js"></script>
<script src="js/cases.js"></script>

</html>

<?php 

$conn->close();

?>































