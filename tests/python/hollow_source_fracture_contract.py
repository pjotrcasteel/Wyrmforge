"""Source-only Hollowed fracture proof contract; does not need Blender installed."""
import ast
from pathlib import Path

root = Path(__file__).resolve().parents[2]
path = root / 'tools/sprite-lab/render-hollow-source-fracture.py'
source = path.read_text(encoding='utf-8')
module = ast.parse(source, filename=str(path))
assert not any(isinstance(node, (ast.Import, ast.ImportFrom)) and\n               any(alias.name == 'random' for alias in node.names) for node in ast.walk(module)), 'No RNG imports'
assert 'Hollow skinned character' in source
assert 'Hollow editable animation rig' in source
assert 'character.data.vertices' in source, 'Segments must come from real skin weights'
assert 'evaluated.to_mesh' in source, 'Segments must come from skinned 3D mesh'
assert "context='FACES'" in source and "context='VERTS'" in source
assert "releasedToHunts': False" in source
assert 'keyframe_insert' in source and 'floor' in source.lower()
assert 'frame_image.getbbox()' in source, 'Every frame must be checked for clipping'
for rejected in ('hollow-bone-burst.js', 'drawHollowBoneBurst', 'Math.random'):
    assert rejected not in source

motion = None
for statement in module.body:
    if isinstance(statement, ast.Assign):
        if any(isinstance(target, ast.Name) and target.id == 'MOTION' for target in statement.targets):
            motion = ast.literal_eval(statement.value)
assert motion is not None
assert set(motion) == {'skull', 'thorax', 'pelvis', 'arm.L', 'arm.R', 'leg.L', 'leg.R'}
for name, (speed, rotation) in motion.items():
    assert len(speed) == len(rotation) == 3, name
    assert max(map(abs, speed)) < .7, f'{name} would scatter across the arena'
    assert max(map(abs, rotation)) < .6, f'{name} would spin like a random glyph'

runtime = (root / 'src/Wyrmforge.Presentation.Web/wwwroot/js/hollow-sprites.js').read_text()
assert 'drawHollowBoneBurst' not in runtime
assert 'selectHollowDeathStyle' not in runtime
print('PASS: original skinned mesh, seven authored 3D pieces, no live procedural bone path.')
