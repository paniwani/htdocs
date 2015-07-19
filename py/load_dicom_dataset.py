import sys
import os
import dicom
import pdb
import glob
import MySQLdb
import csv
import shutil
import json
import SimpleITK as sitk
from RTStruct import RTStruct
from RTDose import RTDose

def usage():
  print "usage: python load_dicom_dataset.py input_directory output_directory"

# Argument handling
if len(sys.argv)<2:
  usage()
  sys.exit(2)

inDir = sys.argv[1]
outDir = sys.argv[2]

# Get dataset
datasets = os.walk(inDir).next()[1]
dataset = datasets[0]

# Get image file names
os.chdir(inDir + "/" + dataset)
image1 = glob.glob("*.1.dcm")[0]
imageBaseName = image1.split(".1.dcm")[0]
numSlices = len(glob.glob("CT*.dcm"))
rtStructFile = glob.glob("RS*.dcm")[0]
rtDoseFile = glob.glob("RD*.dcm")[0]

print "Image 1: " + image1
print "Number of slices: " + str(numSlices)
print "RT Struct File Name: " + rtStructFile
print "RT Dose File Name: " + rtDoseFile

# Get image description
description = ""
with open('../description.txt', 'rU') as f:
    reader = csv.reader(f, dialect='excel', delimiter='\t')
    for row in reader:
        if row[0] == dataset:
          description = row[1]
          break

print "Image description: " + description

# Connect to database
db = MySQLdb.connect(host="localhost", # your host, usually localhost
                     user="root", # your username
                      passwd="root", # your password
                      db="atlas") # name of the data base

cur = db.cursor()

# Get image information
ds = dicom.read_file(image1)
numRows = ds.Rows
numCols = ds.Columns
pixelSpacing = float(ds.PixelSpacing[0])
patientOrigin = [float(x) for x in ds.ImagePositionPatient[0:2]]

# Save image information to databse
cur.execute("INSERT INTO images (name, basename, numRows, numCols, numSlices, pixelSpacing, description) VALUES (%s, %s, %s, %s, %s, %s, %s)", (dataset, imageBaseName, numRows, numCols, numSlices, pixelSpacing, description))
imageID = cur.lastrowid
print "Saved image to database"

# Convert image to jpeg and save to output directory
dsDir = os.path.join(outDir, dataset)
if os.path.exists(dsDir):
  sys.exit("Output dataset directory already exists")
else:
  os.makedirs(dsDir)
  os.makedirs(dsDir + "/CT_jpg")

for im in glob.glob("CT*.dcm"):
  imName = im.split(".dcm")[0]
  os.system("dcmj2pnm +oj +Jq 90 +Ww 20 400 %s %s" % (im, imName + ".jpg"))
  shutil.move(imName + ".jpg", dsDir + "/CT_jpg")

print "Converted dicom to jpeg"

# Get and save RT struct
rtStruct = RTStruct(rtStructFile)
rtStruct.convertPatientToPixelCoordinates(patientOrigin, pixelSpacing)

for region in rtStruct.regions:
  cur.execute("INSERT INTO regions (name, color, image_id, ROINumber) VALUES (%s, %s, %s, %s)", (region["name"], region["color"], imageID, region["ROINumber"]))

print "Saved regions to database"

with open(dsDir + "/contours.json", "w") as outfile:
  json.dump(rtStruct.contours, outfile)

print "Saved contours.json"

# Get and save RT dose
if os.path.exists(os.path.join(dsDir, "Dose")):
  sys.exit("Dose directory already exists")
else:
  os.makedirs(os.path.join(dsDir, "Dose"))

rtDose = RTDose(os.path.join(inDir, dataset))
sitk.WriteImage(rtDose.image, [os.path.join(dsDir, "Dose", "dose.{0}.jpg".format(i)) for i in range(rtDose.image.GetSize()[2], 0, -1)], True)

print "Saved dose files as jpeg"

# Close database
db.commit()
cur.close()
db.close()
