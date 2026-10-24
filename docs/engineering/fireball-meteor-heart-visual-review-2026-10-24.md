# Meteor Heart — visual review checkpoint (not approved)

**Status:** visual direction candidate; no production image, texture or renderer replacement.

## Real WyrmForge evidence

- Existing mobile Gothic-night Fireball evidence was captured by GitHub Actions workflow `Arena V2 Gothic Night L3 Fireball Review` at run `40125829727`, artifact `arena-l3-fireball-night-mobile-evidence` (14-day retention).
- Specifically inspect `lighting/arena-l3-mid-air-fireball-390.png`, `lighting/arena-l3-mid-air-fireball-320.png`, and the torch/fireball A/B screenshots. This is the actual runtime appearance and shows the current **small orange Fireball orb**, not a completed mutation.
- All five GitHub Actions workflows passed on commit `999c564`; those automated checks do **not** mean new artwork is approved.

## First review candidate, created outside the game

An eight-frame animated **Meteor Heart** motion study was prepared for owner review in the chat on 24 October. It explores a dark, cracked volcanic projectile with a narrow hot leading edge, moving embers and ragged trailing flame. A separately labelled concept composite was placed over the real 390px CI screenshot **only to evaluate relative scale**. Neither the study nor the composite is an actual runtime GIF, approved source asset, or evidence of integrated lighting. The concept files are not committed to this PR.

The review pack is explicitly **concept-unapproved**; its 8 alpha-matted PNG frames are preliminary and do not satisfy the production manifest's editable source / five-channel / owner approval requirements.

## Acceptance decisions before touching the live renderer

1. Owner accepts/rejects the **Meteor Heart silhouette, flame motion, relative pixel density and scale** against the existing Hunt screenshot.
2. Re-author approved frame art as actual editable Aseprite/Blender source, with consistent anchors and no matte fringes; do not ship the auto-matted concept as production.
3. Author the base Fireball, Cinder Needle, combined Meteor+Needle body, and actual impact/burning material clips. Detonation debris inherits the source body's material, never appears on zero-splash wall contacts. Burning follows actual C# fuel and prop events, not a fixed orange circle.
4. Export real albedo, emissive, normal, height and cutout channels; connect only to PR #332's shared GPU material/visibility engine once available.
5. Capture real **in-engine animated GIFs** at 320px and 390px from the Nexus and Hunts; confirm no false impact, no duplicated projectile, no fake burning field and correct light/shadow interaction. Owner signs off before production swap or merge.

The existing `fireball-ritual-hero.png`, Hunt Fireball painter and approved Town artwork remain untouched. This checkpoint advances **visual review**, not the production animation milestone.
