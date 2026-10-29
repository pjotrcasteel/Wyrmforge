# Working on Wyrmforge

Start at [docs/canon/README.md](docs/canon/README.md). Read only the relevant canonical topic documents before changing gameplay, art, audio, UI or platform behavior. They are the sole intended-design authority; README release entries, dated handovers, RFCs and playtest notes are evidence, not competing specifications. Check current main and open PRs; preserve work from concurrent sessions. Check current main and open PRs; preserve work from concurrent sessions.

## Unified engine rule (LOCKED)

Before starting or continuing an engine, read [the canonical one-engine-per-responsibility rule and ENG0–ENG4 migration gate](docs/canon/roadmap.md#locked--one-reusable-engine-per-responsibility-owner-decision-27-october-2026) and [C# gameplay/event ownership](docs/canon/architecture-and-quality.md#locked--unified-engine-ownership-and-event-authority-27-october-2026). Reuse existing engine contracts for lighting, AI, animation, cosmetic physics, VFX and audio; do not add per-spell/monster/scene engines or transfer C# gameplay authority to presentation. For unrelated feature-engine extensions, owner-approved Hollowed improvements precede the ENG0–ENG4 consolidation checkpoint. **Explicit 29 October 2026 owner override: AR0–AR3 map-to-arena geography, navigation, exploration and solid-color semantic terrain are authorized to start immediately on an isolated branch. They are NOT blocked by Hollowed PR #399, ENG0–ENG4, G4/G5 PR #381, AI validation or FXP.** These are world-generation/site contracts using the existing C# simulation and current live arena renderer, not a new physics, lighting or animation engine. See the canonical [AR execution exception](docs/canon/roadmap.md#world-authored-arenas-and-groundmaterial-fidelity--ar0ar7-owner-decision-29-october-2026-locked) and [Work handover](docs/handover/2026-10-29-arena-world-first-work-execution.md). One coherent commit is a checkpoint, **not** a reason to stop work and request “continue”; keep pushing and validating until the assigned unblocked milestones are complete.

## Git checkpoints

The owner explicitly requires frequent remote checkpoints after repeated loss of unpublished work.

- Commit and push each coherent slice to a task branch before starting another slice.
- Push a checkpoint before long visual generation, capture, or validation work. A local commit alone is insufficient.
- Keep unfinished work on a clearly described draft PR; merge only validated changes.
- Verify the remote branch head after uploading. Record implementation status, remaining work and evidence in repository documentation.
- Do not describe incomplete art or missing validation as finished. Preserve source assets as well as runtime atlases.
