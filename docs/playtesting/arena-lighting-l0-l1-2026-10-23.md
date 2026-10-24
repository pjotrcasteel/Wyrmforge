# Arena Rebuild V2 — Lighting L0/L1 technical vertical slice (23 October 2026)

Canonical requirement: [Art & animation — shared lighting before forest assets](../canon/art-and-animation.md#arena-rebuild-v2--shared-lighting-before-further-forest-asset-production-locked-23-october-2026).

## What this slice actually implements

**Opt-in** `/arena-lighting` with an independent canvas. This is a **lighting prototype** and
an art-acceptance tool, **not a finished lighting engine or a production Hunt integration**.

- Reuse the already-approved `groundFoundationBoard(seed, 'trails')`, `buildGroundQuiltAtlas`,
  `drawReferenceGroundBoard` and `drawGroundMaterialTransitions` unchanged. The textures
  are the original six approved material paintings; no Python 112px stamp collage.
- Compare **Off** (untouched ground and source sprites) versus **On** using one
  world-space ambient/directional profile applied **after both ground and sprites**.
  Pan does not change light direction. Bounded intensity and sun-angle controls.
- Render soft elliptical contact shadows on the approved ground **before** sprites,
  using roots/trunk-width parameters, not canopy alpha or fabricated collision.
  Sort independently loaded sprites by their bottom/foot anchor.
- Use the two original transparent Blender render candidates from
  [Step 3 PR #307](https://github.com/pjotrcasteel/Wyrmforge/pull/307):
  select the `ancient_oak-candidate.png` and `dead_elm-candidate.png` files from
  the [successful Step 3 artifacts](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39959218973).
  Images are handled with local file object URLs and never uploaded, committed
  as production sprites, saved, copied from old gameplay assets or given colliders.
  Until selected, the lab correctly shows **ground only**, not synthetic trees.
- Source-light settings and foot/shadow plans are in `arena-scene-lighting.js`,
  independent of DOM and usable by a future native renderer mapping.
- Art, alpha, and 320/390px appearance remain owner-approval gates.

## Scope and limitations

This L1 approximation uses restrained ambient/color and a world-anchored directional
gradient. It does **not** implement normal-map/PBR shaders, surface-reflectivity logic,
per-leaf shadow casting, depth-fog, lighting from Fireball or Ashfang, GPU batching,
the production C# lighting-event contract, enemy lighting or mobile native delivery.
Local tree **review-only** PNGs are not part of the distributed bundle.

**No gameplay physics**: existing `/arena-lab` remains Step-2 ground-only,
legacy trees/props/roads cannot reappear, and the live Hunt renderer is untouched.
The lighting values do not influence RNG, collision, combat, navigation or drops.

## Acceptance checklist

- Toggle On → Off → On with the same seed: Off matches original source ground;
  no ground material cells, blending, PNG pixels or runtime gameplay settings change.
- Change camera/pan at 320×568 and 390×844: world light stays fixed relative to
  ground and tree anchors. No viewport-attached gradient or input scrolling.
- Use independent original oak and elm PNGs: nonopaque alpha crops correctly,
  visible roots touch intended foot anchor, shadows follow roots and sit under
  sprites; trees sort by foot, not canopy.
- Changing seed rebuilds **only** approved ground, retains review sprites and
  lighting; disabling light and shadows has no cosmetic ground modifications.
- JS tests verify deterministic pure plans, bounded settings, zero legacy imports
  and unchanged baseline ground renderer. Blazor build and browser screenshots
  are still required before merging; **browser test ≠ physical iPhone/Android QA**.

## Next checkpoint

Obtain owner feedback on actual L0/L1 scenes with both source trees using
320/390px screenshots from the real lab. Correct silhouette/camera/anchor
mismatches separately from lighting. Only then expand to L2 grounding/depth,
material-aware response and native performance. Do not start foliage production
before this visual gate.
