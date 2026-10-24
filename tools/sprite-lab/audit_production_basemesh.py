#!/usr/bin/env python3
"""Inspect Blender Studio CC0 human source meshes. This is NOT a wizard generator."""
import argparse
import json
import sys
from pathlib import Path
import bpy

def inspect(source_root, output):
    files=sorted(source_root.rglob("*.blend"))
    if not files:
        raise RuntimeError("No Blender Studio CC0 .blend source found")
    assets=[]
    errors=[]
    for path in files[:20]:
        try:
            bpy.ops.wm.open_mainfile(filepath=str(path.resolve()))
            meshes=[]
            for ob in bpy.data.objects:
                if ob.type!="MESH" or not ob.data.vertices: continue
                mesh=ob.data
                faces=len(mesh.polygons)
                quads=sum(1 for f in mesh.polygons if len(f.vertices)==4)
                meshes.append({
                    "name":ob.name, "vertices":len(mesh.vertices),
                    "faces":faces, "quadRatio":round(quads/max(faces,1),4),
                    "uvLayers":[u.name for u in mesh.uv_layers],
                    "shapeKeys":len(mesh.shape_keys.key_blocks) if mesh.shape_keys else 0,
                    "modifiers":[m.type for m in ob.modifiers]
                })
            meshes.sort(key=lambda x:x["vertices"],reverse=True)
            assets.append({"blendFile":path.name,"meshes":meshes})
        except Exception as exc:
            errors.append({"file":path.name,"error":str(exc)})
    best=max((m for a in assets for m in a["meshes"]),
             key=lambda m:m["vertices"],default=None)
    report={
        "provider":"Blender Studio","source":"Human Base Meshes v1.4.1",
        "assetLicense":"CC0-1.0, official Blender demo-files source",
        "referenceOnly":True,"wizardArtworkAccepted":False,
        "wizardRigged":False,"mocapRetargeted":False,
        "gothicCostumeComplete":False,"candidate":best,
        "assets":assets,"errors":errors
    }
    output.mkdir(parents=True,exist_ok=True)
    (output/"basemesh-audit.json").write_text(json.dumps(report,indent=2)+"\n")
    if best is None or best["vertices"]<1000:
        raise RuntimeError("Official archive had no usable humanoid base mesh")
    print(json.dumps({"candidate":best,"sourceFiles":len(assets),
                      "productionReady":False},indent=2))

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source-root",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    inspect(args.source_root,args.output)
