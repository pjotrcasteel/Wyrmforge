"""Source-mesh correction: Hollowed are rotting bodies, NOT long-coated humans.

Conservatively remove hanging long cloth panels beneath the pelvis only.
Real skin, hips, both legs, wounds, bones, skin weights and atlas UVs remain.
The torn short hem is actual Blender geometry, never a 2D cutout/crop.

This is an ART CANDIDATE and never replaces an approved runtime asset.
"""
from __future__ import annotations

import math

import bmesh

CLOTH = frozenset(("cloth.L", "cloth.R"))
LEGS = frozenset(("thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R"))


def shorten_hanging_cloth(actor):
    """Trim skirt-like dangling cloth, retaining skin and the actual leg rig.

    Material is judged by source vertex-group weight, not sprite appearance.
    An irregular torn waist/hip seam avoids another smooth uniform coat hem.
    The operator fails rather than delete bones or an uncertain body region.
    """
    if actor.type != "MESH":
        raise ValueError("Expected the original source-skinned Hollowed mesh")
    if not any(mod.type == "ARMATURE" for mod in actor.modifiers):
        raise ValueError("Not the source-skinned Hollowed")
    mesh = actor.data.copy()
    actor.data = mesh
    groups = {group.index: group.name for group in actor.vertex_groups}
    if not CLOTH.issubset(set(groups.values())):
        raise ValueError(f"Source cloak/skirt groups missing: {sorted(CLOTH)}")
    before = len(mesh.vertices)
    candidates = []
    removed_samples = []
    intact_leg_vertices = 0
    near_hem = 0
    for v in mesh.vertices:
        weights = {groups[g.group]:g.weight for g in v.groups}
        cloth = sum(weights.get(k, 0.0) for k in CLOTH)
        legs = sum(weights.get(k, 0.0) for k in LEGS)
        if legs > .45:
            intact_leg_vertices += 1
        # Hem roughly at upper thigh, not at ankle. Unequal tears leave
        # naturally asymmetric scraps near the waist; not a straight cut.
        torn_hem = -.155 + .022*math.sin(v.co.x*24 + v.co.y*11) + .014*math.sin(v.co.x*47)
        if cloth >= .52 and legs < .10 and v.co.z < torn_hem:
            candidates.append(v.index)
            removed_samples.append((v.co.z, cloth, legs))
        elif cloth >= .52 and legs < .10 and abs(v.co.z-torn_hem) < .035:
            near_hem += 1
    if not candidates:
        raise ValueError("No long hanging cloth to remove; inspect source before changing body")
    # Conservative fail-closed mesh bounds. There must be substantial cloth,
    # but never enough deletions to amputate the Hollowed lower torso.
    ratio = len(candidates)/before
    if not .005 < ratio < .22:
        raise ValueError(f"Unexpected long-cloth removal ratio: {ratio:.4f}")
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in candidates], context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    if not len(mesh.polygons) or not intact_leg_vertices:
        raise ValueError("Mesh/leg preservation failed")
    return {
        "sourceSkinnedMesh": True,
        "method": "weighted long hanging cloth geometry removal",
        "removedLongClothVertices": len(candidates),
        "originalVertices": before,
        "remainingVertices": len(mesh.vertices),
        "removedRatio": round(ratio, 4),
        "survivingOriginalLegWeightedVertices": intact_leg_vertices,
        "originalBodyAndLegsPreserved": True,
        "raggedUpperThighHem": True,
        "candidateNotApproved": True,
        "maxRemovedHeightZ": round(max(z for z,_,_ in removed_samples), 4),
        "minRemovedHeightZ": round(min(z for z,_,_ in removed_samples), 4),
        "clothHemNearbyVertices": near_hem,
    }
