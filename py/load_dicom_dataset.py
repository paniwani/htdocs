import sys
import dicom
import pdb
import MySQLdb
from numpy import *

def usage():
  print "usage: python load_dicom_dataset.py imageName imageBase RTstruct numSlices"

# Handle command line arguments
if len(sys.argv)<5:
  usage()
  sys.exit(2)

imageName, imageBase, RTstruct, numSlices = sys.argv[1:5]
numSlices = int(numSlices)

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

# Get image information
ds = dicom.read_file("img/" + imageName + "/CT/" + imageBase + ".1.dcm")
numRows = ds.Rows
numCols = ds.Columns
pixelSpacing = float(ds.PixelSpacing[0])
patientOrigin = [int(x) for x in ds.ImagePositionPatient[0:2]]
patientOriginVector = array([patientOrigin[0], patientOrigin[1]])

# Save image information to databse
cur.execute("INSERT INTO images (name, basename, numRows, numCols, numSlices, pixelSpacing) VALUES (%s, %s, %s, %s, %s, %s)", (imageName, imageBase, numRows, numCols, numSlices, pixelSpacing))
imageID = cur.lastrowid
print "Saved image. ID: %s" % imageID

# Read RT structure data
ds = dicom.read_file("img/" + imageName + "/CT/" + RTstruct + ".dcm")

# Get ROI names
roi_sequence = ds.StructureSetROISequence
roi = {}
for r in roi_sequence:
  roi[int(r.ROINumber)] = r.ROIName

# Get contour data
for ROIContourSequence in ds.ROIContourSequence:
  ReferencedROINumber = int(ROIContourSequence.ReferencedROINumber)
  ROIDisplayColor = ','.join(str(x) for x in ROIContourSequence.ROIDisplayColor)

  try: 
    ROIContourSequence.ContourSequence
  except AttributeError:
    print "No contour sequence. Skipping this region."
    continue

  # Save ROI to database
  cur.execute("INSERT INTO regions (image_id, name, color) VALUES (%s, %s, %s)", (imageID, roi[ReferencedROINumber], ROIDisplayColor))
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