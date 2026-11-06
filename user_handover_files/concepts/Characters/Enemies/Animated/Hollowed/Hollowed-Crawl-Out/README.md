# Wyrmforge Hollowed crawl-out handover

Open `Hollowed-Crawl-Out.aseprite` and select a timeline tag. The master contains
two eight-frame, one-shot southeast clips. Each has an editable RGBA body layer.
The GIFs loop for review.

| Tag | Atlas row | Duration | Motion |
| --- | --- | ---: | --- |
| `crawl_out_pull_SE` | 0 | 1,060 ms | Both hands brace, then the Hollowed pulls its chest and knee above the surface. |
| `crawl_out_scramble_SE` | 1 | 685 ms | The ember shoulder breaks through, then one hand catches the ground and the Hollowed scrambles up. |

The atlas uses 80 × 80 cells and the existing Hollowed root at (40, 76).
`manifest.json` describes the standalone atlas, with zero-based row-major
frame indices and per-frame timings. The last frame of each clip is the exact
first frame of the existing `idle_SE` diffuse animation.

## Integration

1. Import the clips into the existing Hollowed animation set. If appending to
   its atlas, remap the frame indices to the appended positions.
2. At spawn, pick one clip and keep the actor at its spawn root while it plays.
   Use southeast during the emergence. Transition to `idle_SE` when the
   one-shot finishes, then let normal facing and locomotion take over.
3. Emit terrain effects separately at the spawn root. Sample the actual ground
   material for dust, chips, leaves, or splashes. For the shoulder-first clip,
   trigger the initial effect as soon as the shoulder appears. Use the same
   creature art on all terrain.
4. Keep spawn timing and collision under simulation control. The clip manifest
   contains no gameplay events.

Scope is southeast diffuse artwork. The body sprites use alpha for the buried
portions. Test their contact line over the live terrain, particularly near
elevation changes. Material maps and the other seven facings are outside this
pack. The project renderer and Aseprite UI have not been exercised here.
