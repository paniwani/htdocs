import dicom
import pdb
import MySQLdb
from numpy import *

IMAGE_NAME = "BP_30056267"
IMAGE_BASE = "CT.1.2.840.113619.2.55.3.346865037.294.1409320864.82"
RTSTRUCT_FILENAME = "RS.1.2.246.352.71.4.1595298118.234058.20140911161601"
NUM_SLICES = 206

def patientPointToImagePixels(pointX, pointY, origin, spacing):
  pointVector = array([pointX, pointY])
  pointVector = subtract(pointVector, origin)

  x = math.ceil( pointVector[0] / spacing )
  y = math.ceil( pointVector[1] / spacing )
  return [int(x),int(y)]

# Connect to database
db = MySQLdb.connect(host="localhost", # your host, usually localhost
                     user="root", # your username
                      passwd="root", # your password
                      db="atlas") # name of the data base

cur = db.cursor()

# Clear database first
cur.execute("TRUNCATE TABLE images")
cur.execute("TRUNCATE TABLE regions")
cur.execute("TRUNCATE TABLE contours")
print "Database cleared."

# Get image information
ds = dicom.read_file("img/" + IMAGE_NAME + "/CT/" + IMAGE_BASE + ".1.dcm")
numRows = ds.Rows
numCols = ds.Columns
pixelSpacing = float(ds.PixelSpacing[0])
patientOrigin = [int(x) for x in ds.ImagePositionPatient[0:2]]
patientOriginVector = array([patientOrigin[0], patientOrigin[1]])

# Save image information to databse
cur.execute("INSERT INTO images (name, numRows, numCols, numSlices, pixelSpacing) VALUES (%s, %s, %s, %s, %s)", (IMAGE_NAME, numRows, numCols, NUM_SLICES, pixelSpacing))
imageID = cur.lastrowid
print "Saved image. ID: %s" % imageID

# Read RT structure data
ds = dicom.read_file("img/" + IMAGE_NAME + "/CT/" + RTSTRUCT_FILENAME + ".dcm")

# Get ROI names
roi_sequence = ds.StructureSetROISequence
roi = [0]*len(roi_sequence)
for r in roi_sequence:
  roi[int(r.ROINumber)-1] = r.ROIName

# Get contour data
for ROIContourSequence in ds.ROIContourSequence:
  ReferencedROINumber = int(ROIContourSequence.ReferencedROINumber)
  ROIDisplayColor = ','.join(str(x) for x in ROIContourSequence.ROIDisplayColor)

  # Save ROI to database
  cur.execute("INSERT INTO regions (image_id, name, color) VALUES (%s, %s, %s)", (imageID, roi[ReferencedROINumber-1], ROIDisplayColor))
  regionID = cur.lastrowid
  print "Saved region. ID: %s" % regionID

  for ContourSequence in ROIContourSequence.ContourSequence:
    ContourData = [float(x) for x in ContourSequence.ContourData]

    # Remove z coordinates
    del ContourData[2::3]

    cd = []
    for i in range(0, len(ContourData), 2):
      point = patientPointToImagePixels(ContourData[i], ContourData[i+1], patientOriginVector, pixelSpacing)
      cd.extend(point)
    cd = ','.join(str(x) for x in cd)

    imageSlice = str(ContourSequence.ContourImageSequence[0].ReferencedSOPInstanceUID)
    sliceIndex = imageSlice.split('.')[-1]

    # Save contour data to database
    cur.execute("INSERT INTO contours (region_id, image_id, sliceIndex, points) VALUES (%s, %s, %s, %s)", (regionID, imageID, sliceIndex, cd))
    # print ("Saved contour. ID: %s" % cur.lastrowid),

# Close database
db.commit()
cur.close()
db.close()