import dicom
import pdb
import SimpleITK as sitk
import pylab
import glob
import os
from numpy import *

class RTPET(object):
  def __init__(self, CT_image, PT_dir):
    self.CT_image = CT_image
    self.PT_dir = PT_dir
    self.parse()

  # Convert PET pixel data from BQML units to SUV bw
  # Using pseudocode from QIBA working group: awiki.rsna.org/index.php?title=Standardized_Uptake_Value_(SUV)
  # Returns PET image in SUVbw units
  def convertBQML2SUVbw(self, PT_BQML_image):

    # Get metadata from PET
    PT_file = sorted(glob.glob(os.path.join(self.PT_dir, "PE*.dcm")))[0]
    ds = dicom.read_file(PT_file)

    weight      = int(ds[0x0010,0x1030].value) # in kg

    half_life   = int(ds[0x0054,0x0016][0][0x0018,0x1075].value) # in seconds
    scan_time   = int(ds[0x0008,0x0031].value) # ignoring scan date here, may cause problem if done overnight
    start_time  = int(ds[0x0054,0x0016][0][0x0018,0x1072].value) # radiopharmaceutical start time
    decay_time  = scan_time - start_time
    
    injected_dose = float(ds[0x0054,0x0016][0][0x0018,0x1074].value) # in BQ

    print "Weight: %s" % weight 
    print "Half life: %s" % half_life
    print "Scan time: %s" % scan_time
    print "Start time: %s" % start_time
    print "Decay time: %s" % decay_time
    print "Injected dose: %s" % injected_dose

    decayed_dose = injected_dose * math.pow(2, -decay_time / half_life)
    SUVbw_scale_factor = weight * 1000 / decayed_dose

    print "Decayed dose: %s" % decayed_dose
    print "SUV bw scale factor: %s\n" % SUVbw_scale_factor

    return PT_BQML_image * SUVbw_scale_factor

  # Get transform matrix which defines rotation and translation
  # from PET to CT in docom spatial registration object file
  # Returns rotation and translation as list
  def getTransform(self):
    file_SRO = glob.glob(os.path.join(self.PT_dir, "RE*.dcm"))[0]
    ds = dicom.read_file(file_SRO)
    tfm = ds[0x70,0x308][1][0x0070,0x0309][0][0x0070,0x030a][0][0x3006,0x00c6].value
    tfm = [float(x) for x in tfm]
    tfm = array(tfm).reshape(4,4)
    rotation = tfm[0:3,0:3].ravel().tolist()
    translation = tfm[0:3,3].ravel().tolist()

    return [rotation, translation]

  def printMax(self, image, caption):
    minMaxFilter = sitk.MinimumMaximumImageFilter()
    minMaxFilter.Execute(image)
    maximum = minMaxFilter.GetMaximum()
    print "\n" + caption
    print "Max: %s\n" % maximum
    return maximum

  def parse(self):

    # Load the PET into simple ITK
    reader = sitk.ImageSeriesReader()
    PT_image = sitk.ReadImage(reader.GetGDCMSeriesFileNames(self.PT_dir))

    print "PT origin: %s" % str(PT_image.GetOrigin())
    print "PT direction: %s" % str(PT_image.GetDirection())

    self.printMax(PT_image, "Original PET Image - BQML")

    # Get transform from dicom spatial registration object
    rotation, translation = self.getTransform()
    transform = sitk.AffineTransform(3)
    transform.SetMatrix(rotation)
    transform.SetTranslation(translation)

    # Use inverse of the transform. Not entirely sure why but the registration works perfectly when inversed.
    transform = transform.GetInverse()

    # Resample PET onto CT with linear interpolation and using transform
    PT_image = sitk.Resample(PT_image, self.CT_image, transform)

    self.printMax(PT_image, "Resampled PET Image - BQML")

    # Convert PET units from BQML to SUV bw
    # PT_image = self.convertBQML2SUVbw(PT_image)
    # SUV_max = self.printMax(PT_image, "Resampled PET Image - SUVbw")

    # Rescale and cast to unsigned 8 bit
    PT_image = sitk.Cast(sitk.RescaleIntensity(PT_image), sitk.sitkUInt8)

    # Threshold to SUVbw 0-4 for highlighting
    # PT_image = sitk.Cast(sitk.IntensityWindowing(PT_image, 0, 10, 0, 255), sitk.sitkUInt8)

    self.SUVbw_scale_factor = 0 # float(SUV_max / 255)
    self.PT_image = PT_image

    # Write final PET image for debugging
    # sitk.WriteImage(PT_image, os.path.join("/Users/neil/desktop", "PET_final_UInt8.nii"))

    # Plot sample slices
    # CT_array = sitk.GetArrayFromImage(CT_image)
    # PT_array = sitk.GetArrayFromImage(PT_image)

    # f = pylab.figure()

    # z = 100 #125
    # y = 200 #266
    # x = 150 #280

    # f.add_subplot(3,1,1)
    # pylab.imshow(CT_array[z,:,:], pylab.cm.Greys_r)
    # pylab.imshow(PT_array[z,:,:], pylab.cm.hot, alpha=0.5)

    # f.add_subplot(3,1,2)
    # pylab.imshow(CT_array[:,y,:], pylab.cm.Greys_r)
    # pylab.imshow(PT_array[:,y,:], pylab.cm.hot, alpha=0.5)

    # f.add_subplot(3,1,3)
    # pylab.imshow(CT_array[:,:,x], pylab.cm.Greys_r)
    # pylab.imshow(PT_array[:,:,x], pylab.cm.hot, alpha=0.5)
      
    # pylab.show()

















