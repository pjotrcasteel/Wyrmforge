"""T1 geometry sanity tests; intentionally Blender-independent in CI."""
import math
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "src/Wyrmforge.Presentation.Web/wwwroot/art/town/geometry"


class TownT1MeshTests(unittest.TestCase):
    def test_sample_obj_has_actual_three_dimensional_geometry_and_references(self):
        obj = (ASSETS / "t1-central-square-preview.obj").read_text(encoding="utf8")
        vertices = [
            tuple(map(float, line.split()[1:]))
            for line in obj.splitlines() if line.startswith("v ")
        ]
        triangles_or_quads = [
            [int(i.split("/")[0]) for i in line.split()[1:]]
            for line in obj.splitlines() if line.startswith("f ")
        ]
        groups = [line[2:] for line in obj.splitlines() if line.startswith("g ")]
        materials = [line.split()[1] for line in obj.splitlines() if line.startswith("usemtl ")]

        self.assertGreaterEqual(len(vertices), 100)
        self.assertGreaterEqual(len(triangles_or_quads), 100)
        self.assertTrue(all(len(vertex) == 3 and all(math.isfinite(v) for v in vertex)
                            for vertex in vertices))
        self.assertTrue(all(3 <= len(face) <= 4 and all(1 <= idx <= len(vertices)
                            for idx in face) for face in triangles_or_quads))
        self.assertGreater(max(v[2] for v in vertices), 2.9)  # canopy roof
        self.assertLess(min(v[2] for v in vertices), 0)       # paving slab

        for name in ("town.center.paving", "town.center.well",
                     "town.center.well-canopy", "town.center.noticeboard-panel",
                     "town.center.lantern-fixture"):
            self.assertIn(name, groups)

        mtl = (ASSETS / "t1-central-square-preview.mtl").read_text(encoding="utf8")
        known = {line.split()[1] for line in mtl.splitlines() if line.startswith("newmtl ")}
        self.assertTrue(set(materials) <= known)


if __name__ == "__main__":
    unittest.main()
