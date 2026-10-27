"""Inventory the ten owner uploads; measure registration without modifying pixels.
Run: python tools/art/ingest_selected_town.py --input /path/to/uploads
SIFT affine fitting is evidence only. It never warps or exports a runtime texture.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'src/Wyrmforge.Presentation.Web/wwwroot/art/town/selected/2026-10-27'
ROLES = {
 '844E404F-ADAD-4D35-A902-894162D6011B.jpeg': ('clay-reference', 'Monochrome sculpt-style architectural reference; contains directional shading and background.'),
 'E88D2BDD-412A-41EC-B707-C9ADCA4A1C34.jpeg': ('depth-style-reference', 'Monochrome depth-style visualization; unverified estimate, not physical depth or unlit albedo.'),
 '8B4BA6F4-3B4B-4499-975E-015565C67BA5.jpeg': ('combined-grid-reference', 'Combined night lighting with baked coordinate grid; never a runtime material.'),
 '25879CCE-1AFB-42DE-A1B9-0047FAE8BE05.jpeg': ('normal-style-reference', 'Normal-style color visualization; unverified estimate, not ground-truth normals.'),
 '3E7DC52A-0D09-442C-85D1-155C4C6C694A.jpeg': ('hall', 'Lower-right Hall lighting reference; other architecture is still faintly visible.'),
 '6E9455CC-C09E-4AC1-B3B0-9E6FBA1FD4BB.jpeg': ('codex', 'Upper-right Codex lighting reference; other architecture is still faintly visible.'),
 'A5C9AC1E-1EDA-4E6B-894E-33B7B6197728.jpeg': ('blacksmith', 'Lower-left forge and chimney reference; faint residual lights exist elsewhere.'),
 '0AD50A56-B979-4658-9E91-4E1E54C82CE6.jpeg': ('nexus', 'Upper-left Nexus reference with neutral-white dome/portal magic; faint residual lights elsewhere.'),
 '3B62CD6B-1248-4D85-8B5D-98A1EF34B1D1(1).jpeg': ('day-reference', 'Full-color daytime reference with landscape; not neutral/unlit, no night background use.'),
 'A4829886-EEE9-41CB-8737-36739F87CB78.jpeg': ('common', 'Gate, public square and well reference; chimney dark; faint building-light residue is not an enabled source.'),
}

def sha(path):
 return hashlib.sha256(path.read_bytes()).hexdigest()

def registration(reference, target):
 sift = cv2.SIFT_create(nfeatures=5000)
 def features(path):
  im = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
  return sift.detectAndCompute(im, None)
 a, da = features(reference); b, db = features(target)
 matches = cv2.BFMatcher().knnMatch(da, db, k=2)
 good = [m for m,n in matches if m.distance < .7*n.distance]
 if len(good) < 10:
  return {'status':'insufficient-correspondences','matches':len(good),'pixelRegistered':False}
 p = np.float32([a[m.queryIdx].pt for m in good]); q = np.float32([b[m.trainIdx].pt for m in good])
 matrix, mask = cv2.estimateAffinePartial2D(p,q,method=cv2.RANSAC,ransacReprojThreshold=2,maxIters=5000)
 if matrix is None:
  return {'status':'fit-failed','pixelRegistered':False}
 residual = np.linalg.norm(p @ matrix[:,:2].T + matrix[:,2] - q,axis=1)
 inside = mask[:,0].astype(bool)
 return {'status':'measured-reference-only','pixelRegistered':False,
  'method':'SIFT ratio .7 / similarity RANSAC 2px; no image resampling',
  'referenceToTargetAffine':matrix.round(6).tolist(),'matches':len(good),'inliers':int(inside.sum()),
  'medianInlierErrorPx':round(float(np.median(residual[inside])),3),
  'p95InlierErrorPx':round(float(np.percentile(residual[inside],95)),3),
  'allMatchMedianErrorPx':round(float(np.median(residual)),3),
  'warning':'Similarity-fit inliers do not prove exact full-scene pixel registration or unchanged architecture.'}

def ingest(folder):
 OUTPUT.mkdir(parents=True,exist_ok=True)
 canonical=ROOT/'src/Wyrmforge.Presentation.Web/wwwroot/art/town/night-active.webp'
 anchor=folder/'A4829886-EEE9-41CB-8737-36739F87CB78.jpeg'
 entries=[]
 for filename,(role,note) in ROLES.items():
  path=folder/filename
  with Image.open(path) as im:
   dimensions=list(im.size);mode=im.mode;alpha='A' in im.getbands()
  destination=OUTPUT/filename
  shutil.copyfile(path,destination)
  entry={'file':filename,'sha256':sha(path),'dimensions':dimensions,'mode':mode,'hasAlpha':alpha,
   'crop':[0,0,*dimensions],'role':role,'approvalStatus':'owner-selected-reference',
   'runtimeMaterialApproved':False,'usage':'reference-only','notes':note,
   'canonicalRegistration':registration(path,canonical),
   'commonReferenceRegistration':registration(path,anchor)}
  assert sha(destination)==entry['sha256'];entries.append(entry)
 report={'schemaVersion':1,'selectedAt':'2026-10-27','attribution':'Exact owner-supplied selected uploads. Prior source authorship not supplied; no third-party attribution invented.',
  'canonicalScene':{'file':'art/town/night-active.webp','dimensions':[1672,941],'sha256':sha(canonical)},
  'sourcePolicy':'Only these ten uploads are this selection. No older experiments substituted.',
  'registrationDecision':'REFERENCE ONLY. No genuinely unlit color baseline supplied; JPEG encodings and similar landmarks cannot justify full-frame RGB subtraction. No additive scene frames, estimated normals or depth installed.',
  'missingRoles':['genuinely-unlit-color-base','ungridded-combined-night'],
  'duplicateHashes':len({e['sha256'] for e in entries})!=len(entries),'images':entries}
 (OUTPUT/'manifest.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({e['role']:e['canonicalRegistration'] for e in entries},indent=2))

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--input',type=Path,required=True);ingest(p.parse_args().input)
