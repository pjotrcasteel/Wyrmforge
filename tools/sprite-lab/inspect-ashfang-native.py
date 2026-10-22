"""Read-only Blender source inventory. Run with --disable-autoexec; never saves blend."""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import bpy

parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
source = Path(bpy.data.filepath).resolve()
output = Path(args.output).resolve()
if output == source or output.exists():
    raise RuntimeError("Use a new separate report path; overwriting is prohibited")

def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

before = digest(source)
report = {
    "source": str(source), "sha256": before,
    "blenderVersion": bpy.app.version_string,
    "opened": True, "saved": False, "ownerApproved": False,
    "objects": [{"name": o.name, "type": o.type,
                 "vertices": len(o.data.vertices) if o.type == "MESH" else None,
                 "bones": len(o.data.bones) if o.type == "ARMATURE" else None,
                 "armatureModifiers": [m.object.name if m.object else None
                                       for m in o.modifiers if m.type == "ARMATURE"]}
                for o in bpy.data.objects],
    "actions": [{"name": a.name, "frameRange": list(a.frame_range)}
                for a in bpy.data.actions],
    "images": [{"name": i.name, "packed": bool(i.packed_file),
                "path": i.filepath,
                "externalExists": Path(bpy.path.abspath(i.filepath)).is_file()
                if i.filepath and not i.packed_file else None}
               for i in bpy.data.images],
    "scenes": [{"name": s.name, "engine": s.render.engine,
                "camera": s.camera.name if s.camera else None,
                "fps": s.render.fps / s.render.fps_base}
               for s in bpy.data.scenes],
    "limits": "Opening is not proof of deformation, motion, rights or artistic acceptance."
}
if digest(source) != before:
    raise RuntimeError("Source changed during inspection")
output.parent.mkdir(parents=True, exist_ok=True)
with output.open("x", encoding="utf-8") as stream:
    json.dump(report, stream, indent=2)
print(f"Read-only source inventory: {output}")
