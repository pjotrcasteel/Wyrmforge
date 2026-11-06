# Wyrmforge - High-Fidelity 2.5D Torch Set, Revision 3

## Artistic decision

The previous two torch packs were rejected as too flat, repetitive and below
the Fire Mage/Hollowed/Ashling standard. This revision rebuilds the hardware
from detailed authored pixel-art concept plates matched to the actual mage
visual reference and the user's Wet Forest arena screenshot.

Three genuinely different fixtures: aged forged-iron road beacon, split-oak
pitch torch, and abandoned Gothic monastery watch beacon. Each uses a 3/4
top-facing coal cup; the near lip overlaps the fire base so it appears seated
in the basket. No large front-facing fireball, no baked fake halo.

## Art and editable sources

- Native **64 x 80 RGBA** source cells; terrain remains a separate 32 x 32
  logical map cell. Each fixture's foot anchor is (32, 76).
- All `.aseprite` files contain 36 frames and five layers: static detailed
  fixture, outer flame, golden hot core, embers/smoke, near-side cup lip.
- The hardware is perfectly static across animation frames.
- Flame keyframes originate from a separately authored eight-key flame art
  plate and are individually resampled/quantized to native pixel cells.
- `*.albedo.png` and `*.emissive.png` are aligned, transparent 2304 x 80
  atlases. `*.occlusion.png` is the near-side cup lip mask, same layout.
- `*.burn.gif` is an enlarged 16-frame preview of the main burn loop.
- Original high-resolution source concept plates are preserved inside the
  package's `concept-source/` folder for artist iteration.

| Aseprite tag | Frames (zero-based) | Frame duration | State |
|---|---|---|---|
| Ignite | 0-5 | 90ms | Once then Burn Loop |
| Burn Loop | 6-21 | 80ms | Continuous normal flame |
| Wind Gust | 22-29 | 70ms | One wind-reactive loop |
| Extinguish | 30-35 | 110ms | Play once, leave unlit fixture |

## Integration guidance

- Preserve exact alpha, native pixel grid, and PointClamp/nearest-neighbor
  sampling. Keep pivots consistent when zooming or elevating a fixture.
- Do not render a second sprite-based glow/shadow. Feed the emissive atlas and
  the fixture through the existing LitSprite, PBR and shared GPU lighting path.
- The torch light should be a localized warm emitter with mild temporal flicker.
  Adjust intensity and range in-game, especially for the burned forest.
- The occlusion atlas contains the static near cup lip. This may be retained as
  a composited layer or imported separately by the existing animation engine.
- The 2.5D visual approval MUST be a genuine in-engine screenshot at mobile
  scale, against both the green Wet Forest and the burned forest screenshots.
- Do not mark this as in-engine approved; Aseprite editor binary and the game
  are not available in this environment. Binary chunk/frame/tag integrity,
  alpha, atlases and GIF frame counts are validated independently.
