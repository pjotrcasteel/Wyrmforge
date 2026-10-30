# WF32-P1h — generic hard-surface degradation (30 October 2026)

**Status:** source-only art candidate for owner review; no playable Hunt or G4/G5 changes.

## Owner direction

Roads, flagstones and cobblestones were still too well maintained. Build reusable fracture, collapse and reclamation states rather than creating unrelated static tiles. Original 32×32 pixel art, continuous source field, stable stone IDs and generic material-boundary grammar remain mandatory.

## Implementation

- `tools/art/prototypes/wet-forest-masonry.mjs`: brick faces now have explicit stable IDs; missing faces stay absent. Flagstone and cobble identifiers remain unchanged.
- `tools/art/prototypes/terrain-hard-degradation.mjs`: all three hard families share a single degradation vocabulary: **intact → worn → broken → collapsed → reclaimed**. States only alter source art and material maps, never C# road condition or movement rules.
- Damage is chosen per original authored stone, seeded by its ID and a coarse world-phase exposure field, not per 32px atlas cell. Increasing degradation never resurrects a lost stone. Each state can remove whole stones or break a single stone into an irregular surviving fragment. Material gaps reveal dark earth, grit and occasional moss.
- **Half-broken pieces are intentional in the interior of the stone surface**, not the old error of slicing half a stone across a grass/soil/mud edge. `createDegradedBoundaryReview` reuses the existing whole-stone boundary policy to remove the entire *remaining* stone fragment when a boundary crosses it.
- `buildDegradedLightingMaps` exports albedo, tangent-space normal and non-color roughness G-channel; specular remains the scalar in the *existing* shared G `LitMaterial` contract. Relief follows sunken gaps, face heights and chipped areas without painting fake spotlights or runtime shadows.
- `build-hard-degradation-review.mjs` creates a native-resolution 3 × 5 degradation matrix (families × states), three reclaimed transition examples, 2× pixelated preview, and one normal/roughness example.

## Verification

```sh
node --test tests/javascript/*.test.mjs
node tools/art/prototypes/build-hard-degradation-review.mjs docs/art/previews/wf32-hard-degradation
```

- **34/34 local Node tests pass**, including 11 new P1h cases. Three families × five states; deterministic seeds; monotonic whole-stone loss; irregular retained fragments; complete surviving-piece boundary erosion; no visible cell-edge clipping; exact 32px reconstruction of albedo, normal and roughness.
- Generated images are **offline source-art studies, not in-game screenshots**.
- This implementation does not claim real-world screen-space shading, cast shadows, device FPS or gameplay approval.

## Known visual limitations and gates

- Brick rows remain more structured than flagstone/cobbles. Owner review may require further collapsed-row distortion while retaining coherent, physically credible brick construction.
- The 256px source period can visibly repeat across a large world. **WF32-P1i** must introduce world-scale independent region variation without shuffling neighboring 32px cells or breaking stone IDs.
- Different damage states use coherent authored stone IDs but are not dynamically interpolated during gameplay. World/site decisions belong to AR3 C#, not the art prototype.
- Owner visual approval, AR3 geography acceptance, and real-Hunt G GPU cutover remain separate mandatory gates. Keep PR #429 draft, and do not merge this artwork into the live game until approved.
