# Ashfang Tier I animation foundation

Source/export candidate for owner review, following [canonical art direction](../../../../../../docs/canon/art-and-animation.md). The owner-approved Zagmatorah anatomy and requested tail-fan removal are preserved. Materials and motions do not yet have owner acceptance. The live game has not been changed.

## Delivered motion scope

41 editable actions on the original 112-bone rig: idle/alert/look, locomotion and start/stop transitions, left/right turns, pounce, three claw attacks, bite, two tail strikes, roar, breath start/loop/end/sweep, takeoff, flight/hover/glide/banks, aerial breath, landing, three hit directions, stagger/recovery and two held deaths. See [catalog](../../ANIMATION-CATALOG.md).

The packed master is `../../archive/motion-foundation-001-packed/ashfang-animation-foundation.blend`, SHA256 `38a0125d782e7cc7c0e6121779cd35e57e2175770d9348738477873b59a9076b`. Its 20 image datablocks are packed. Original geometry, UVs, weights and bone bind hierarchy are preserved; imported mesh world-transform normalization is below 1e-6 model units. Temporary authoring controls are baked and removed.

## Visual findings and limits

Actual rendered walk/run/pounce/claw/roar/flight sequences are in `motion-overview.gif`; all-action contact sheets sample the actual atlas cells. Ground motion uses the wing forelimbs and hind legs, with folded fingers during support. The pounce compresses, launches and lands; claw variants move independently; flight articulates the wing joints. The original long tail and wing silhouette remain. These are source motion reviews, not proof of satisfying gameplay combat weight, timing or screen readability in a Hunt.

Skin uses charcoal scales, scorched red membranes and localized ember fractures. Fire and smoke remain separate game VFX. Breath exports animate the dragon and supply mouth sockets/directions plus effect windows; they contain no fire plume. Source framing includes the long tail and extended wings, so the 256px cell's visible body occupies only part of the cell. Inspect the 512px masters when judging fine skin detail. Final in-game size and background contrast need actual encounter review.

Eight views are separately rendered rather than mirrored. Ground pivots, projected attachments, root travel, root height, contacts, timing and event markers accompany every frame. Jump/flight height is already baked into the character pixels. C# must remain authoritative for movement, hits, interruption and ability timing.

Scale-two idle, walking and flight renders preserve projected poses/pivots/attachments and scale travel correctly. This establishes uniform rig reuse; new higher-tier armor/horns still require deformation and bounds review. No higher-tier geometry or physical-phone acceptance is claimed.

## Evidence

- `source-validation.json`: evaluated deformation, loop seams, 20 handoff seams, ground-contact tolerance, held deaths and all-direction bounds.
- `packed-anatomy-validation.json` and `packed-motion-validation.json`: standalone source structure, dependencies and actual actions.
- `remote-native-validation.json` and `remote-motion-validation.json`: independently retrieved packed master reopened and validated.
- `scale-two-proof.json`: actual idle/walk/fly rendered scale comparison.
- `../../exports/motion-foundation-001/atlas-validation.json`: frame counts, nonempty/unclipped bounds, file hashes and lossless master-cell comparison.
- `browser/browser-report.json`: actual offline atlas loading/playback, pause, stepping, direction phase carry, death hold and 390px viewport checks. Viewport emulation is not physical-device acceptance.

Remaining work after source/export delivery: owner art/motion review, game adapter and authoritative action integration, separate VFX, encounter tuning and real Hunt/phone validation. Draft PR #299 stays unmerged.

## Final remote receipt

Asset checkpoint `bffd886b064396b213c27960645a28538f4d7d95` was pushed and its remote branch head verified. A separate LFS cache retrieved and SHA256-verified all 801 tracked LFS objects, including all 656 final atlases and the packed animated master. See `../../remote-lfs-verification.json`. GPU render jobs completed successfully; no render remains running.
