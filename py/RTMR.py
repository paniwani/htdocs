import dicom
import pdb
import SimpleITK as sitk
import pylab
import glob
import os
from numpy import *

class RTMR(object):
  def __init__(self, CT_image, MR_dir):
    self.CT_image = CT_image
    self.MR_dir = MR_dir
    self.parse()

  # Get transform matrix which defines rotation and translation
  # from MR to CT in docom spatial registration object file
  # Returns rotation and translation as list
  def getTransform(self):
    file_SRO = glob.glob(os.path.join(self.MR_dir, "RE*.dcm"))[0]
    ds = dicom.read_file(file_SRO)
    tfm = ds[0x70,0x308][1][0x0070,0x0309][0][0x0070,0x030a][0][0x3006,0x00c6].value
    tfm = [float(x) for x in tfm]
    tfm = array(tfm).reshape(4,4)
    rotation = tfm[0:3,0:3].ravel().tolist()
    translation = tfm[0:3,3].ravel().tolist()

    return [rotation, translation]

  def parse(self):

    # Load the MR into simple ITK
    reader = sitk.ImageSeriesReader()
    MR_image = sitk.ReadImage(reader.GetGDCMSeriesFileNames(self.MR_dir))

    print "MR origin: %s" % str(MR_image.GetOrigin())
    print "MR direction: %s" % str(MR_image.GetDirection())

    # Get transform from dicom SRO
    rotation, translation = self.getTransform()
    transform = sitk.AffineTransform(3)
    transform.SetMatrix(rotation)
    transform.SetTranslation(translation)

    # Use inverse of the transform. Not entirely sure why but the registration works perfectly when inversed.
    transform = transform.GetInverse()

    # print "Inverted transform:"
    # print transform

    # Resample PET onto CT with linear interpolation and using transform
    MR_image = sitk.Resample(MR_image, self.CT_image, transform, sitk.sitkLinear, sitk.sitkFloat32)

    # Get min/max of MRI
    minMaxFilter = sitk.MinimumMaximumImageFilter()
    minMaxFilter.Execute(MR_image)
    minimum = minMaxFilter.GetMinimum()
    maximum = minMaxFilter.GetMaximum()
    print "MRI image:"
    print "Min: %s" % minimum
    print "Max: %s" % maximum

    # Rescale and cast to unsigned 8 bit
    MR_image = sitk.Cast(sitk.RescaleIntensity(MR_image, 0, 255), sitk.sitkUInt8)

    # self.SUVbw_scale_factor = float(maximum / 255)
    self.MR_image = MR_image

    # Write final image for debugging
    # sitk.WriteImage(MR_image, os.path.join("/Users/neil/desktop", "MR_final_UInt8.nii"))

    # # Plot sample slices
    # CT_array = sitk.GetArrayFromImage(CT_image)
    # MR_array = sitk.GetArrayFromImage(MR_image)

    # f = pylab.figure()

    # z = 100 #125
    # y = 200 #266
    # x = 150 #280

    # f.add_subplot(3,1,1)
    # pylab.imshow(CT_array[z,:,:], pylab.cm.Greys_r)
    # pylab.imshow(MR_array[z,:,:], pylab.cm.Greys_r, alpha=0.5)

    # f.add_subplot(3,1,2)
    # pylab.imshow(CT_array[:,y,:], pylab.cm.Greys_r)
    # pylab.imshow(MR_array[:,y,:], pylab.cm.Greys_r, alpha=0.5)

    # f.add_subplot(3,1,3)
    # pylab.imshow(CT_array[:,:,x], pylab.cm.Greys_r)
    # pylab.imshow(MR_array[:,:,x], pylab.cm.Greys_r, alpha=0.5)
      
    # pylab.show()









































