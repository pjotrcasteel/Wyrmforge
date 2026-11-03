# Wizard staff walk v003 — sixteen-key side-facing gait (UNAPPROVED)

This is the first separate walking study after Pjotr accepted **v002's larger staff/arm excursion**. It uses the existing artist-drawn, licensed Anokolisa grey Wizard **upper-body pixels**, keeps the art source unchanged and replaces the lower robe region with hand-authored pixel panels and two independently animated feet. It is not yet an approved animation, nor does the six-school game use it.

## What actually changed

- Six original **RUN** frames are **not** presented as a walk. Sixteen separate pose keys share one stable upper body and animate both boot contacts, the hem and the right arm.
- The far boot swings first, opposite the staff arm, then the near boot passes. Their y-coordinates rise and settle, and their world coordinates remain stationary outside the lift phases.
- Root advances **20 native pixels** per two-step cycle. End/start local foot positions match, making the motion cyclic.
- The accepted v002 scale remains: a large forward staff reach, a straight rigid shaft, a clearly bent right elbow, right-hand grip.
- The staff tip is fixed at **world x=61**, **ground y=74** in all eight grounded support keys 04–11. During recovery it leaves the ground.
- Lower grey robe panels move with the stride and are drawn behind/in front of the appropriate boot; hat, face and beard remain sourced from the existing artist-drawn body.
- Everything remains native **64×80 RGBA**, pixel-sharp at 4×, side-view only.

## Show Pjotr these images before asking for approval

- **`staff-walk-inplace-loop.gif`** — full 16-key animation looping at 4×, the recommended visual review.
- **`staff-walk-world-space-once.gif`** — single-pass moving-world proof that the planted staff does not slide.
- **`staff-walk-16-key-contact.png`** — all poses at 4×, for checking boot positions, elbows, shaft straightness and robe outline.
- **`staff-assisted-walk-16f-64x80.png`** — native engine-sized source for a subsequent approved exporter.
- **`manifest.json`** — per-key roots/feet/grip/tip positions with approval gate.

This is an early visual study, not a professionally painted final multi-direction set: foot and long robe silhouettes are still preliminary and must be reviewed at native mobile scale; only the side view is animated. Do not extrapolate/reflection-mirror to eight directions, create six variants, or integrate the live runtime until those gates are satisfied.

## Reproduce

```powershell
py tools/sprite-foundry/studies/anokolisa-wizard-v001/staff-walk-side-v003/staff_walk.py `
  --out "tools/sprite-foundry/output/staff-walk-v003-review"
```

The exporter refuses to overwrite an existing review directory. Run tests with `python -m unittest discover -s tools/sprite-foundry/tests -p 'test_staff_walk_v003.py'`.

## Provenance and scope

The user's original `Entities.zip` and `Terms.txt` were reviewed during the v001 artist intake. Do not commit those whole source packages or modify the original sprite. The existing shared six-school overlays should eventually be applied over *one approved* walking foundation: Fire, Frost, Storm, Arcane, Necromancer and Summoner. Until then, the game and original mage remain untouched.

This v003 is an independent, not-for-game review checkpoint in draft PR #471.
