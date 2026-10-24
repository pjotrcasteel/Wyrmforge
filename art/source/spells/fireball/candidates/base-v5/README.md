# Base Fireball V5 — reviewed direction, unapproved art candidate

**Editable source and all five material exports are versioned. A draft-only legacy Hunt V5 preview uses albedo/emissive; the PR is not merged or approved for release.**

The owner called V4 "better". V5 retains V4's fragmented ember shape and 16 looping frames, but the user has NOT approved shipping the spell. This candidate is neither a runtime material nor a replacement for the accepted Nexus/Hunt visuals.

## Reproduce the source
From the repository root, run:

```sh
python -m pip install Pillow
python art/source/spells/fireball/candidates/base-v5/author-fireball-v5.py
```

The generator is the editable source representation for this checkpoint. It regenerates a layered native Aseprite file, 16-frame horizontal RGBA PNG strips for albedo/emissive/normal/height/cutout, and a 4× GIF **outside** the runtime art tree. Frame size: 120×72. Head anchor (pixel): (87, 36). GIF cadence: 83 ms per frame; no gameplay FPS claim. Gameplay world size, orientation and lighting calibration remain **unapproved**.

The 24 October source study was verified locally by regenerating all seven binary outputs exactly (including Aseprite) and comparing byte hashes with the source ZIP. Across 16 frames, the cutout alpha matched the union of the albedo/emissive alpha channels; no cutout mismatch was observed.

## Base V5 gameplay preview — revised 25 October 2026

The absolute 24 October integration pause is superseded. The user wants this Fireball in Hunts **before** PR #332 finishes. The draft PR uses **only the existing Canvas projectile renderer** to display the 16-frame V5 albedo and emissive strips, falling back to the current pixel painter if loading fails; no new lighting, shadows, damage/collision logic or event stream. This is not yet merged or owner-approved; genuine 320/390px Hunt captures and performance checks are required. The other channels remain source material for the **later unified GPU-lighting implementation**. No local lighting workaround is permitted. [Updated roadmap](../../../../../../docs/canon/roadmap.md#fireball-v5-in-game-first-full-universal-lighting-afterward--locked-25-october-2026).

## Important limitations

- The generated art is a candidate that **still needs manual pixel polish**; this is not a substitute for owner-authored accepted animation.
- It is a 16-frame *in-flight* body ONLY. No cast/impact/aftermath art and no Meteor/Needle hybrid are approved.
- Do not use a GIF composited over the real screenshot as "in-game footage".
- The temporary renderer uses the real C# Fireball projectile only. Actual relighting must later use PR #332's single shared material/light engine.
- The root Fireball release manifest deliberately retains `status: awaiting-authored-source` and `assets: {}`; the strict art release gate **must continue to reject** this candidate.
