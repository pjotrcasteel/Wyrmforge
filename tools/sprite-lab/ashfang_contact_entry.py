"""Start locomotion from a planted idle without interpolating rendered images."""
import math
import numpy as np

def smooth(t):
    t=max(0.,min(1.,t))
    return t*t*(3-2*t)

def entry_track(chains, offsets, count=160, cycle_frames=64, stride=12.):
    phase=0.
    anchors=[chain[-1].copy() for chain in chains]
    flights=[None]*len(chains)
    records=[]
    for f in range(count):
        blend=smooth((f-24)/32)
        if f: phase+=blend/cycle_frames
        root=phase*stride
        feet=[]
        for i,(chain,offset) in enumerate(zip(chains,offsets)):
            # Every foot begins supported; phase offsets are within stance.
            q=(phase+offset)%1
            stance=q<.7 or blend==0
            if not stance:
                s=(q-.7)/.3
                if flights[i] is None:
                    landing_phase=math.floor(phase+offset)+1-offset
                    landing=chain[-1]+[landing_phase*stride+stride*.35,0]
                    flights[i]=(anchors[i].copy(),landing)
                start,end=flights[i]
                world=start+(end-start)*smooth(s)
                world[1]-=5*math.sin(math.pi*s)**2
            else:
                if flights[i] is not None:
                    anchors[i]=flights[i][1].copy();flights[i]=None
                world=anchors[i].copy()
            feet.append(dict(target=(world-[root,0]).tolist(),world=world.tolist(),stance=stance,phase=q))
        records.append(dict(root=root,phase=phase,blend=blend,feet=feet))
    return records
