import dicom
from numpy import *
import pdb
import re

class RTStruct(object):
  def __init__(self, filename, remove_str, rename_str):
    self.filename = filename
    self.remove_str = remove_str
    self.rename_str = rename_str
    self.parse()

  def parse(self):


    ds = dicom.read_file(self.filename)

    # Get regions
    regions = []
    for r in ds.StructureSetROISequence:
      n = r.ROIName
      if n == 'BODY':
        n = 'Body'
      regions.append( { "ROINumber": int(r.ROINumber), "name": n } )

    # Get contour data
    contours = []
    for ROIContourSequence in ds.ROIContourSequence:
      ReferencedROINumber = int(ROIContourSequence.ReferencedROINumber)
      ROIDisplayColor = ','.join(str(x) for x in ROIContourSequence.ROIDisplayColor)

      regionIndex = 0
      for i, dic in enumerate(regions):
        if dic["ROINumber"] == ReferencedROINumber:
          regionIndex = i
          regions[i]["color"] = ROIDisplayColor
          break

      # Skip specific regions based on name
      n = regions[regionIndex]['name']
      if re.search(r'\biso\b|dc=0', n, re.IGNORECASE):
        print "Removed region: %s" % n
        del regions[regionIndex]
        continue


      try: 
        ROIContourSequence.ContourSequence
      except AttributeError:
        print "No contour sequence. Skipping this region."
        continue

      for ContourSequence in ROIContourSequence.ContourSequence:
        ContourData = [float(x) for x in ContourSequence.ContourData]

        # Remove z coordinates
        del ContourData[2::3]

        points = []
        for i in range(0, len(ContourData), 2):
          points.append( { "x": ContourData[i], "y": ContourData[i+1] } )

        imageSlice = str(ContourSequence.ContourImageSequence[0].ReferencedSOPInstanceUID)
        sliceIndex = int(imageSlice.split('.')[-1])

        contours.append( { "points": points, "sliceIndex": sliceIndex, "ROINumber": regions[regionIndex]["ROINumber"], "color": ROIDisplayColor} )

    self.regions = regions
    self.contours = contours

  def convertPatientToPixelCoordinates(self, origin, spacing):
    origin = map(int, origin)
    originVector = array(origin[0:2])

    for c in self.contours:
      pixelPoints = []
      for point in c["points"]:
        pointVector = array([point["x"], point["y"]])

        pointVector = subtract(pointVector, originVector)

        x = int( math.ceil( pointVector[0] / spacing ) )
        y = int( math.ceil( pointVector[1] / spacing ) )
        pixelPoints.append( { "x": x, "y": y } )

      c["points"] = pixelPoints




