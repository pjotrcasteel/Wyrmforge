#!/usr/bin/env python3
"""Bundle actual recorded review frames; never describe a prototype as final art."""
from __future__ import annotations
import argparse
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

FRAMES=16
README="""WyrmForge wizard - recorded ART REVIEW (REJECTED prototype)

This ZIP contains 16 genuinely rendered frames and a recorded MP4/GIF
from the native editable Blender wizard SOURCE. It is NOT a live game recording,
and these source images are NOT accepted player spritesheets.

The procedural clay-like wizard shown here was explicitly rejected.
The Gothic wizard in approved-gothic-wizard.webp is the desired art target.
DO NOT replace the live player with the rejected model or mark it approved.

The frame-accurate GIF and MP4 show the original render sequence, not poses
synthesized by image interpolation. MP4 is looped only for easier inspection.
The original .blend is historical technical evidence, not the final art base.

PR #335 keeps the production integration disabled until the original Gothic
sprite/rig, eight directions, idle/walk/cast/hurt/death, six school staffs,
mobile testing and common GPU lighting are all accepted.
"""

def build(source: Path, destination: Path, reference: Path, revision: str) -> dict:
    if not revision.strip():
        raise ValueError("A source revision is mandatory")
    paths=[source/"walk-16"/f"frame-{i:02d}.png" for i in range(FRAMES)]
    mandatory=[*paths,source/"wizard-editable.blend",
               source/"wizard-blender-validation.json",
               source/"walk-review"/"motion-loop.gif",
               source/"walk-review"/"motion-review.json"]
    missing=[str(p) for p in mandatory if not p.is_file() or p.stat().st_size==0]
    if missing:
        raise FileNotFoundError("Missing actual render/source evidence: "+", ".join(missing))
    if not reference.is_file():
        raise FileNotFoundError("Approved Gothic reference preview is missing: "+str(reference))
    evidence=json.loads((source/"wizard-blender-validation.json").read_text())
    if evidence.get("bones")!=22:
        raise ValueError("Unexpected native source report: not the audited wizard skeleton")
    with tempfile.TemporaryDirectory(prefix="wizard-record-") as tmp:
        mp4=Path(tmp)/"wizard-prototype-original-walk.mp4"
        args=["ffmpeg","-hide_banner","-loglevel","error","-y",
              "-framerate","12","-start_number","0",
              "-i",str(source/"walk-16"/"frame-%02d.png"),
              "-vf","format=yuv420p","-c:v","libx264",
              "-preset","veryfast","-crf","22","-pix_fmt","yuv420p",
              str(mp4)]
        subprocess.run(args,check=True,capture_output=True)
        if not mp4.is_file() or mp4.stat().st_size<1000:
            raise RuntimeError("No valid MP4 recording produced")
        files=[
            (mp4,"recording/original-16-frame-walk.mp4"),
            (reference,"reference/approved-gothic-wizard.webp"),
            (source/"wizard-editable.blend","rejected-source/wizard-editable.blend"),
            (source/"wizard-blender-validation.json","validation/blender-report.json"),
            (source/"walk-review"/"motion-loop.gif","recording/original-16-frame-walk.gif"),
            (source/"walk-review"/"motion-review.json","validation/motion-report.json")
        ]
        files.extend((p,"frames/"+p.name) for p in paths)
        manifest={
            "kind":"wizard-art-review-recording",
            "revision":revision,
            "realGameRecording":False,
            "finalArtAccepted":False,
            "previousPrototypeRejected":True,
            "sourceFrames":FRAMES,
            "originalFrameHashes":{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in paths},
            "guide":"README.txt"
        }
        destination.parent.mkdir(parents=True,exist_ok=True)
        # Create archive only after every source and recording is complete.
        with ZipFile(destination,"w",ZIP_DEFLATED,compresslevel=7) as archive:
            archive.writestr("README.txt",README)
            archive.writestr("STATUS.json",json.dumps(manifest,indent=2)+"\n")
            for path,name in files:
                archive.write(path,name)
        with ZipFile(destination) as archive:
            error=archive.testzip()
            if error:
                destination.unlink(missing_ok=True)
                raise ValueError("Damaged recorded ZIP entry "+error)
    return {"archive":str(destination),"recordedFrames":FRAMES,
            "artAccepted":False,"realGameplayCaptured":False}

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",type=Path,required=True)
    parser.add_argument("--destination",type=Path,required=True)
    parser.add_argument("--reference",type=Path,required=True)
    parser.add_argument("--revision",required=True)
    options=parser.parse_args()
    print(json.dumps(build(options.source,options.destination,options.reference,options.revision)))
