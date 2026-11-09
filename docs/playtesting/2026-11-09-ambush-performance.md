# Ambush repaint and crowd rendering follow-up

Scope: continue PR #581 and integrate the presentation-only changes from #578 against main `270fef84`.
Canonical authority: [architecture and quality](../canon/architecture-and-quality.md).

## Changes

- Reject terrain cells whose local projected bounds cannot intersect the dirty clip, including base/fine heights, south-facing walls and loaded decal padding. Clip extents, painter order, textures and damage remain unchanged.
- Skip the secondary scratch canvas and emissive draw for enemy poses without loaded emission. Newly loaded glowing actions still render; emergence keeps its existing non-emissive behavior.
- Cull local elite/shield ground decorations by their padded bounds. All attack telegraphs still render independently, including offscreen casters targeting the viewport.

## Evidence

- Main and candidate were run against the same synthetic 32×60 terrain with 18 simultaneous fissure points and distant height extremes: 960 versus 600 cell painter visits (37.5% fewer). This is an operation count, not a phone frame-time claim.
- The full JavaScript suite passed 868/868 after integrating emission and decoration changes. A further 18-point ambush regression passes with the focused suite (73/73).
- Existing PR #581 head `76dbc8b` passed live cached-versus-fresh terrain pixel parity in GitHub Actions run 42531125292.
- Added a browser test comparing full albedo and normal maps after each of three 18-point fissure stages. The terrain workflow now runs the synthetic pixel tests as well as the live-Hunt test. Latest-head CI still needs verification.
- Current main's validation run 42530590593 fails in Application tests; its deployment run 42530590594 built and deployed successfully, but its smoke job failed. These are not introduced by this renderer patch. Do not describe the whole repository as green.
- This workspace cannot launch Chromium (Unix-domain socket restriction), and has no .NET SDK. Browser/.NET validation uses repository CI.

## Physical-phone acceptance remains open

Play the same Hunt route on iPhone through the warning, all three ground-crack stages, enemy emergence and combat. Preserve the approved cracks, enemy numbers, attack warnings and art. Check unchanged grass/road after impacts and record terrain repaint time plus frame pacing. Automated pixel parity does not establish smooth iPhone gameplay.
