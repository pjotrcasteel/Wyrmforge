"""Constrained arm retarget for mage blocking; no painted sprite generation."""
import json
from pathlib import Path
import numpy as np
from clean_motion import knee_for
ROOT=Path(__file__).resolve().parent
reports={}
for state in ('cleaned','hurt','critical'):
    data=json.loads((ROOT/f'{state}-motion.json').read_text())
    original=np.array(data['frames']); points=original.copy(); names=data['jointNames']; ids={n:i for i,n in enumerate(names)}
    grips=[]
    for frame in points:
        # Body-relative carry grip. Staff is carried clear of the floor, not planted.
        shoulder=frame[ids['rclavicle']].copy()
        grip=shoulder+np.array([-.12,-.36,.24])
        elbow=frame[ids['rhumerus']].copy(); wrist=frame[ids['rradius']].copy()
        target=grip-(frame[ids['rhand']]-wrist)
        frame[ids['rhumerus']]=knee_for(shoulder,elbow,wrist,target)
        delta=target-wrist
        for n in ('rradius','rwrist','rhand','rfingers','rthumb'):frame[ids[n]]+=delta
        grips.append(grip)
        severity=data.get('injury',{}).get('severity',0)
        if severity:
            shoulder=frame[ids['lclavicle']].copy()
            elbow=frame[ids['lhumerus']].copy(); wrist=frame[ids['lradius']].copy()
            guard=shoulder+np.array([-.18,-.32,.19])
            hand=frame[ids['lhand']].copy()
            target=(hand*(1-severity)+guard*severity)-(hand-wrist)
            frame[ids['lhumerus']]=knee_for(shoulder,elbow,wrist,target)
            delta=target-wrist
            for n in ('lradius','lwrist','lhand','lfingers','lthumb'):frame[ids[n]]+=delta
    error=max(float(np.abs(np.linalg.norm(points[:,b]-points[:,a],axis=1)-np.linalg.norm(original[:,b]-original[:,a],axis=1)).max()) for a,b in data['bones'])
    griperror=float(np.linalg.norm(points[:,ids['rhand']]-grips,axis=1).max())
    assert error<1e-8 and griperror<1e-8
    assert np.array_equal(points[:,:11],original[:,:11])
    rounded=np.round(points,6)
    rounded_error=max(float(np.abs(np.linalg.norm(rounded[:,b]-rounded[:,a],axis=1)-np.linalg.norm(original[:,b]-original[:,a],axis=1)).max()) for a,b in data['bones'])
    assert rounded_error<3e-6
    data['frames']=rounded.tolist();data['mage']={'staffHand':'right','staffMode':'carried','staffBaseOffset':[0,-.70,0],'staffTipOffset':[.06,.95,.025]}
    reports[state]={'maxBoneLengthChangeMeters':error,'maxHandGripErrorMeters':griperror,'legCoordinatesUnchanged':True,'exportedMaxBoneLengthChangeMeters':rounded_error,'staffGroundClearanceMeters':float(points[:,ids['rhand'],1].min()-.70)}
    assert reports[state]['staffGroundClearanceMeters']>0
    (ROOT/f'mage-{state}-motion.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
(ROOT/'mage-validation.json').write_text(json.dumps(reports,indent=2)+'\n')
print(json.dumps(reports,indent=2))
