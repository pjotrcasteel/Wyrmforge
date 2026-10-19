# The Hollow — first walking-sheet review

Status: first registered walking candidate for review; no production or visual acceptance claimed.

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
