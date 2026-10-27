# Arena-first shared lighting continuation

Town relighting is paused by owner instruction; retain the current painted 2D Town.
Continue PR #381, not a competing renderer.

## Implemented

- Normalize generic emitter directions after the Hunt coordinate transform.
- Cull finite point/spot ranges against the actual Hunt view before applying the
  shared light budget. Offscreen emitters with spill into the view remain eligible;
  directional sources are retained. Authoritative snapshots are never mutated.
- Regression with twelve distant sources proves a visible explosion is no longer
  starved by ID ordering; moving the camera changes eligibility without source renumbering.

## Still required before G4/G5 completion

The real Hunt still draws airborne spell/death/impact VFX after GPU composition.
Those paths need explicit shared material/emission adoption and black-world validation;
there must be no claim that all world VFX are already GPU-lit. Ground and actor captures
still upload Canvas textures every frame; stable atlas/material adoption and measured
upload budgets remain. Authored normals, reliable actor/foliage shadows, genuine
320/390px live-Hunt recordings and physical iOS/Android performance are outstanding.
No production cutover or final milestone completion is claimed by these changes.

Local validation: 18 focused adapter/shared-engine tests pass. .NET SDK is not installed
in this execution environment; CI must provide C# and real-game browser validation.
