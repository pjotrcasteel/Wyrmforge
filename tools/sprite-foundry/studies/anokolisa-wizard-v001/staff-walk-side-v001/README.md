# Staff-assisted walk — side-view timing study v001 (NOT APPROVED)

**Purpose:** test the right-arm anatomy and staff plant/push/recovery against
the owner's approved, licensed Anokolisa Gothic-grey Wizard pixel foundation.
**This is not a finished walk** or an eight-direction character animation.

## Actual inputs and limitations

- Exact existing `../run-side-grey-6f-64x80.png` artist pixels are read, copied
  and preserved. The source **run** provides only six poses, not a walk.
- Twelve review keys deliberately hold each of those six frames twice while
  drawing a new elbow/forearm/grip and one shared neutral wooden staff.
- The added arm/staff are an authored pixel overlay (study only); **neither**
  a validated motion rig **nor** the original artist's completed staff sprite.
- The original source PNG and every in-game atlas remain unchanged.
- Native output: 64×80 per key, same `(32,74)` foot anchor and side-facing
  direction. No unverified other directions or mirrored views.

## Contact sequence

| Keys | Phase | Intended motion |
| --- | --- | --- |
| 00–01 | Advance | Opposite-foot step; hand and shaft move ahead |
| 02–03 | Plant | Staff tip touches the ground in front |
| 04–05 | Support | Hand lowers slightly as weight advances |
| 06–07 | Passing | Actor root passes the stationary tip |
| 08 | Behind | Tip is now beside/behind the approaching feet |
| 09 | Release | Tip lifts; hand begins to recover |
| 10–11 | Advance | Staff resets for the next placement |

Root offsets during keys 02–08 are `(0,1,3,5,8,10,13)` pixels; the corresponding
tip x positions `(58,57,55,53,50,48,45)` keep the **world-space tip at x=58**.
The hand is always forward of, and higher than, its elbow. One straight shaft
line passes through grip and tip; no segmented, bending stick.

## Review artifacts

- `staff-contact-12-keys.png`: all actual rendered keys, 4×.
- `staff-side-12-keys.gif`: 12-key pose loop at 4×, for inspecting sprite continuity.
- `staff-ground-contact-once.gif`: one-shot root-motion diagnostic; the
  planted tip stays at the same screen coordinate as the body moves past.
- `staff-side-12f-64x80.png`: the actual native 12-key artist-base composite.
- `manifest.json`: exact source indices, tip, hand, elbow, phase and root
  travel per key; expressly marked unapproved.

## Motion research used (principles only, no copied pixels)

- [South Tees NHS](https://www.southtees.nhs.uk/resources/how-to-use-walking-sticks/):
  put the stick forward and to the side, step forward, load the support, then
  bring the following foot through. Applied to plant/support sequencing.
- [REI Expert Advice](https://www.rei.com/learn/expert-advice/how-to-use-trekking-poles.html):
  opposing arm/foot cadence, natural swing, and pushing past the planted
  pole. Applied to the recovery/passing phase, not to the Wizard's staff art.

## Reproduction

```powershell
py tools/sprite-foundry/studies/anokolisa-wizard-v001/staff-walk-side-v001/staff_walk.py `
  --out "tools/sprite-foundry/output/wizard-staff-review"
```

The output directory must be new. Regression tests validate a truly straight
shaft, elbow-to-hand geometry, unmodified source, grounded world-space tip,
native cells and reproducible atlas/manifest.

## Required owner visual gate before any further integration

**No approval implied.** The six-frame run still lacks a professionally
authored weight-shift/foot-plant walk, the extra arm can read too angular,
and this source has no 8-way rear/front facings. Inspect the native-scale
animation, arm silhouette, grip, shaft, planted foot support, robe movement,
and 320/390px mobile game view before advancing. If the arm pose is rejected,
iterate this isolated study. Only after the base gait is artistically
accepted should Fire/Frost/Storm/Arcane/Necromancer/Summoner receive
their different staff heads, materials and school-specific lighting. Any
lighting must register through the shared G engine, not baked into albedo.
