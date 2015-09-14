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
from RTPET import RTPET

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

# Setup directories
dataset = "DP_17333717" # TODO: Only load DP for now
dataset_dir = os.path.join(inDir, dataset)
CT_dir = os.path.join(dataset_dir, "CT")
PT_dir = os.path.join(dataset_dir, "PTCT")

# Get image file names

filenames = glob.glob(os.path.join(CT_dir, "CT*.dcm"))
numSlices = len(filenames)
image1 = sorted(filenames)[0]
imageBaseName = image1.split(CT_dir)[1].split(".1.dcm")[0].split("/")[1]

rtStructFile = glob.glob(os.path.join(dataset_dir, "RS*.dcm"))[0]
rtDoseFile   = glob.glob(os.path.join(dataset_dir, "RD*.dcm"))[0]

print "Image base name: " + imageBaseName
print "Number of slices: " + str(numSlices)
print "RT Struct File Name: " + rtStructFile
print "RT Dose File Name: " + rtDoseFile

# TODO: Get image description
description = ""
# with open('../description.txt', 'rU') as f:
#     reader = csv.reader(f, dialect='excel', delimiter='\t')
#     for row in reader:
#         if row[0] == dataset:
#           description = row[1]
#           break

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
cur.execute("INSERT INTO images (name, basename, numRows, numCols, numSlices, pixelSpacing, description, doseMaximum) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", (dataset, imageBaseName, numRows, numCols, numSlices, pixelSpacing, description, 0))
imageID = cur.lastrowid
print "Saved image to database"

# Convert image to jpeg and save to output directory
dsDir = os.path.join(outDir, dataset)
os.makedirs(dsDir)
os.makedirs(dsDir + "/CT_jpg")

for im in filenames:
  imName = im.split(".dcm")[0]
  os.system("dcmj2pnm +oj +Jq 90 +Ww 20 400 %s %s" % (im, imName + ".jpg"))
  shutil.move(imName + ".jpg", dsDir + "/CT_jpg")

print "Converted dicom to jpeg"

# Load CT image
reader = sitk.ImageSeriesReader()
CT_image = sitk.ReadImage(reader.GetGDCMSeriesFileNames(CT_dir))

# Get and save RT struct
rtStruct = RTStruct(rtStructFile)
rtStruct.convertPatientToPixelCoordinates(patientOrigin, pixelSpacing)

for region in rtStruct.regions:
  cur.execute("INSERT INTO regions (name, color, image_id, ROINumber, disabled) VALUES (%s, %s, %s, %s, %s)", (region["name"], region["color"], imageID, region["ROINumber"], 0))

print "Saved regions to database"

with open(dsDir + "/contours.json", "w") as outfile:
  json.dump(rtStruct.contours, outfile)

print "Saved contours.json"

# Get and save RT dose
os.makedirs(os.path.join(dsDir, "Dose"))
rtDose = RTDose(CT_image, rtDoseFile)
sitk.WriteImage(rtDose.image, [os.path.join(dsDir, "Dose", "dose.{0}.jpg".format(i)) for i in range(rtDose.image.GetSize()[2], 0, -1)], True) # Write dose in backwards order
cur.execute("UPDATE images SET doseMaximum=%s WHERE id=%s", (rtDose.maximum, imageID)) 
print "Saved dose files as jpeg"

# Get and save PET if it exists
if os.path.isdir(PT_dir):
  rtPET = RTPET(CT_image, PT_dir)
  out_PT_dir = os.path.join(dsDir, "PT")
  os.makedirs(out_PT_dir)
  sitk.WriteImage(rtPET.PT_image, [os.path.join(out_PT_dir, "PT.{0}.jpg".format(i)) for i in range(1,numSlices+1)], True)
  cur.execute("UPDATE images SET PET_SUVbw_scale_factor=%s WHERE id=%s", (rtPET.SUVbw_scale_factor, imageID)) 

# Close database
db.commit()
cur.close()
db.close()

















