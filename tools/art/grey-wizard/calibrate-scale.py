"""Source-derived standing-body guide. Does not modify/render any Hollowed asset."""
import pathlib
import json
import hashlib
import numpy as np

root = pathlib.Path(__file__).resolve().parents[3]
base = root / 'art/source/enemies/hollow/rigged-poc/model/local-appearance-004'
mesh_file = base / 'textured-rgb-v2/textured-mesh.npz'
camera_file = base / 'rigged-pixel-v3/sampled-walk.npz'
manifest_file = root / 'src/Wyrmforge.Presentation.Web/wwwroot/art/enemies/hollow-rigged/arms/manifest.json'
mesh = np.load(mesh_file)['vertices']
mvp = np.load(camera_file)['mvp']
manifest = json.loads(manifest_file.read_text())
clip = manifest['clips']['standard']['walk']
# Existing parent source is normalized to one model unit in neutral/rest stature.
# Project ONLY the vertical extent; do not confuse posed ground-plane depth with height.
rest_height = float(np.max(mesh[:, 2]) - np.min(mesh[:, 2]))
projected_height = rest_height * abs(float(mvp[1, 2] / mvp[3, 3])) * clip['cell'] / 2
body_world_height = projected_height * clip['worldSize'] / clip['cell']
# Crown is hidden beneath the hat: an explicit editable source landmark estimate.
wizard_crown_y, wizard_sole_y, wizard_cell = 22, 131, 160
world_size = body_world_height * wizard_cell / (wizard_sole_y - wizard_crown_y)
report = {
    'status': 'provisional 2.5D body-scale calibration; owner/real-arena review open',
    'rule': 'wizard and standard Hollowed have equal un-hunched anatomical stature; exclude hat/staff',
    'reference': 'current live no-cape standard Hollowed, radius11, visualScale1; not pending V2 art',
    'hollowManifest': str(manifest_file.relative_to(root)).replace('\\', '/'),
    'hollowClip': clip,
    'neutralSource': str(mesh_file.relative_to(root)).replace('\\', '/'),
    'sourceCamera': str(camera_file.relative_to(root)).replace('\\', '/'),
    'sourceSha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [mesh_file, camera_file, manifest_file]},
    'restSourceHeight': rest_height,
    'verticalProjectionNativePixels': projected_height,
    'standingBodyWorldHeight': body_world_height,
    'wizardSourceCrownY': wizard_crown_y,
    'wizardSourceSoleY': wizard_sole_y,
    'wizardCell': wizard_cell,
    'wizardWorldSize': round(world_size, 6),
    'previousWizardWorldSize': 40,
    'previousWizardBodyWorldHeight': (wizard_sole_y-wizard_crown_y)*40/wizard_cell,
    'limitations': [
        'upright Hollowed is a guide from preserved parent rest source/camera, NOT a new straightened pose render',
        'wizard anatomical crown beneath hat is an explicit landmark estimate',
        'current Hollowed visual variation +/-5 percent and crouched stride are not new stature targets',
        'source camera applies projected height, not a flat side-view bounding box',
        'pending Hollowed V2 has no approved replacement body; recheck when it does',
        'sprite perspective/elevation/material/depth and actual Hunt/device acceptance remain separate',
    ],
}
out = root / 'art/source/characters/grey-wizard/gothic-south-v003/scale-calibration.json'
out.write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k: report[k] for k in ['standingBodyWorldHeight', 'wizardWorldSize', 'previousWizardBodyWorldHeight']}))
