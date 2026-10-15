# WyrmForge — repository issue/PR triage (2026-10-15)

**Scope:** `pjotrcasteel/Wyrmforge`. This is the auditable disposition of the **four standalone issues** and **four pre-existing open PRs** discovered on 15 October 2026. PRs appear as issues in GitHub's `/issues` endpoint; they are not eight separate issues. [Return to active handover](current-handover.md).

## Outstanding issues — preserve, do not auto-close

| Issue | Priority / disposition | Why still relevant | Concrete next evidence |
| --- | --- | --- | --- |
| [#60 — GitHub-hosted runner blocked by Cloudflare 403](https://github.com/pjotrcasteel/Wyrmforge/issues/60) | **P0 — KEEP OPEN** | Repeated Pages workflows report failure **after successful build/deploy/browser smoke**, in the external collector/Worker verification. No evidence of a player outage; CI also must not fabricate availability. | Inspect latest Pages `build/deploy/smoke` jobs individually; diagnose Cloudflare WAF/runner egress, verify real-browser `/health` and consented report; isolate external inconclusive state without weakening Worker protection or CORS/consent checks. |
| [#66 — Hall of Fame real score receipt, moderation and anti-cheat](https://github.com/pjotrcasteel/Wyrmforge/issues/66) | **P1 — KEEP OPEN** | D1 leaderboard is opt-in but community scores are currently UNVERIFIED. Consent, verified persistence, organizer moderation and tamper-resistance remain actionable. | Conduct real second-hunt opt-in submission, verify D1 receipt via restricted organizer access, distinguish LEGEND · DEMO vs COMMUNITY · UNVERIFIED, review delete/moderation + client tampering and retention. Keep feedback and scores distinct. |
| [#108 — Arcane Laboratory](https://github.com/pjotrcasteel/Wyrmforge/issues/108) | **LATER — KEEP OPEN** | Direct user-approved long-term mechanic: discover and craft primary+secondary magic combinations (e.g. single Frostfire spell), in an in-world lab, without uncontrolled simultaneous casts. No current implementation. | First make focused single-primary casting, first Frostfire fusion and art/gameplay readable; later introduce deterministic recipe IDs, unlock vs equip distinction, saved experiments and per-combination budget/replay tests. |
| [#55 — iOS and Android native release](https://github.com/pjotrcasteel/Wyrmforge/issues/55) | **LATER — KEEP OPEN** | Explicit product intent beyond web demo. Portability, storage migration, native lifecycle, input/audio/haptics and store compliance are unresolved. | Prototype hybrid/native shell on physical devices *after* mobile browser/art gate; retain shared deterministic C# Domain/Application and versioned saves; test offline/resume/thermal/touch/store privacy. |

No standalone issue above is demonstrably outdated/completed; deleting or closing any merely to reach zero open issues would lose work.

## Pull request triage

| PR | Outcome / reason | Preserved work |
| --- | --- | --- |
| [#111 — visual-first magic UI / Battlemage reference](https://github.com/pjotrcasteel/Wyrmforge/pull/111) | **MERGED (docs only)**. Valuable researched screen hierarchy and accurate reference observations; no gameplay/UI or copied assets shipped. | [Visual-first RFC](../design/visual-first-magic-ui-rfc.md), [Battlemage art reference](../design/battlemage-visual-reference.md). Implement slices only after actual iPhone comprehension review. |
| [#94 — recorded dark-fantasy audio direction](https://github.com/pjotrcasteel/Wyrmforge/pull/94) | **MERGED (docs only)**. Preserve clear licensing options and classic dark-fantasy music direction, not an unapproved sound replacement. | [Audio plan](../audio/classic-dark-fantasy-rebuild.md), [licensed candidate inventory](../audio/licensed-audio-candidates.json). **All candidates unreviewed and unauditioned.** |
| [#67 — continue Arcane point rewards](https://github.com/pjotrcasteel/Wyrmforge/pull/67) | **CLOSED as superseded by merged [#115](https://github.com/pjotrcasteel/Wyrmforge/pull/115)**. The original stale branch no longer had a clean merge path against evolved `main`; the missing points were fixed and regression-tested. | Port only current-app eligibility/credit logic and tests; first hunt begins with initial 1 point, every subsequent completed non-abandoned hunt adds one up to the `PassiveTreeCatalog` cap; no duplicate credits. Original #67 is closed; the replacement is merged and all branch checks passed. |
| [#64 — player variation/0.0.83 fairness experiment](https://github.com/pjotrcasteel/Wyrmforge/pull/64) | **RETIRE / CLOSE as outdated executable branch.** The old experimental harness and optional patch were developed against 0.0.83; major movement, territory, gameplay, UX and 2.5D rendering changed since then. The 9,552 scenarios are **historical, not calibrated human or present-day balance evidence**. | Archive the full [study](../playtesting/archive/player-study-0.0.83.md) with provenance and limitations. Revalidate target warning reachability, world-vs-screen geometry, early unspent builds and flawed edge-unaware self-play against the current engine. Do NOT silently apply old `candidate-telegraphs.patch`. |

## Recently merged feature and art baseline

- [#114 — mage staff and monastery perspective correction](https://github.com/pjotrcasteel/Wyrmforge/pull/114): world-space masonry, character depth, thin upright shaft, no random monastery monoliths, subtler spell wards and verified browser tests; physical iPhone visual approval remains open.
- [#112](https://github.com/pjotrcasteel/Wyrmforge/pull/112), [#113](https://github.com/pjotrcasteel/Wyrmforge/pull/113): original monastery/enemy art plus walking/light improvements, but not a finished production sprite atlas.
- [#115](https://github.com/pjotrcasteel/Wyrmforge/pull/115) is the current branch-based implementation of the progression fix rather than pulling old #67 onto `main`.

## Closing criteria for future caretakers

1. **Merge PRs only if their current diff is still correct**, their actual acceptance gates pass, and a green branch check is not contradicted by current `main`.
2. **Close superseded drafts with a specific replacement commit/PR**; preserve useful findings in durable main-branch docs before closing.
3. **Don't conflate GitHub Pages deploy with external collector monitoring**. Check separate jobs; respect Cloudflare security, privacy and consent.
4. **Do not prematurely close backlog commitments** (#55, #66, #108) merely because they're long-term, nor treat docs-only merges (#94, #111) as delivered gameplay/art/music.
5. Review issue bodies/status again before every milestone; these are living issues, not an instruction to implement everything in the next release.
