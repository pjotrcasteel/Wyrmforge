# The Hollow — first walking-sheet review

Status as of 20 October 2026: **both generated v1 and rigid cutout v2 were rejected
by the owner**. No accepted Hollow walk exists. The lab's current default is not
evidence of acceptance. The implementation notes below are historical records.

Future production follows the [art-card-to-spritesheet algorithm](card-to-spritesheet-production.md):
establish an editable character, validate deformation and one convincing walk,
then extend states/directions. The new rigged-source route is not yet implemented.

Scope: the first monster only, using the existing Sprite Lab. Preserve the original
concept and game artwork. Build a transparent walking atlas and review it before
moving to another monster. The open all-roster PR #136 is a separate workstream.

## Reference and motion brief

- Approved identity: `user_handover_files/concepts/Fire/01-the-hollow.png`.
  Gaunt village undead, exposed ribs, elongated fingers, worn cloth and rope belt.
  Grounded Gothic anatomy and muted bone/brown materials; no extra fantasy ornaments.
- [Toon Boom walk analysis](https://learn.toonboom.com/modules/walk-cycle-animation/topic/walk-analysis1):
  use contact, down, passing and up poses, followed by the opposite supporting leg.
  Translate this into a restrained, slow shamble with alternating support and slight
  delayed arm/cloth motion. Do not copy their artwork.
- [Godot sprite animation documentation](https://docs.godotengine.org/en/stable/tutorials/2d/2d_sprite_animation.html):
  consistent frame regions and explicit frame playback. Use an equal-cell atlas
  and metadata rather than guessed runtime crops. No dependency on Godot is added.

Target: eight frames in each of eight independently drawn directional rows
N, NE, E, SE, S, SW, W, NW; transparent RGBA; fixed root/scale, full visible body,
no painted ground, borders, labels or shadow rectangles. Inspect at game size as
well as enlarged. Technical validation cannot certify motion or art quality.

## Delivered candidate

- Built-in image generation used the approved card and old concept atlas as direct
  references. An eight-direction/eight-frame transparent source was generated.
- The source failed regular-grid spacing and registration review. It is preserved
  as `art/source/enemies/hollow/walk/hollow-walk-v1-rejected.png`; the name records
  that rejection, not a claim that packing alone fixes motion quality.
- `tools/sprite-lab/build-hollow-walk.mjs` repacks the source into 1536×1536,
  eight columns × eight rows, 192×192 cells. It applies integer pelvis registration
  and per-row placement only: no pose synthesis, per-frame resizing or mirroring.
- The lab defaults to `hollow-walk-v1.png`; **Original concept** preserves comparison.
  Source direction order is N, NE, E, SE, S, SW, W, NW. All views use eight frames at 8fps.
- The adjacent manifest records every source crop and translation. Its QA report
  passes all eight existing structural checks (83% sampled transparency, all 64
  frames populated, no sampled clipping, stable silhouette placement).
- Exported metadata explicitly separates technical validation from visual approval.
  It never marks a candidate production-approved just because format checks pass.

## Visual review and limits

The selected source preserves the gaunt silhouette better than two subsequent
experiments, which became bulkier or gained a painted background. Packing improves
alignment but cannot establish convincing weight transfer. Check the near/far leg
exchange, stance/passing contrast, hand/cloth consistency and last-to-first seam
in every direction before accepting this as high-quality production art.

This is a first review candidate, not a finished all-mob milestone. Runtime enemy
art remains unchanged. Physical iPhone Safari review and artistic approval remain
outstanding. Do not begin the next monster until this one's walk is accepted.

Validation: `node --test tools/sprite-lab/tests/*.test.js`, JavaScript syntax check,
full per-pixel cell-edge check, and deterministic rebuild. Live/browser and CI
results are recorded below when available.

## Correction — 20 October: coherent painted rig

The owner rejected v1's animation. Equal-cell registration did not repair its
changing anatomy or incoherent gait. Do not reuse that generation approach for
the next monsters.

The default is now `hollow-walk-rig-v2.png`: one three-quarter view, 16 frames at
12fps. Its immutable material layers all come from frame 0 of the existing
`art/enemies/hollow.png`. The skull and torso are never redrawn per frame. Two-bone
IK preserves thigh/shin lengths; stance occupies 62% of a cycle with opposite
legs offset by half a cycle, giving double support rather than a running flight.
The swinging ankle rises 9 source pixels and returns continuously. Restrained
arm counter-motion also preserves bone lengths. The original painted material
and its rigid source masks remain reproducible in `build-hollow-rig.mjs`.

During support the foot sweeps 32 source pixels backwards over .62 of a cycle.
The Stride test therefore translates by `32 / .62` source pixels per full cycle,
scaled with display size and FPS. This replaces the unrelated fixed 63px/s speed.
The Before button preserves the rejected generated atlas for direct comparison.

Eleven Node tests pass, including world-space foot planting over two cycles,
constant limb lengths over 1,000 phases, absence of a flight phase, exact loop
closure, all 16 distinct populated frames, and every pixel of frame boundaries.
Single-view exports remain single-view; they never fabricate eight authored rows.
The GIF is `docs/art/previews/hollow-walk-rig-v2.gif`.

**Subsequent owner review:** the 20 October recording rejected this candidate's
visual motion. Rigid seams, insufficient torso response and the shuffling cutout
appearance remain failures despite the passing kinematic/format tests. Do not
reuse v2 as an accepted base or claim that more facings will repair this gait.

This corrects motion construction; it does not claim all eight facings are done
or confer artistic approval. Review remaining rigid cutout seams and the actual
moving silhouette at gameplay size before authoring the other views. The remote
browser could not reach localhost (connection refused); local interactive visual
verification was unavailable. Runtime gameplay artwork is unchanged.
