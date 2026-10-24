#!/usr/bin/env python3
"""Review CMU human walking capture; NEVER substitutes for actual wizard art."""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import argparse
import json
import math
import re
import numpy as np
from PIL import Image, ImageDraw, ImageFont

EXPECTED=("Hips","LeftUpLeg","LeftLeg","LeftFoot","RightUpLeg","RightLeg","RightFoot","Head")
LINKS=[("Hips","LeftUpLeg"),("LeftUpLeg","LeftLeg"),("LeftLeg","LeftFoot"),
       ("LeftFoot","LeftToeBase"),("Hips","RightUpLeg"),("RightUpLeg","RightLeg"),
       ("RightLeg","RightFoot"),("RightFoot","RightToeBase"),("Hips","LowerBack"),
       ("LowerBack","Spine"),("Spine","Spine1"),("Spine1","Neck"),
       ("Neck","Neck1"),("Neck1","Head"),("Spine1","LeftShoulder"),
       ("LeftShoulder","LeftArm"),("LeftArm","LeftForeArm"),("LeftForeArm","LeftHand"),
       ("Spine1","RightShoulder"),("RightShoulder","RightArm"),
       ("RightArm","RightForeArm"),("RightForeArm","RightHand")]

@dataclass
class Joint:
    name:str
    parent:int|None
    offset:np.ndarray
    start:int
    channels:tuple[str,...]

@dataclass
class Motion:
    joints:list[Joint]
    frames:np.ndarray
    dt:float

def load_bvh(path:Path)->Motion:
    lines=path.read_text(encoding="utf8",errors="replace").splitlines()
    if not lines or lines[0].strip()!="HIERARCHY":raise ValueError("Missing BVH hierarchy")
    joints=[];stack=[];pending=None;channels=0;i=1
    while i<len(lines):
        line=lines[i].strip()
        if line=="MOTION":break
        if line.startswith(("ROOT ","JOINT ")):
            name=line.split(None,1)[1]
            parent=next((x for x in reversed(stack) if x is not None),None)
            if any(j.name==name for j in joints):raise ValueError("Repeated joint "+name)
            pending=len(joints);joints.append(Joint(name,parent,np.zeros(3),channels,()))
        elif line.startswith("End Site"):pending=None
        elif line=="{":stack.append(pending)
        elif line=="}":
            if not stack:raise ValueError("Unbalanced hierarchy")
            stack.pop()
        elif line.startswith("OFFSET ") and stack and stack[-1] is not None:
            joints[stack[-1]].offset=np.array([float(x) for x in line.split()[1:4]])
        elif line.startswith("CHANNELS ") and stack and stack[-1] is not None:
            parts=line.split();size=int(parts[1]);fields=tuple(parts[2:])
            if size!=len(fields):raise ValueError("Bad channel count")
            joints[stack[-1]].channels=fields;joints[stack[-1]].start=channels
            channels+=size
        i+=1
    if i+2>=len(lines):raise ValueError("No motion frames")
    count=re.search(r"Frames\s*:\s*(\d+)",lines[i+1])
    step=re.search(r"Frame Time\s*:\s*([\d.]+)",lines[i+2])
    if not count or not step:raise ValueError("Missing frame metadata")
    count=int(count.group(1));dt=float(step.group(1))
    data=np.fromstring("\n".join(lines[i+3:]),sep=" ")
    if dt<=0 or count<40 or channels<12 or data.size!=count*channels:
        raise ValueError("Invalid full-size BVH motion")
    if not set(EXPECTED).issubset({j.name for j in joints}):
        raise ValueError("Missing human bones")
    return Motion(joints,data.reshape(count,channels),dt)

def rotation(axis,angle):
    c,s=math.cos(math.radians(angle)),math.sin(math.radians(angle))
    if axis=="X":return np.array([[1,0,0],[0,c,-s],[0,s,c]])
    if axis=="Y":return np.array([[c,0,s],[0,1,0],[-s,0,c]])
    return np.array([[c,-s,0],[s,c,0],[0,0,1]])

def pose(motion,index):
    row=motion.frames[index];positions=[];rotations=[];points={}
    for j in motion.joints:
        offset=j.offset.copy();rot=np.eye(3)
        for k,key in enumerate(j.channels):
            value=row[j.start+k]
            if key.endswith("position"):offset["XYZ".index(key[0])]+=value
            elif key.endswith("rotation"):rot=rot@rotation(key[0],value)
        if j.parent is None:pos=offset;basis=rot
        else:
            pos=positions[j.parent]+rotations[j.parent]@offset
            basis=rotations[j.parent]@rot
        positions.append(pos);rotations.append(basis);points[j.name]=pos
    return points

def select_cycle(motion):
    n=len(motion.frames);fps=1/motion.dt
    start_step=max(1,int(fps*.09));lag_step=max(1,int(fps*.035))
    starts=range(min(20,n//8),max(min(n-20,int(n*.55)),min(20,n//8)+1),start_step)
    lags=range(max(12,int(fps*.75)),min(n-15,int(fps*1.9)),lag_step)
    keys=("LeftFoot","RightFoot","LeftLeg","RightLeg","LeftUpLeg","RightUpLeg","Spine1","LeftArm","RightArm")
    names={j.name for j in motion.joints}
    keys=tuple(k for k in keys if k in names)
    cache={}
    def vec(i):
        if i not in cache:
            p=pose(motion,i)
            cache[i]=np.concatenate([p[k]-p["Hips"] for k in keys])
        return cache[i]
    best=None
    for a in starts:
        for lag in lags:
            b=a+lag
            if b+2>=n:continue
            travel=np.linalg.norm(vec(a+lag//2)-vec(a))
            if travel<.9:continue
            mismatch=np.linalg.norm(vec(a)-vec(b))
            velocity=np.linalg.norm((vec(a+2)-vec(a))-(vec(b+2)-vec(b)))
            score=(mismatch+.45*velocity)/travel
            if best is None or score<best[0]:best=(score,a,b)
    if best is None:raise ValueError("No walk period with moving feet")
    return best[1],best[2],float(best[0])

def render(source:Path,destination:Path):
    motion=load_bvh(source);start,end,seam=select_cycle(motion)
    selection=[start+int((end-start)*i/16) for i in range(16)]
    poses=[pose(motion,i) for i in selection]
    h=np.mean([np.linalg.norm(p["Head"]-p["Hips"])+np.linalg.norm(p["Hips"]-p["LeftFoot"]) for p in poses])
    if h<=0:raise ValueError("Invalid body height")
    destination.mkdir(parents=True,exist_ok=True)
    frames=[];scale=162/h
    for index,p in enumerate(poses):
        im=Image.new("RGB",(240,256),(13,15,21));draw=ImageDraw.Draw(im)
        def xy(v):
            q=v-p["Hips"]
            return (int(120+(q[0]*.85+q[2]*.38)*scale),int(169-(q[1]*.95-q[2]*.12)*scale))
        for a,b in LINKS:
            if a not in p or b not in p:continue
            color="#d9b16c" if a.startswith("Left") or b.startswith("Left") else (
                "#8fc2d0" if a.startswith("Right") or b.startswith("Right") else "#eee5d4")
            draw.line((xy(p[a]),xy(p[b])),fill=color,width=5)
        for name in ("LeftFoot","RightFoot","LeftLeg","RightLeg","Hips","Head","LeftToeBase","RightToeBase"):
            if name not in p:continue
            x,y=xy(p[name]);draw.ellipse((x-4,y-4,x+4,y+4),fill="#f3e7d5")
        draw.line((12,229,228,229),fill="#3a3539",width=2)
        draw.text((8,8),f"CMU 07_04 | real capture {index+1:02d}/16",fill="#d9b16c")
        draw.text((8,240),"REFERENCE MOTION - NOT WIZARD ART",fill="#b8aaa3")
        im.save(destination/f"frame-{index:02d}.png");frames.append(im)
    frames[0].save(destination/"capture-walk.gif",save_all=True,append_images=frames[1:],duration=85,loop=0,disposal=2)
    sheet=Image.new("RGB",(960,1024),(13,15,21))
    for i,im in enumerate(frames):sheet.paste(im,((i%4)*240,(i//4)*256))
    sheet.save(destination/"contact-sheet.png")
    report={"source":"CMU Graphics Lab subject 07 trial 04: slow walk, BVH by Bruce Hahne",
        "frameCountSource":len(motion.frames),"fpsSource":round(1/motion.dt,3),
        "originalSourceFrameWindow":[start,end],"durationSec":round((end-start)*motion.dt,3),
        "sourceSamples":selection,"cycleSeamScore":round(seam,4),
        "genuineCapturedMotion":True,"nativeGameRecording":False,
        "retargetedToWizard":False,"approvedAnimation":False,"approvedCharacterArt":False}
    (destination/"motion-metadata.json").write_text(json.dumps(report,indent=2)+"\n")
    return report

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--bvh",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    options=parser.parse_args()
    print(json.dumps(render(options.bvh,options.output),indent=2))
