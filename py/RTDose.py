import dicom
import pdb
import SimpleITK as sitk
import pylab
import glob
import os
import json
from numpy import *

class RTDose(object):
  def __init__(self, directory):
    self.directory = directory
    self.parse()

  def parse(self):

    cwd = os.getcwd()

    # Get dose pixel data as numpy array
    doseFile = glob.glob(self.directory + "/RD*.dcm")[0]
    ds = dicom.read_file(doseFile)

    data = fromstring(ds.PixelData, dtype=uint32)
    data = data.reshape((ds.NumberofFrames, ds.Rows, ds.Columns))
    scaling = float(ds.DoseGridScaling)
    data *= scaling
    data = data.astype(uint8)

    # Get origin, spacing, direction for dose image
    doseOrigin = map(float, ds.ImagePositionPatient)
    spacing = map(float, ds.PixelSpacing)
    gridVector = map(float, ds.GridFrameOffsetVector)
    zspacing = gridVector[1] - gridVector[0]
    spacing.append(zspacing)

    # Setup dose image in itk
    doseImage = sitk.GetImageFromArray(data)
    doseImage.SetOrigin(doseOrigin)
    doseImage.SetSpacing(spacing)
    doseArray = sitk.GetArrayFromImage(doseImage)

    # Get dose min/max
    minMaxFilter = sitk.MinimumMaximumImageFilter()
    minMaxFilter.Execute(doseImage)
    minimum = minMaxFilter.GetMinimum()
    maximum = minMaxFilter.GetMaximum()
    self.maximum = maximum

    print "Dose maximum: " + str(maximum)

    # print "Dose origin: " + str(doseImage.GetOrigin())
    # print "Dose direction: " + str(doseImage.GetDirection())

    # Setup patient image in itk
    os.chdir(self.directory)
    reader = sitk.ImageSeriesReader()
    filenames = sorted(glob.glob("CT*.dcm"))
    numSlices = len(filenames)
    basename = filenames[0].split(".1.dcm")[0]
    files = []
    for i in range(numSlices, 0, -1): # Load images in descending order in order to get correct origin
      files.append(basename + "." + str(i) + ".dcm")

    reader.SetFileNames(files)
    image = reader.Execute()

    # print "Image origin: " + str(image.GetOrigin()) 
    # print "Image direction: " + str(image.GetDirection())

    # Resample dose image onto patient image
    resampleFilter = sitk.ResampleImageFilter()
    resampleFilter.SetReferenceImage(image)
    doseImage = resampleFilter.Execute(doseImage)
    doseArray = sitk.GetArrayFromImage(doseImage)

    # Filter dose image with a color map
    # doseImage = sitk.ScalarToRGBColormap(doseImage, sitk.ScalarToRGBColormapImageFilter.Jet)

    self.array = doseArray
    self.image = doseImage

    os.chdir(cwd)

    # # Plot sample slices
    # imageArray = sitk.GetArrayFromImage(image)
    # f = pylab.figure()

    # i = 1
    # for n in range(0,3):
    #   z = [50, 125, 200][n]

    #   f.add_subplot(3,2,i)
    #   pylab.imshow(imageArray[z,:,:], pylab.cm.Greys_r)
    #   i += 1

    #   f.add_subplot(3,2,i)
    #   pylab.imshow(doseArray[z,:,:])
    #   i += 1
    # pylab.show()

