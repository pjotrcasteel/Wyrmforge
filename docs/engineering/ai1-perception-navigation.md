# AI1 implementation evidence

Authority: [AI0–AI6 milestones](../design/unified-agent-ai-milestones.md).

## 26 October — perception vertical slice (in progress)

AI0 #348 has been reconciled with main, with refreshed CI running. AI1 builds on that exact foundation in a separate branch; it does not modify Town rebuilding or GPU lighting.

The actual enemy lab now accepts `ai1=true` for Hollow and Mire Hound. Their executors consume confirmed or remembered locations, never the live player position when sight is denied. Range and geometry gate vision; memory expires; fresh sight is required for new Hound windups, while a committed pounce retains its warned lane. Normal Hunts and the AI0 compatibility switch retain their behavior.

The shared Domain sensor supports configurable vision range/cone, bounded line-of-sight query admission, seeded sampling, last-known contact age, and bounded sound/threat event observations. Hearing retains the emission location and cannot grant visual attack permission. These event contracts are unit-tested but are not yet connected to live combat event emission. The default lab profile (360 vision units, 220 hearing units, 120 active ticks of memory, six-tick sampling) is provisional, not accepted production balance.

Local validation and CI results are recorded below as they complete. Do not mark AI1 complete from this checkpoint.

Remaining AI1 gates:
- Connect authoritative hearing/threat emission to the playable simulation.
- Shared navigation query/result and retry contracts, dynamic obstacles, Hunt and Town spatial adapters (without Town behavior migration).
- Replace Whitefang's input-derived heading with earned motion observations.
- Fair admission under query saturation, full sensing replay restoration, and browser evidence for the AI1 inspector.
- Full final-head tests and CI before any merge or rollout. AI2–AI6 remain open.
