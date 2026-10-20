# Ashling release 0.0.141 verification

Owner authorized shipping after approving the in-game Ashling. PR #168 merged by squash as `f986ea96bd0ed6d275523f95d363e5f2251d7155`.

Exact release head `6059a117b34eb8da0d0d181c7da439c6c278cdf1` passed both [Validate Wyrmforge](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39479805707) and [Browser smoke](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39479805711) before merge. Local evidence and validation are in `ashling-runtime-integration-2026-10-20.md` and `evidence/ashling-runtime-2026-10-20/`.

[Pages build, deployment and deployed smoke](https://github.com/pjotrcasteel/Wyrmforge/actions/runs/39480715855) all passed for the merged revision. Public HTML returned HTTP 200 and contains exact revision `f986ea96bd0ed6d275523f95d363e5f2251d7155`. Release 0.0.141 is live at https://pjotrcasteel.github.io/Wyrmforge/.

Independent live browser checks pass actual Ashling movement, contact attack, collapse frame 6, held death frame 27 and stable pause, with zero page errors. A separate live turning capture passes S/SE/E/NE/N facings, continuing action and gait phases, stable pause and no 320px overflow. All three public PNGs match the approved local runtime bytes exactly (SHA256 evidence preserved).

Evidence: `docs/art/evidence/ashling-live-0.0.141/` contains lifecycle and turning reports, public atlas hashes, screenshots and a live moving-attack GIF. This verifies the deployed game, not a standalone animation preview. Physical iPhone Safari remains unverified.

This verification document and any capture-tool adjustments made after squash are preserved on the task branch; they are not additional runtime changes in the merged release.
