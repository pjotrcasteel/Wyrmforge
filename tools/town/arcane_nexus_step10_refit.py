"""WyrmForge Arcane Nexus Step 10 - 3D geometry refit.

Rebuilds from the existing Step 7 3D semantic meshes. No source painting is
used as geometry or texture. The canonical 2D image is ONLY a QC reference.
Run: python tools/town/arcane_nexus_step10_refit.py artifacts/town-nexus/step10
Requires: numpy, trimesh. Experimental: owner visual approval outstanding.
"""
from __future__ import annotations

import runpy
import sys
from pathlib import Path
import trimesh as tm

OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("artifacts/town-nexus/step10")
OUT.mkdir(parents=True, exist_ok=True)
SOURCE = Path(__file__).with_name("arcane_nexus_step7_greybox.py")
prev_argv = sys.argv
try:
    sys.argv = [str(SOURCE), str(OUT / "source-stage")]
    base = runpy.run_path(str(SOURCE), run_name="arcane_nexus_step10_base")
finally:
    sys.argv = prev_argv
parts = base["PARTS"]
box, beam, cone = base["box"], base["beam"], base["cone"]
pointed_arch = base["pointed_arch"]

# Correct world-space positions: hall door must approach the tower, the
# eastern gateway must move right of it, and rooftop armillary must sit to
# the left of the gateway. These are true mesh translations, not fake 2D warps.
for name, meshes in parts.items():
    dx = dy = 0
    if name.startswith("hall."):
        dx, dy = .68, .12
    elif name.startswith("portal."):
        dx, dy = 1.58, .22
    elif name.startswith("terrace."):
        dx, dy = .86, .10
        if name.startswith(("terrace.second-armillary.", "terrace.small-radial-astrolabe")):
            dx -= 2.38
    if name.startswith(("hall.porch.", "hall.crosswing.")):
        dx += 1.66
        dy += .02
    if dx or dy:
        for mesh in meshes:
            mesh.apply_translation((dx, dy, 0))

# Physical stone gallery with separate masonry beams, supporting piers and
# arch springers. The passage between the tower and gateway remains open.
for z, length in ((.40, 3.80), (1.10, 3.62), (3.62, 3.45)):
    box("connector.east-wing.masonry-beams", (4.45, .71, z), (length, 1.22, .36), "stone")
for x in (3.15, 5.05):
    box("connector.east-wing.support-piers", (x, .65, 1.79), (.43, 1.37, 3.55), "stone")
    box("connector.east-wing.corbel-caps", (x, .55, 3.66), (.62, 1.5, .29), "trim")
for x in (3.52, 4.02, 4.52, 5.02):
    beam("connector.east-wing.sprung-arch", (x, .06, 2.95), (x+.23, .06, 3.54), .068, "trim")
box("connector.obs-to-gateway.cornice", (3.67, .52, 3.81), (2.27, 1.46, .16), "trim")

# Approved 2D art includes an actual exposed bookstand at the extreme left.
for h in (.82, 1.39, 1.96):
    box("market.arcane-bookstall.shelves", (-5.06, -2.76, h), (1.36, .38, .105), "wood")
for x in (-5.75, -4.38):
    box("market.arcane-bookstall.verticals", (x, -2.76, 1.39), (.11, .42, 2.20), "wood")
for i in range(9):
    x = -5.59+(i%5)*.23
    z = .91+(i//5)*.6
    box("market.arcane-bookstall.book-spines", (x, -2.99, z+.11), (.13, .19, .27), "dark")
for x in (-5.96, -4.17):
    beam("market.arcane-bookstall.wooden-awning-posts", (x, -3.05, .38), (x, -3.05, 2.44), .065, "wood")
    beam("market.arcane-bookstall.upper-braces", (x, -3.05, 2.05), (x+.06, -2.5, 2.57), .062, "wood")
for y in (-3.20, -2.48):
    beam("market.arcane-bookstall.awning-purlins", (-5.80, y, 2.57), (-3.92, y, 2.57), .065, "wood")

# Portal gate needs a true dimensional stone casing, buttresses and openings,
# not the original painting projected on a flat building wall.
for x in (5.78, 7.51):
    box("portal.east-gateway.flanking-piers", (x, -2.07, 1.84), (.26, .39, 3.12), "stone")
    cone("portal.east-gateway.flanking-finials", (x, -2.07, 3.53), .18, .48, "trim", 8)
box("portal.east-gateway.stair-landing", (6.54, -3.22, -.055), (3.10, 2.4, .27), "stone")
for y in (-1.35, -.23, .89):
    box("portal.side-elevation.window-recess", (7.05, y, 2.05), (.10, .51, 1.29), "dark")
    for yy in (y-.33, y+.33):
        beam("portal.side-elevation.window-jambs", (7.16, yy, 1.35), (7.16, yy, 2.70), .074, "trim")
    top = (7.16, y, 3.07)
    for side in (-1, 1):
        pts = [(7.16, y+side*.33, 2.70), (7.16, y+side*.23, 2.94), top]
        for a, b in zip(pts[:-1], pts[1:]):
            beam("portal.side-elevation.lancet-arches", a, b, .07, "trim")
    beam("portal.side-elevation.window-mullion", (7.18, y, 1.44), (7.18, y, 2.78), .039, "trim")
for y in (-1.9, 1.62):
    box("portal.side-elevation.angled-buttress", (7.02, y, 1.80), (.45, .36, 3.50), "stone")
    cone("portal.side-elevation.buttress-finial", (7.02, y, 3.68), .23, .36, "trim", 8)
for z in (.55, 1.18, 3.13, 3.55):
    beam("portal.side-elevation.ashlar-banding", (7.17, -1.8, z), (7.17, 1.7, z), .026, "trim")
pointed_arch("hall.front.east-side-lancet", -.61, -2.82, .89, .23, 1.95, 2.43, "trim", .067, 18)

scene = tm.Scene()
for name, meshes in parts.items():
    combined = tm.util.concatenate(meshes) if len(meshes) > 1 else meshes[0]
    scene.add_geometry(combined, node_name=name, geom_name=name)
path = OUT / "arcane-nexus-step10-greybox.glb"
scene.export(path)
triangles = sum(len(mesh.faces) for meshes in parts.values() for mesh in meshes)
print(f"Exported {len(parts)} semantic 3D meshes / {triangles} triangles: {path}")
