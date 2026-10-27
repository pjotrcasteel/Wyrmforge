# AN0–AN6 execution record — 27 October 2026

Base: `c84eac3347a28b52b1d61cb507ff7e60711d9774` (main at checkout).
Reference PR #385 head: `def5ced9e499a0057ce743c73c965db0a63f8e95`; draft, unmerged. No commits cherry-picked wholesale.

## Audit evidence

- Baseline Node suite: `node --test tests/javascript/*.test.mjs`: **478/478 passed**.
- `RunSimulation.Enemies.cs:356–375`: Hollowed proximity damage remains C# continuous contact DPS. Presentation's reach is **not** an authoritative strike event.
- Current shared `sprite-animation.js` supports independent region playback; current Hollowed adapters select cape-free whole-body injury/arm atlases before the legacy compositor. Therefore “layered legs” is not asserted to be the live main drawing defect; it is present in PR #385's source experiment.
- Current adapter continually steers facing during the reach and resets identity phase on large reposition; freeze returns moving=false, which changes the idle choice. Source correction and opt-in runtime adoption remain separate tasks.
- PR #385 source experiment explicitly samples the old walk independently, mixes upper-body attack matrices and keys root yaw. Rejected maul/bite are not reused.
- Exact cape-free editable standard rig exists locally: 22 bones, identity armature world matrix; bone head/tail/rest orientations inspected with Blender 4.5.3.
- Current main has ANIM1–ANIM4, **not AN0–AN6**. This branch must reconcile canonical naming using the owner's execution contract without treating the renamed gates as completed.

## Tooling and limits

Blender 4.5.3 LTS (67807e1800cc), .NET SDK 10.0.100, Node and ffmpeg available. Full clone attempted; switched to shallow checkout and skipped unrelated Ashfang LFS downloads. No missing Hollowed source substituted.

Shell push failed: `fatal: could not read Username for 'https://github.com': No such device or address`. Use authenticated GitHub connector for remote commits; no credential probing.

First .NET command failed MSB1025, named pipe SocketException(13). Retry restore/build single-node with `-m:1 -nr:false`, no shared compiler; do not claim C# passes until it executes.

## Checkpoint, not completion

Shared API v2 adds opt-in schema validation, source contact samples, monotonic action sequence, committed facing, authored support-step pivot timing, bounded subpixel root correction and explicit residual slip diagnostics. Existing v1 consumers remain unchanged. Generic biped/palm/paw tests are plumbing proof, **not** biomechanical or art acceptance. A nonzero slip diagnostic is a failed asset/integration gate, not an approved correction.

AN0 audit in progress; AN1 contracts under test; AN2–AN6 **open**. No owner acceptance, merge, release, deployment, device test or final-Hunt GPU proof claimed.
