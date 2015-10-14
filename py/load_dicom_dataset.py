import sys
import os
import dicom
import pdb
import glob
import MySQLdb
import csv
import shutil
import json
import HTMLParser
import SimpleITK as sitk
from openpyxl import load_workbook
from RTStruct import RTStruct
from RTDose import RTDose
from RTPET import RTPET
from RTMR import RTMR


def usage():
  print "usage: python load_dicom_dataset.py input_directory output_directory"

# Argument handling
if len(sys.argv)<2:
  usage()
  sys.exit(2)

inDir = sys.argv[1]
outDir = sys.argv[2]

# Connect to database
db = MySQLdb.connect(host="localhost", # your host, usually localhost
                     user="root", # your username
                      passwd="root", # your password
                      db="atlas") # name of the data base

cur = db.cursor()

# Read image information from excel spreadsheet
wb = load_workbook(filename = "/Users/neil/Dropbox/Contouring/atlas_case_list_official.xlsx", read_only = True)
ws = wb['Active Case List'] # ws is now an IterableWorksheet

datasets = []

for i, row in enumerate(ws.rows):
  if i == 0:
    continue

  if (row[0].value != None) and (i < 100):
    dataset = {}

    # Only include cases marked for astro
    if (row[1].value != 'yes'):
      # print 'Excluding this case because it is not marked for astro'
      continue

    dataset['UID']                    = int(row[0].value)
        
    dataset['SITE']                   = row[5].value.encode("utf-8").strip()   if (row[5].value != None) else ""
    dataset['SUBSITE']                = row[6].value.encode("utf-8").strip()   if (row[6].value != None) else ""
    dataset['SUBSUBSITE']             = row[7].value.encode("utf-8").strip()   if (row[7].value != None) else ""

    dataset['STAGE']                  = row[8].value.encode("utf-8").strip()   if (row[8].value != None) else ""
    dataset['ASSESSMENT']             = row[9].value.encode("utf-8").strip()   if (row[9].value != None) else ""
    dataset['PLAN']                   = row[10].value.encode("utf-8").strip()  if (row[10].value != None) else ""
    dataset['PEARLS']                 = row[13].value.encode("utf-8").strip()  if (row[13].value != None) else ""

    dataset['INVERT_TRANSFORM']       = int(row[15].value)
    dataset['ZOOM']                   = float(row[16].value)

    dataset['REMOVE']                 = row[17].value.encode("utf-8").strip()   if (row[17].value != None) else ""
    dataset['RENAME']                 = row[18].value.encode("utf-8").strip()   if (row[18].value != None) else ""

    # Use anonymized MRN
    dataset['MRN'] = "PATIENT" + str(dataset['UID'])

    datasets.append(dataset)


# REMOVE
# ONLY FOR DEBUGGING
datasets = datasets[0:2]

print "Loading the following patients: "
print ','.join([str(ds['UID']) for ds in datasets])

# Get datasets
for dataset in datasets:

  print "\nDataset: %s" % dataset['MRN']

  # Setup directories
  dataset_dir = os.path.join(inDir, dataset['MRN'])

  CT_dir = os.path.join(dataset_dir, "CT")
  PT_dir = os.path.join(dataset_dir, "PTCT")
  MR1_dir = os.path.join(dataset_dir, "MR1")
  MR2_dir = os.path.join(dataset_dir, "MR2")

  # Get image file names

  filenames = glob.glob(os.path.join(CT_dir, "CT*.dcm"))
  numSlices = len(filenames)
  image1 = sorted(filenames)[0]
  imageBaseName = image1.split(CT_dir)[1].split(".1.dcm")[0].split("/")[1]
  filenames = [os.path.join(CT_dir, (imageBaseName + "." + str(i) + ".dcm")) for i in range(1,numSlices+1)]

  rtStructFile = glob.glob(os.path.join(dataset_dir, "RS*.dcm"))[0]
  rtDoseFile   = glob.glob(os.path.join(dataset_dir, "RD*.dcm"))[0]

  # Get image information
  ds = dicom.read_file(image1)
  numRows = ds.Rows
  numCols = ds.Columns
  pixelSpacing = float(ds.PixelSpacing[0])
  patientOrigin = [float(x) for x in ds.ImagePositionPatient[0:2]]

  # Create unique name
  name = "Patient." + str(dataset['UID'])

  # Save image information to databse
  cur.execute("INSERT INTO images (id, name, numRows, numCols, numSlices, pixelSpacing) VALUES (%s, %s, %s, %s, %s, %s)", (dataset['UID'], name, numRows, numCols, numSlices, pixelSpacing))
  imageID = cur.lastrowid
  print "Saved image to database"

  # Save image case information to databse
  cur.execute("UPDATE images SET invert_transform=%s, zoom=%s, site=%s, subsite=%s, subsubsite=%s, stage=%s, assessment=%s, plan=%s, pearls=%s WHERE id=%s", (dataset['INVERT_TRANSFORM'], dataset['ZOOM'], dataset['SITE'], dataset['SUBSITE'], dataset['SUBSUBSITE'], dataset['STAGE'], dataset['ASSESSMENT'], dataset['PLAN'], dataset['PEARLS'], imageID)) 

  # Convert image to jpeg and save to output directory
  dsDir = os.path.join(outDir, name)
  os.makedirs(dsDir)
  os.makedirs(dsDir + "/CT_jpg")

  for i in range(1, numSlices+1):
    im = filenames[i-1]
    imName = "CT.{0}.jpg".format(i)

    os.system("dcmj2pnm +oj +Jq 90 +Ww 20 400 %s %s" % (im, imName))
    shutil.move(imName, dsDir + "/CT_jpg")

  print "Converted dicom to jpeg"

  # Load CT image
  reader = sitk.ImageSeriesReader()
  CT_image = sitk.ReadImage(reader.GetGDCMSeriesFileNames(CT_dir))

  # Get and save RT struct
  rtStruct = RTStruct(rtStructFile, dataset['REMOVE'], dataset['RENAME'])
  rtStruct.convertPatientToPixelCoordinates(patientOrigin, pixelSpacing)

  for region in rtStruct.regions:
    cur.execute("INSERT INTO regions (name, color, image_id, ROINumber, disabled) VALUES (%s, %s, %s, %s, %s)", (region["name"], region["color"], imageID, region["ROINumber"], 0))

  print "Saved regions to database"

  with open(dsDir + "/contours.json", "w") as outfile:
    json.dump(rtStruct.contours, outfile)

  print "Saved contours.json"

  overlays = []

  # Get and save RT dose
  overlays.append("DOSE")
  os.makedirs(os.path.join(dsDir, "Dose"))
  rtDose = RTDose(CT_image, rtDoseFile)
  sitk.WriteImage(rtDose.image, [os.path.join(dsDir, "Dose", "dose.{0}.jpg".format(i)) for i in range(rtDose.image.GetSize()[2], 0, -1)], True) # Write dose in backwards order
  cur.execute("UPDATE images SET doseMaximum=%s WHERE id=%s", (rtDose.maximum, imageID)) 
  print "Saved dose"


  invertFlag = dataset['INVERT_TRANSFORM'] == 1

  # Get and save PET if it exists
  if os.path.isdir(PT_dir):
    overlays.append("PT")

    rtPET = RTPET(CT_image, PT_dir, invertFlag)
    out_PT_dir = os.path.join(dsDir, "PT")
    os.makedirs(out_PT_dir)
    sitk.WriteImage(rtPET.PT_image, [os.path.join(out_PT_dir, "PT.{0}.jpg".format(i)) for i in range(rtPET.PT_image.GetSize()[2], 0, -1)], True)
    cur.execute("UPDATE images SET PET_SUVbw_scale_factor=%s WHERE id=%s", (rtPET.SUVbw_scale_factor, imageID)) 
    print "Saved PET"

  # Get and save PET if it exists
  if os.path.isdir(MR1_dir):
    overlays.append("MR1")

    rtMR = RTMR(CT_image, MR1_dir, invertFlag)
    out_MR_dir = os.path.join(dsDir, "MR1")
    os.makedirs(out_MR_dir)
    sitk.WriteImage(rtMR.MR_image, [os.path.join(out_MR_dir, "MR1.{0}.jpg".format(i)) for i in range(rtMR.MR_image.GetSize()[2], 0, -1)], True)
    print "Saved MRI T1"

  if os.path.isdir(MR2_dir):
    overlays.append("MR2")

    rtMR = RTMR(CT_image, MR2_dir, invertFlag)
    out_MR_dir = os.path.join(dsDir, "MR2")
    os.makedirs(out_MR_dir)
    sitk.WriteImage(rtMR.MR_image, [os.path.join(out_MR_dir, "MR2.{0}.jpg".format(i)) for i in range(rtMR.MR_image.GetSize()[2], 0, -1)], True)
    print "Saved MRI T2"

  # Update overlays in db
  cur.execute("UPDATE images SET overlays=%s WHERE id=%s", (",".join([str(x) for x in overlays]), imageID))

# Close database
db.commit()
cur.close()
db.close()

















