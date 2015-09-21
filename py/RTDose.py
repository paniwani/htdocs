import dicom
import pdb
import SimpleITK as sitk
import pylab
import glob
import os
import json
from numpy import *

class RTDose(object):
  def __init__(self, CT_image, dose_file):
    self.CT_image = CT_image
    self.dose_file = dose_file
    self.parse()

  def parse(self):

    # Get dose pixel data as numpy array
    ds = dicom.read_file(self.dose_file)

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

    print "Dose maximum: %s" % maximum

    # print "Dose origin: " + str(doseImage.GetOrigin())
    # print "Dose direction: " + str(doseImage.GetDirection())

    # print "Image origin: " + str(CT_image.GetOrigin()) 
    # print "Image direction: " + str(CT_image.GetDirection())

    # Resample dose image onto patient image
    resampleFilter = sitk.ResampleImageFilter()
    resampleFilter.SetReferenceImage(self.CT_image)
    doseImage = resampleFilter.Execute(doseImage)

    minMaxFilter = sitk.MinimumMaximumImageFilter()
    minMaxFilter.Execute(doseImage)
    minimum = minMaxFilter.GetMinimum()
    maximum = minMaxFilter.GetMaximum()

    print "\nResampled Dose maximum: %s" % maximum

    # Convert dose values to RGB colormap
    # doseImage = sitk.ScalarToRGBColormap(doseImage, sitk.ScalarToRGBColormapImageFilter.Jet)

    self.image = doseImage

    # Plot sample slices
    # imageArray = sitk.GetArrayFromImage(self.CT_image)
    # doseArray  = sitk.GetArrayFromImage(doseImage)

    # f = pylab.figure()

    # i = 1
    # for n in range(0,3):
    #   z = [25, 75, 125][n]

    #   f.add_subplot(3,2,i)
    #   pylab.imshow(imageArray[z,:,:], pylab.cm.Greys_r)
    #   i += 1

    #   f.add_subplot(3,2,i)
    #   pylab.imshow(doseArray[z,:,:], pylab.cm.jet)
    #   i += 1
    # pylab.show()

