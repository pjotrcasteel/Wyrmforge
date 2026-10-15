"""Art-directed injury variants. Same skeleton, fixed left-side timing bias."""
import json
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parent
source = json.loads((ROOT/'cleaned-motion.json').read_text())
base = np.array(source['frames'])
reports = {}
for name, severity in [('hurt', .55), ('critical', 1.)]:
    duration=source['duration']
    points = base.copy()
    # Rotate the complete upper subtree around root: every edge retains its length.
    # Forward guarding + lean toward the healthy right leg. No leg displacement.
    forward, lateral = np.deg2rad([12*severity, 5*severity])
    cx,sx,cz,sz=np.cos(forward),np.sin(forward),np.cos(lateral),np.sin(lateral)
    rotation=np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]) @ np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
    points[:,11:] = (points[:,11:]-points[:,0:1]) @ rotation.T + points[:,0:1]
    rounded=np.round(points,6)
    err=max(float(np.abs(np.linalg.norm(rounded[:,b]-rounded[:,a],axis=1)-np.linalg.norm(base[:,b]-base[:,a],axis=1)).max()) for a,b in source['bones'])
    assert err < 3e-6
    assert np.array_equal(rounded[:,:11],base[:,:11])
    amplitude=0.0  # Injury is visual only: root, foot timing and travel remain identical.
    t=np.arange(100000)/100000
    phase=(t+amplitude*np.sin(2*np.pi*(t-.515625)))%1
    ids=np.floor(phase*len(base)).astype(int)
    contacts=np.array(source['contacts'])[ids]
    report={'visualOnly':True,'rootTrajectoryUnchanged':True,'strideUnchanged':True,'injuredSide':'left','severity':severity,'durationSeconds':duration,'phaseWarpAmplitude':amplitude,'minimumPhaseRate':1-2*np.pi*amplitude,'leftSupportFraction':float(contacts[:,0].mean()),'rightSupportFraction':float(contacts[:,1].mean()),'maxExportBoneLengthErrorMeters':err,'legCoordinatesUnchanged':True,'forwardGuardDegrees':12*severity,'healthySideLeanDegrees':5*severity}
    result={**source,'frames':rounded.tolist(),'duration':duration,'fps':len(base)/duration,'injury':report}
    (ROOT/f'{name}-motion.json').write_text(json.dumps(result,separators=(',',':'))+'\n')
    reports[name]=report
(ROOT/'injury-validation.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps(reports,indent=2))
