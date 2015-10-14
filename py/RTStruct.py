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

  def parseRemove(self, s):
    ra = s.split(',')
    ra = map(str.strip, ra)
    return ra

  def parseRename(self, s):
    ra = s.split(',')
    ra = map(str.strip, ra)

    rd = {}
    for r in ra:
      r = r.split('=')
      r = map(str.strip, r)
      oldname, newname = r
      rd[oldname] = newname

    return rd

  def parse(self):

    remove_list     = self.parseRemove(self.remove_str) if self.remove_str else []
    rename_dict     = self.parseRename(self.rename_str) if self.rename_str else {}

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
      if re.search(r'\biso\b|dc=0', n, re.IGNORECASE) or (n in remove_list):
        print "Removed region: %s" % n
        del regions[regionIndex]
        continue

      # Rename regions if needed
      if n in rename_dict:
        regions[regionIndex]['name'] = rename_dict[n]
        print "Renamed region: %s --> %s" % (n, rename_dict[n])

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




