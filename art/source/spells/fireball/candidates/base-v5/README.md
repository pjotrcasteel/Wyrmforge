# Base Fireball V5 — reviewed direction, unapproved art candidate

**Editable Aseprite and all five PNG material exports are versioned here as unapproved source candidates. Not installed in production.**

The owner called V4 "better". V5 retains V4's fragmented ember shape and 16 looping frames, but the user has NOT approved shipping the spell. This candidate is neither a runtime material nor a replacement for the accepted Nexus/Hunt visuals.

## Reproduce the source
From the repository root, run:

```sh
python -m pip install Pillow
python art/source/spells/fireball/candidates/base-v5/author-fireball-v5.py
```

The generator is the editable source representation for this checkpoint. It regenerates a layered native Aseprite file, 16-frame horizontal RGBA PNG strips for albedo/emissive/normal/height/cutout, and a 4× GIF **outside** the runtime art tree. Frame size: 120×72. Head anchor (pixel): (87, 36). GIF cadence: 83 ms per frame; no gameplay FPS claim. Gameplay world size, orientation and lighting calibration remain **unapproved**.

The 24 October source study was verified locally by regenerating all seven binary outputs exactly (including Aseprite) and comparing byte hashes with the source ZIP. Across 16 frames, the cutout alpha matched the union of the albedo/emissive alpha channels; no cutout mismatch was observed.

## Integration hold — owner decision (LOCKED, 24 October 2026)

**Do not integrate these V5 assets into Hunts, Nexus, Town, any lighting/arena lab or live preview path** until shared lighting [PR #332](https://github.com/pjotrcasteel/Wyrmforge/pull/332) is **finished, merged and validated for production world VFX**. Off-game material/animation authoring and art review can continue. After the engine gate passes, use only its common lighting/material/occluder pipeline with C# authoritative Fireball events, then record real 320px/390px in-engine evidence and secure explicit final approval. [Canonical blocked TODO](../../../../../../docs/canon/roadmap.md#fireball-visual-integration--blocked-until-shared-lighting-engine-completion-locked-24-october-2026).

## Important limitations

- The generated art is a candidate that **still needs manual pixel polish**; this is not a substitute for owner-authored accepted animation.
- It is a 16-frame *in-flight* body ONLY. No cast/impact/aftermath art and no Meteor/Needle hybrid are approved.
- Do not use a GIF composited over the real screenshot as "in-game footage".
- For the eventual renderer, keep one physical Fireball tied to its C# FireballSourceId and mutation bitmask. All world lighting must come from PR #332's shared material/light engine.
- The root Fireball release manifest deliberately retains `status: awaiting-authored-source` and `assets: {}`; the strict art release gate **must continue to reject** this candidate.
