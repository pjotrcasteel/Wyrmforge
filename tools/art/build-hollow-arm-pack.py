"""Promote only the three cape-free Hollowed ARM variants for an iterative Hunt slice.

The broken-leg experiments remain separate and are NEVER shipped.
Walk AND attacks come from their own exact 3D source rigs. Derived G1
normal/depth/caster passes use the *same posed vertices* as the RGB frame:
no old walk normals, no alpha overlays or reuse of old pose materials.

The old Hollowed walk/attack/death and Ashling remain untouched as a
fallback and as original authored source. V1 ship is intentionally no
new death pose or C# behaviour; runtime uses old death until approved.
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/"src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/variants"
SRC=ROOT/"art/source/enemies/hollow/rigged-poc/model/local-appearance-004"
EVIDENCE=ROOT/"docs/art/evidence"
DIRECTIONS=("N","NE","E","SE","S","SW","W","NW")
ARM_PACK={
 "standard":"standard",
 "broken-arm-right":"broken-arm-right",
 "one-arm-left":"one-arm-left",
}
N=16
CELL=96

spec=importlib.util.spec_from_file_location("lit_source_renderer",ROOT/"tools/art/export-lit-actor-materials.py")
engine=importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def source(variant,clip):
    if clip=="walk":
        return (
            EVIDENCE/f"hollowed-zombie-reach-v3/{variant}/candidate-walk-eight-directions.png",
            SRC/f"rigged-hollow-zombie-reach-v3-{variant}/sampled-walk.npz",
            SRC/f"rigged-hollow-zombie-reach-v3-{variant}/hollow-rigged.blend",
        )
    return (
        EVIDENCE/f"hollowed-trauma-attack-v1/{variant}/candidate-attack-eight-directions.png",
        SRC/f"rigged-hollow-no-cape-attack-{variant}-preview/sampled-walk.npz",
        SRC/f"rigged-hollow-no-cape-attack-{variant}-preview/hollow-rigged.blend",
    )

def derive(variant,clip,albedo,posed):
    assert albedo.size==(16*CELL,8*CELL)
    alpha=np.asarray(albedo.convert("RGBA"))[:,:,3]
    maps={
        "normal":np.zeros((8*CELL,16*CELL,4),dtype=np.uint8),
        "depth":np.zeros((8*CELL,16*CELL),dtype=np.uint16),
        "caster":np.zeros((8*CELL,16*CELL),dtype=np.uint8),
        "emissive":np.zeros((8*CELL,16*CELL),dtype=np.uint8)
    }
    with np.load(posed) as original:
        positions=np.asarray(original["positions"],dtype=np.float64)
        faces=np.asarray(original["faces"],dtype=np.int32)
        mvp=np.asarray(original["mvp"],dtype=np.float64)
    assert positions.shape[0]>=16 and faces.shape[1]==3 and positions.shape[-1]==3
    model_json=source(variant,"walk")[0].parent/"candidate-manifest.json"
    authored=json.loads(model_json.read_text())
    angles=[f["rotationDegrees"] for f in authored["directions"]]
    assert [f["direction"] for f in authored["directions"]]==list(DIRECTIONS)
    right,up=mvp[0,:3].copy(),mvp[1,:3].copy()
    right/=np.linalg.norm(right)
    up/=np.linalg.norm(up)
    forward=np.cross(right,up);forward/=np.linalg.norm(forward)
    basis=np.stack((right,up,forward))
    min_coverage=1.
    for row,angle in enumerate(angles):
        radians=math.radians(angle)
        cs,sn=math.cos(radians),math.sin(radians)
        rotate=np.array(((cs,-sn,0),(sn,cs,0),(0,0,1)),dtype=np.float64)
        for frame in range(N):
            vertices=positions[frame]@rotate.T
            normals=engine.vertex_normals(vertices,faces,basis)
            screen=engine.project(vertices,mvp,CELL)
            mesh_normals,body_depth,_=engine.rasterize(
                screen,normals,np.zeros(len(vertices),dtype=np.float64),faces,CELL)
            observed=np.isfinite(body_depth)
            sy=slice(row*CELL,(row+1)*CELL)
            sx=slice(frame*CELL,(frame+1)*CELL)
            visible=alpha[sy,sx]>0
            shared=observed&visible
            coverage=np.count_nonzero(shared)/max(1,np.count_nonzero(observed|visible))
            min_coverage=min(min_coverage,coverage)
            # Reject mismatched geometry rather than paint false lighting
            # onto a sprite whose original posed mesh doesn't match.
            if coverage<.90:raise RuntimeError(
                f"Wrong actor normal/source geometry {variant}/{clip}/{row}/{frame}: {coverage:.3f}")
            mesh_normals/=np.maximum(np.linalg.norm(mesh_normals,axis=2,keepdims=True),1e-12)
            mesh_normals[~observed]=[0,0,1]
            rgba=np.zeros((CELL,CELL,4),dtype=np.uint8)
            rgba[:,:,:3]=np.rint((mesh_normals*.5+.5)*255).astype(np.uint8)
            rgba[:,:,3]=visible.astype(np.uint8)*255
            rgba[~visible]=0
            maps["normal"][sy,sx]=rgba
            depth=np.zeros((CELL,CELL),dtype=np.uint16)
            depth[shared]=np.clip(np.rint((body_depth[shared]+1)*32767.5),1,65535).astype(np.uint16)
            maps["depth"][sy,sx]=depth
            maps["caster"][sy,sx]=shared.astype(np.uint8)*255
            # No invented emissive eyes: original Hollowed is NOT an emitter.
    return maps,min_coverage

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    manifest={"schemaVersion":1,"actor":"hollowed","directions":list(DIRECTIONS),
              "cell":CELL,"frames":N,"variants":list(ARM_PACK),"clips":{},
              "brokenLegShipped":False,"runtimeGameplayChanged":False,
              "death":"original approved source only"}
    for variant in ARM_PACK:
        clips={}
        lights={"schemaVersion":1,"actorId":"hollowed",
                "variant":variant,"directions":list(DIRECTIONS),
                "material":{"roughness":.92,"metalness":0,"specular":.12},
                "castsShadow":True,"receivesShadow":True,
                "clips":{}}
        for clip in ("walk","attack"):
            original,posed,rig=source(variant,clip)
            assert original.exists() and posed.exists() and rig.exists(),(variant,clip,original,posed,rig)
            dest=OUT/f"{variant}-{clip}.png"
            image=Image.open(original).convert("RGBA")
            assert image.size==(1536,768)
            image.save(dest)
            maps,coverage=derive(variant,clip,image,posed)
            mapfiles={}
            for name,content in maps.items():
                target=OUT/f"{variant}-{clip}-{name}.png"
                Image.fromarray(content).save(target)
                mapfiles[name]=target.name
            entry={"image":dest.name,"sha256":sha(dest),
                   "frames":N,"cell":CELL,"anchor":[48,72],"worldSize":93,
                   "sourceRig":str(rig.relative_to(ROOT)),
                   "sourcePose":str(posed.relative_to(ROOT)),
                   "sourcePoseSha256":sha(posed),
                   "minimumMeshIoU":coverage,
                   "materials":{k:{"image":v,"sha256":sha(OUT/v)} for k,v in mapfiles.items()}}
            clips[clip]=entry
            lights["clips"][clip]={"albedo":dest.name,**mapfiles,
                "frames":N,"cell":CELL,"anchor":[48,72],"worldSize":93,
                "castShadow":True,"receiveShadow":True,"shadowQuality":"planar-mask-only",
                "source":{"sourceRig":entry["sourceRig"],"sourcePose":entry["sourcePose"],
                          "sourcePoseSha256":entry["sourcePoseSha256"],
                          "albedoSha256":entry["sha256"],
                          "geometryMinIoU":coverage,
                          "normalSha256":sha(OUT/mapfiles["normal"])}}
            print(variant,clip,"derived exact posed albedo + G1 maps, min IoU",f"{coverage:.4f}",flush=True)
        manifest["clips"][variant]=clips
        (OUT/f"{variant}-lit-materials.json").write_text(json.dumps(lights,indent=2)+"\n")
    (OUT/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print("ARM ONLY production selection pack exported: 3 variants, no broken leg.",flush=True)

if __name__=="__main__":
    main()
