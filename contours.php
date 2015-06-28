<?php
require("config.php");

$imageID = isset($_GET['imageID']) ? $_GET['imageID'] : null;

// Create connection
$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE);

// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
} 

$sql = "select contours.points, contours.region_id, contours.sliceIndex, regions.color FROM contours inner join regions on contours.region_id=regions.id WHERE contours.image_id=$imageID order by contours.sliceIndex";

$result = $conn->query($sql);
$json = mysqli_fetch_all($result, MYSQLI_ASSOC);
echo json_encode($json);

$conn->close();
?>