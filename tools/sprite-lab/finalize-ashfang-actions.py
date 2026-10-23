"""Normalize baked source-key interpolation after adding object-level paths."""
import bpy,sys
from pathlib import Path
folder=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.open_mainfile(filepath=str(folder/'ashfang-rigged.blend'))
bpy.context.preferences.filepaths.save_version=0
for action in bpy.data.actions:
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='LINEAR'
bpy.ops.wm.save_as_mainfile(filepath=str(folder/'ashfang-rigged.blend'))
