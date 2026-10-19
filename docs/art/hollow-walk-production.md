# The Hollow — first walking-sheet review

Status: work in progress; no production or visual acceptance claimed.

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

## Remaining work

Generate and inspect the first candidate, preserve its source, make it loadable in
the existing lab, record actual validation and provide animated visual evidence.
Do not replace runtime enemy art or call the all-roster milestone complete.
