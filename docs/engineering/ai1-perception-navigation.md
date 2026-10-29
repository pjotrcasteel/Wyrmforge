# AI1 implementation evidence

Authority: [AI0–AI6 milestones](../design/unified-agent-ai-milestones.md).

## 26 October — perception vertical slice (in progress)

AI0 #348 has been reconciled with main, with refreshed CI running. AI1 builds on that exact foundation in a separate branch; it does not modify Town rebuilding or GPU lighting.

The actual enemy lab now accepts `ai1=true` for Hollow and Mire Hound. Their executors consume confirmed or remembered locations, never the live player position when sight is denied. Range and geometry gate vision; memory expires; fresh sight is required for new Hound windups, while a committed pounce retains its warned lane. Normal Hunts and the AI0 compatibility switch retain their existing target acquisition. Whitefang has a separate correctness fix: heading comes from actual post-collision movement and is withheld outside 360 units or behind occlusion; it no longer reads desired input. Its full last-known-target migration remains pending.

The shared Domain sensor supports configurable vision range/cone, bounded line-of-sight query admission, seeded sampling, last-known contact age, and bounded sound/threat event observations. Hearing retains the emission location and cannot grant visual attack permission. Actual non-echo spell casts now emit an authoritative sound at the casting location. Threat-event ingestion is unit-tested; broader damage/threat producers remain pending. The default lab profile (360 vision units, 220 hearing units, 120 active ticks of memory, six-tick sampling) is provisional, not accepted production balance.

Local validation and CI results are recorded below as they complete. Do not mark AI1 complete from this checkpoint.

Remaining AI1 gates:
- Connect further authoritative damage/threat event producers; actual spell-noise hearing is implemented.
- Hunt and existing Town adapters share typed Moving/Arrived/Blocked/Deferred results and query admission. Dynamic gate/obstacle recovery is tested. Hunt routing remains the existing local detour algorithm, not a global pathfinder; Town behavior migration and 3D contracts remain separate.
- Whitefang input-derived heading is fixed; full last-known-target execution is not yet migrated.
- Round-robin lab execution and retry after denied sensing prevent stable early-agent monopolization. A 200-agent test verifies all are sampled under a 16-query budget, deterministically. Sensor JSON restore-and-continue is tested; full adapter/world replay remains separate. Browser evidence is pending.
- Full final-head tests and CI before any merge or rollout. AI2–AI6 remain open.

## Checkpoint validation

393 Domain tests pass; 21 focused Application tests pass; browser test project builds with zero warnings/errors. The full Application suite is being rerun after the final changes. Focused Application coverage includes AI0 full-frame compatibility, AI1 deterministic execution, range denial, real closed/open gates, committed attacks, and dynamic Town/Hunt path recovery. Final full suites and new browser tests are running; no AI1 completion or rollout is claimed.

Final review also guards routed enemies against exact-position fallback, and derives motion across scheduled sight samples without carrying motion through confirmed occlusion. Local WASM packaging is blocked by the environment's out-of-process task-host socket restriction; ordinary C# and browser-test compilation succeed. Published browser execution is validated in GitHub CI, not inferred from compilation.
