# Hollowed visual polish — preserve the existing AN source (28 October 2026)

**Status: isolated art candidate. Not rendered, accepted, merged or deployed.**

## Non-negotiable baseline

This is a continuation of the existing **cape-free** Hollowed and the AN foundation,
**not** a new creature from scratch. Keep:

- Existing rig, bind hierarchy, source-skinned animation actions and foot contacts.
- The first-pass weighted long-cloth reduction from `hollow_ragged_silhouette.py`.
- Source-geometry-mapped ember regions (eyes, mouth, wounds and hands) from
  `hollow_source_embers.py`, rather than overlay particles.
- Existing Blender materials and the original emission-strength control.
- C# gameplay authority, current production atlases and unchanged Ashling.

The animation branch `feat/universal-character-animation-an0-an6` must remain
untouched. PR #385's injured and crawler variants remain untouched too.

## Isolated continuation

`tools/art/hollowed/continue_existing_source.py` reads the *already generated*
`hollow-foundation.blend` alongside its source manifest. It does not re-run
or replace Work's generator. It writes a new, separately named Blender file.

This additional candidate pass:

1. Removes only remaining clearly cloth-dominated lower fragments, preserving
   weighted leg vertices and rejecting removal greater than 15% of the mesh.
2. Inspects connected mesh islands and records suspicious unattached cloth
   regions **without indiscriminately deleting possible anatomy**.
3. Adds matte charcoal/ash localization around the **same existing real mesh**
   ember locations, while preserving the original base material and the
   existing additive internal-fire shader.
4. Increases the restrained default internal ember material drive to 1.2 on
   the independent candidate only, preserving the same vertex mask and motion
   control socket.
5. Checks the original bone-name hierarchy, writes a standalone `art-qc.json`
   and never overwrites a committed source, renderer or production atlas.

## Reproduce

First generate the existing source through the Work branch's standard
`author_hollow_foundation.py` pipeline, keeping the `source-manifest.json`.
With Blender 4.5 installed, run:

```sh
blender -b -t 2 --python tools/art/hollowed/continue_existing_source.py -- --source artifacts/animation/hollow-foundation.blend --output artifacts/hollowed-art-v2/hollow-art-v2.blend
```

The tool **must not** claim artistic acceptance based on numeric reports alone.

## Mandatory visual acceptance before integration

- Render native 96px side-by-side original AN foundation and polished candidate:
  all eight directions, walk and attack, not an obsolete caped GIF.
- Check the hips, rear silhouette and legs frame by frame for coat remnants,
  detached pixels, mesh holes and distorted skinning.
- Confirm char and low-key amber/cinder wounds stay **inside the model**,
  naturally occlude on turns, remain visible at gaming scale and do not wash out
  the figure. Confirm no extra floating fire markers.
- Compare the resulting standard Hollowed to the approved, unchanged Ashling
  at 320px and 390px in **actual dark Hunt lighting**.
- Inspect contacts, joint deformation, action timing, normal/emission/depth/caster
  exports and source version before any handoff to the animation renderer.
- Do not move the candidate to runtime or merge into Work's branch without the
  owner's explicit visual approval.

## Executed real-source Blender proof — 28 October 2026

- [GitHub Actions run #40707116507](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40707116507): **PASS** after repairing the Pillow import in isolated Blender Python. Work's existing cloth/ember source rebuilt successfully with actual Blender 4.5.14 LTS.
- First art candidate removed 749 additional cloth-dominated vertices, 81 unreferenced vertices and **seven confirmed small disconnected cloth islands (55 more vertices)**. Source rig bone hierarchy was unchanged; existing mesh-bound emission was retained. Actual S/E walk and attack contact-sheet rendered and archived.
- [GitHub Actions run #40707780823](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/40707780823): **PASS**. A further guarded profile/hip trim removes 955 additional cloth vertices. Final mesh has **zero unreferenced vertices and zero flagged disconnected tiny cloth components**, preserves 16,095 leg-weighted vertices, retains one authentic source material and 16,550 localized ash-mapped vertices.
- The latest passed workflow artifact `hollowed-preserved-source-real-blender-review` contains source/candidate editable .blend files, numeric QC reports and **32 actual rendered 96px source frames plus a before/after PNG contact sheet**. These are review renders, not actual mobile Hunts.
- Independent PNG pixel comparison versus the previous candidate indicates the second hip pass changes only around 13–14 pixels per selected East profile pose and essentially zero South pixels. Therefore that incremental trim is **not a major visual redesign** despite removing more 3D geometry.
- Human visual check: trailing profile detail, indistinct dark anatomy, and lack of strong personality relative to approved Ashling remain unresolved. Ash/glow is visible in the source render, but artistic approval is **NOT** claimed. No production assets changed.

## Open mandatory art work

The remaining silhouette and material improvements cannot be solved by reporting green kinematic tests alone. Inspect the actual retained mesh/UV weights and author further art-driven edits to recognizable undead anatomy. Preserve Work's animation controller, source contact and existing source-bound ember channels, then repeat the real eight-direction and mobile/Hunt evidence before integration.
