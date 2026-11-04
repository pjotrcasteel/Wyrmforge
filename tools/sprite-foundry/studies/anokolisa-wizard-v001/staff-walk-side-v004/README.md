# Wizard staff walk v004 — full foot pass before lift (UNAPPROVED)

Pjotr accepted **v002's larger staff motion**, and the draft v003 then added actual alternating far/near boot movement. v004 fixes one concrete flaw in v003: the wizard released the staff **before the foot nearest the staff had passed it**.

## What changed

- The staff remains on the ground from keys **04 through 12** (nine contact keys; v003 had eight).
- Throughout this contact interval its tip stays at **world x=61, y=74** even while the body travels. At key 12 the *near foot* is at **world x=68**, seven native pixels **ahead of the planted staff**. Only then does the wizard release it at key 13.
- The complete two-step cycle advances **26 native pixels** instead of 20. The feet return to identical local coordinates at the frame seam, preventing an animation pop.
- The far boot lifts and advances first; the near boot passes second. Swing lift is now up to 6 native pixels. Both boots are drawn with appropriate front/back robe layering, exposing their foot placement while preserving the long grey gown.
- The right hand, bent elbow, Gandalf-inspired grip, and **straight wooden staff** preserve the approved v002 proportions.
- Original Anokolisa 64×80 Wizard source assets, in-game mage and the six-school overlays are **untouched**.

## Actual review images

- **`staff-walk-v003-v004-comparison.gif`** — v003 (left) versus v004 (right), looped at 4×.
- **`staff-walk-inplace-loop.gif`** — v004 sprite loop at 4×, recommended review.
- **`staff-walk-world-space-once.gif`** — one continuous forward movement, showing world-fixed staff contact with no loop teleport.
- **`staff-walk-selected-before-after.png`** — three mobile-readable key comparisons, at plant, foot passing and staff behind the foot.
- **`staff-walk-16-key-contact.png`** — all 16 keys for inspecting limb continuity, cloth and grip.
- **`staff-assisted-walk-16f-64x80.png`** — native 16-key RGBA atlas.
- **`manifest.json`** — exact foot, staff and body coordinates; explicit approval gate.

This remains a **one-side proof-of-motion study**. The lower robe and boots are still provisional pixel artwork built around the immutable artist-drawn upper body. Do not mark it approved, merge it into game assets, mirror it into eight directions, or generate all six school variants until Pjotr has reviewed and accepted the actual animation.

## Reproduce (without overwriting previous studies)

```powershell
py tools/sprite-foundry/studies/anokolisa-wizard-v001/staff-walk-side-v004/staff_walk.py `
  --out "tools/sprite-foundry/output/staff-walk-v004-review"
```

`python -m unittest discover -s tools/sprite-foundry/tests -p 'test_staff_walk_v004.py'`

This study takes the genuine artist pixels from the existing Anokolisa source intake; no copied source pack or extra licensed files are checked in.
