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

  def convertBQML2SUV(self, PT_BQML_image):

    # Get metadata from PET
    PT_file = sorted(glob.glob(os.path.join(self.PT_dir, "PE*.dcm")))[0]
    ds = dicom.read_file(PT_file)

    weight      = int(ds[0x0010,0x1030].value) # in kg

    half_life   = int(ds[0x0054,0x0016][0][0x0018,0x1075].value) # in seconds
    scan_time   = int(ds[0x0008,0x0031].value) # ignoring scan date here, may cause problem if done overnight
    start_time  = int(ds[0x0054,0x0016][0][0x0018,0x1072].value) # radiopharmaceutical start time
    decay_time  = scan_time - start_time
    
    injected_dose = float(ds[0x0054,0x0016][0][0x0018,0x1074].value) # in BQ

    print "Half life: %s" % half_life
    print "Scan time: %s" % scan_time
    print "Start time: %s" % start_time
    print "Decay time: %s" % decay_time
    print "Injected dose: %s" % injected_dose

    decayed_dose = injected_dose * math.pow(2, -decay_time / half_life)
    SUVbw_scale_factor = weight * 100 / decayed_dose

    print "Decayed dose: %s" % decayed_dose
    print "SUV bw scale factor: %s" % SUVbw_scale_factor

    return PT_BQML_image * SUVbw_scale_factor

  def getTransform(self):
    file_SRO = glob.glob(os.path.join(self.PT_dir, "RE*.dcm"))[0]
    ds = dicom.read_file(file_SRO)
    tfm = ds[0x70,0x308][1][0x0070,0x0309][0][0x0070,0x030a][0][0x3006,0x00c6].value
    tfm = [float(x) for x in tfm]
    return tfm



  def parse(self):

    # Load the PET into simple ITK
    reader = sitk.ImageSeriesReader()
    reader.SetFileNames(glob.glob(os.path.join(self.PT_dir, "PE*.dcm")))
    PT_image = reader.Execute()

    ## Write original PET image
    # sitk.WriteImage(sitk.Cast(PT_image, sitk.sitkUInt16), [os.path.join("/Users/neil/desktop", "PET_original", "PET_original_{0:03d}.dcm".format(i)) for i in range(PT_image.GetSize()[2])])
    # sitk.WriteImage(sitk.Cast(PT_image, sitk.sitkUInt8), os.path.join("/Users/neil/desktop", "PET_original_UInt8.nii"))
    # sitk.WriteImage(sitk.Cast(PT_image, sitk.sitkUInt16), os.path.join("/Users/neil/desktop", "PET_original_UInt16.nii"))


    # Get transform from dicom SRO
    tfm_params = self.getTransform()
    transform = sitk.Transform()
    transform.SetParameters(tfm_params)

    
    # Resample PET onto CT
    # resampleFilter = sitk.ResampleImageFilter()
    # resampleFilter.SetReferenceImage(CT_image)
    # resampleFilter.SetTransform(transform)
    # PT_image = resampleFilter.Execute(PT_image)

    
    # Get min/max
    minMaxFilter = sitk.MinimumMaximumImageFilter()
    minMaxFilter.Execute(PT_image)
    print "Original BQML PET image"
    print "Min: %s" % minMaxFilter.GetMinimum()
    print "Max: %s" % minMaxFilter.GetMaximum()



    PT_image = self.convertBQML2SUV(PT_image)



    minMaxFilter.Execute(PT_image)
    print "SUV PET image"
    print "Min: %s" % minMaxFilter.GetMinimum()
    print "Max: %s" % minMaxFilter.GetMaximum()



    # SUV bw 0-4
    PT_image = sitk.IntensityWindowing(PT_image, 0, 4, 0, 255)
    PT_image = sitk.Cast(PT_image, sitk.sitkUInt8)

    self.PT_image = PT_image

    ## Write final PET image
    # sitk.WriteImage(PT_image, os.path.join("/Users/neil/desktop", "PET_final.nii"))
    # sitk.WriteImage(PT_image, [os.path.join("/Users/neil/desktop", "PET_final", "PET_final_{0:03d}.dcm".format(i)) for i in range(PT_image.GetSize()[2])])



    # Plot sample slices
    CT_array = sitk.GetArrayFromImage(CT_image)
    PT_array = sitk.GetArrayFromImage(PT_image)

    f = pylab.figure()

    i = 1
    for n in range(0,3):
      z = [50, 100, 125][n]

      f.add_subplot(3,2,i)
      pylab.imshow(CT_array[z,:,:], pylab.cm.Greys_r)
      i += 1

      f.add_subplot(3,2,i)
      pylab.imshow(PT_array[z,:,:], pylab.cm.afmhot)
      i += 1
    pylab.show()


    # f.add_subplot(3,2,1)
    # pylab.imshow(CT_array[CT_size[2]/2,:,:], pylab.cm.Greys_r)

    # f.add_subplot(3,2,2)
    # pylab.imshow(PT_array[PT_size[2]/2,:,:], pylab.cm.Greys_r)

    # f.add_subplot(3,2,3)
    # pylab.imshow(CT_array[:,CT_size[1]/2,:], pylab.cm.Greys_r)

    # f.add_subplot(3,2,4)
    # pylab.imshow(PT_array[:,PT_size[1]/2,:], pylab.cm.Greys_r)

    # f.add_subplot(3,2,5)
    # pylab.imshow(CT_array[:,:,CT_size[0]/2], pylab.cm.Greys_r)

    # f.add_subplot(3,2,6)
    # pylab.imshow(PT_array[:,:,PT_size[0]/2], pylab.cm.Greys_r)
      
    # pylab.show()
    












CT_dir = "/Users/neil/desktop/dataset/DP_17333717/CT"
PT_dir = "/Users/neil/desktop/dataset/DP_17333717/PTCT"

reader = sitk.ImageSeriesReader()
reader.SetFileNames(glob.glob(os.path.join(CT_dir, "CT*.dcm")))
CT_image = reader.Execute()

rtPET = RTPET(CT_image, PT_dir)

















