#!/usr/bin/env python3
"""Hollowed new-source lineage gate, not an aesthetic-quality substitute.

Run in actual Blender on an OPENED .blend. This prevents accidental reuse
of the rejected H1 mannequin, CC0 Horror Game Monster body, old 70-bone rig
or old face/head graft from draft PR #391. It does not claim visual acceptance.
"""
from __future__ import annotations

import json
from pathlib import Path

import bpy


REJECTED = (
    "Armature.002",
    "H1 body FIRST",
    "H1 original",
    "H1 connected hook",
    "Hollowed H1",
    "H1 feral",
    "actual CC0 SKULL",
    "WyrmForge Hollowed H1 true body",
    "City Building Game Art",
    "Drummyfish",
    "Horror Game Monster",
)


def verify(*, allow_candidate: bool = False) -> dict:
    # A source can be legal and completely independent of H1 yet still
    # be artistically unsuitable. Audit runs may admit a candidate, but
    # production gates MUST reject it without explicit promotion.
    if bpy.context.scene.get("candidate_only", False) and not allow_candidate:
        raise RuntimeError("Only a screened candidate: never count as an authored Hollowed")
    if not bpy.data.filepath:
        raise RuntimeError("Save the new artist source first; temporary scenes are not evidence")
    mesh_objects = [o for o in bpy.data.objects if o.type == "MESH"]
    if not mesh_objects:
        raise RuntimeError("No authored geometry. Cannot claim new body source")
    metadata = bpy.context.scene.get("hollowed_source_lineage", "")
    if metadata != "owner-reference-original-v2":
        raise RuntimeError("New source lineage missing; never relabel old H1 geometry")
    for block in [*bpy.data.objects, *bpy.data.meshes, *bpy.data.armatures,
                  *bpy.data.shape_keys, *bpy.data.materials]:
        if any(tag.lower() in block.name.lower() for tag in REJECTED):
            raise RuntimeError("Rejected H1 source detected: " + block.name)
    bad_rig = [o.name for o in bpy.data.objects if o.type == "ARMATURE" and
               len(o.data.bones) == 70]
    if bad_rig:
        raise RuntimeError("Rejected H1 70-bone rig reused: " + ", ".join(bad_rig))
    if bpy.data.actions:
        raise RuntimeError("Body-first source must not contain motion/animation actions")
    author = bpy.context.scene.get("hollowed_source_author", "").strip()
    provenance = bpy.context.scene.get("hollowed_provenance", "").strip()
    license_id = bpy.context.scene.get("hollowed_license", "").strip()
    if not all((author, provenance, license_id)):
        raise RuntimeError("Missing artist, source/provenance and verified license fields")
    result = {
        "actual_blender_source": str(Path(bpy.data.filepath).name),
        "new_reference_v2": not bool(bpy.context.scene.get("candidate_only", False)),
        "candidate_only": bool(bpy.context.scene.get("candidate_only", False)),
        "mesh_objects": len(mesh_objects),
        "armature_bones": [len(o.data.bones) for o in bpy.data.objects
                           if o.type == "ARMATURE"],
        "author": author,
        "license": license_id,
        "provenance": provenance,
        "old_70_bone_rig_reused": False,
        "old_h1_mesh_accepted": False,
        "animation_actions": 0,
        "owner_approved": False,
        "visual_acceptance_not_proven": True,
    }
    return result


if __name__ == "__main__":
    print(json.dumps(verify(), indent=2))
