# Forest encounter art prototypes

First production-oriented art experiment, 15 October 2026. These files are not integrated into the live game and are not a completed animation pack.

## Included

| File | Contents | Review state |
| --- | --- | --- |
| mage-idle-directions-v1.png | Eight static facing studies | Review camera, costume and staff-hand continuity before production |
| scavenger-walk-se-v1.png | Eight frames in one facing | Prototype; verify gait loop and anatomy at gameplay scale |
| forest-props-v1.png | Fir, two wall axes, doorway, fence and rubble | Door lintel corrected to a supported timber beam |
| forest-mud-v1.png | Quiet repeatable ground study | Exact edge continuity remains to be validated |
| review/mage-cast-se-keyposes-v1.png | Four cast keyposes | Not approved for runtime; needs continuity and frame-boundary cleanup |
| atlas.json | Measured source rectangles and preview pivots | Prototype metadata, not final collision or rig data |

The mage walk attempts failed because the leading leg did not alternate consistently. They are deliberately excluded instead of being presented as a working animation.

## Preview

Serve the repository directory over HTTP and open this folder's `index.html`. Use the direction selector, size control and walk toggle to inspect readability. The viewer draws directly from the original alpha PNGs; it does not modify their pixels. `build_manifest.py` measures alpha bounds without changing the images.

The illustrative character height starts at 80 display pixels. This is a test value, not an architectural commitment. The current live renderer uses a top-down world; this elevated sprite camera must be reconciled with it before integration. Do not silently switch gameplay projection or collision rules.

Preview drawing was exercised at 960×640 and 342×400 with all eight mage directions and all eight scavenger frames, using the actual preview JavaScript with a native canvas adapter. The phone-width render is retained in `preview-mobile.png`. Browser layout was not verified: Chromium was unavailable and its download failed. These checks establish renderability, not final animation or game integration quality.

## References and provenance

- Direct image references: `art/world/forest-monastery-encounter-v1.png` and `art/world/monastery-interior-v1.png`.
- [Unity Sprite Editor](https://docs.unity.com/en-us/engine/6000.3/manual/unity2d/sprite/sprite-editor-window-reference/reference): source rectangles, padding, alpha-aware slicing and pivots.
- [Godot 2D sprite animation](https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html): separate frame sequences, atlas selection and animation preview.
- [University of Minnesota canine walk](https://vanat.ahc.umn.edu/gaits/walk.html): sequential four-beat footfalls and alternating support for the scavenger study.

All source PNGs were generated using the built-in OpenAI image tool. Prompts required the approved slate-blue mage, pale collar, wooden amber staff, fixed elevated camera, separate alpha sprites, restrained materials and coherent object construction. The first doorway's unsupported block lintel was rejected and edited into a single timber beam. The generated sprite placement is irregular, so the metadata uses measured source rectangles rather than assuming the requested grid was followed exactly.

Next acceptance work: correct mage locomotion and cast handedness, reconcile sprite camera with gameplay, validate terrain repeats, then create remaining directions, enemy attack/death frames and spell effects. Test a small coherent set in the actual game before making additional environments.
