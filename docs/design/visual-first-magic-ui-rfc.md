# WyrmForge — Visual-First UI and Magic Discovery RFC (v1)

**Status:** Research and implementation proposal. No player-visible changes. Mobile-first (390 × 844 portrait reference) with desktop adaptation. **Do not deploy this RFC as a gameplay feature.**

## Design goal

On hunt 100, a player must immediately recognize: (1) what their single primary casts, (2) what they can combine with it, (3) what the choice changes, (4) which reward is worth risking, and (5) why another hunt matters.

**Design rule: show the effect first, the decision second, and the explanation on demand.** Interface complexity expands with player experience, not the number of catalog entries. Don't hide useful abilities behind long paragraphs, tutorials or hover-only hints.

**Exact user-provided recent Battlemage art reference:** [YouTube video](https://www.youtube.com/watch?v=WePyhtxZ4t0). See [Battlemage visual reference review](battlemage-visual-reference.md) for the verified provenance, open video-frame dependency, art checklist, and first original-art slice. Do not substitute screenshots from a different same-named game.

## Research and application

1. **Celia Hodent — UX practices for games:** clarity, perceptible symbols, legibility, consistency, and immediate player comprehension. https://celiahodent.com/ux-practices-epic-games/
2. **Nielsen Norman Group — Icon usability:** unfamiliar icons are ambiguous; pair a distinctive picture/shape with one or two visible words, especially for navigation and crucial decisions. https://www.nngroup.com/articles/icon-usability/
3. **NN/g — Recognition rather than recall:** show available choices in context; don't require remembering a tutorial or a separate screen. https://www.nngroup.com/articles/recognition-and-recall/
4. **NN/g — Progressive disclosure:** immediate core action, detail on explicit selection; avoid three-plus nested information layers. https://www.nngroup.com/articles/progressive-disclosure/
5. **Apple HIG — Game controls:** primary iPhone touch targets >= 44 × 44 pt, safe-area and thumb-zone considerations. https://developer.apple.com/design/human-interface-guidelines/game-controls
6. **Hades / Supergiant — Long Winter patch notes:** reduced visually obscuring attack effects; added iconic UI for progression and choice, supporting our recent combat-art cleanup. https://www.supergiantgames.com/blog/hades-long-winter-update-patch-notes/
7. **Noita wand mechanics:** positional composition of spells and modifiers suggests a visual recipe model, but direct copying of its dense wand-editor complexity would be unsuitable for a first-time mobile WyrmForge player. https://noita.wiki.gg/wiki/Guide:Wand_Mechanics

The patterns above are design principles, not evidence that a specific new WyrmForge layout has been user-tested.

## Current code audit (2026-10-15, main cf543313)

- `ForgeView.razor`: multiple destinations and separate screens for Run, Build, Forge, Codex, Hunt Preparation and Options; the top-level menu is currently mostly labeled buttons and small status lines. Too much navigation for the first decision: begin a meaningful hunt.
- `RunHubView.razor`: text-heavy current build and offering cards, with independent unlocked sections for Ascendants. The most important goal may be buried.
- `ForgeGoalBoard.razor`: three goals share the same visual priority, each with status line, title, descriptive paragraph, reward line. CSS collapses them to a **vertical stack on mobile**, requiring reading and scrolling.
- `CodexView.razor`: six top-level categories; the spells and synergies are a long list of icon + name + prose. Hard to compare recipes or see what is combinable now.
- `ForgeProgressionView.razor`: strong atmosphere and anvil identity, but multiple text-heavy blueprint sequences and tabs. Should become a targeted workbench for exploration, not a generic inventory page.
- `LevelUpOverlay.razor`: cards expose badge, rarity, rank, name, delta, description, hint, footer. Visually competing text fields obscure the important distinction between small refinements, rank breakthroughs, and transformations.
- `ArenaView.razor`: the authoritative single-primary HUD and world-space combat cues should remain minimal. Do not add a separate cooldown bar for every support modifier.
- `RunSummaryOverlay`: existing post-hunt progression should be reorganized to show one new discovery and one obvious next hunt without asking the player to read a recap.

## Shared visual grammar (use exactly the same visual language in all screens)

| Object / state | Silhouette / motif | Short on-surface label | Extended details |
| --- | --- | --- | --- |
| **Primary spell** | large solid round elemental medallion + characteristic projectile silhouette | “Fire Bolt” | one tap |
| **Minor refinement** | small square shard + one upward chevron | “+6% Force” | optional |
| **Major rank** | crown/star crest and **I → II** with larger central illustration | “Rank II” | optional |
| **Support element** | hexagonal rune socket, e.g. snowflake outline | “Frost” | one tap |
| **Catalyst / trigger** | diamond with recognizable trigger motif, e.g. chain | “Chain” | one tap |
| **Named combination** | two fused medallions, split outline, merged **single** effect preview | “Frostfire” | one tap |
| **Evolution** | distinct larger crest and transformed *spell silhouette*, not just different frame color | “Inferno” | one tap |
| **Unknown** | partial dark silhouette + visible one-step discovery clue | “Find in Depth II” | codex |
| **Available to craft** | full motif + hammer/anvil highlight | “READY” | one tap |
| **Acquired** | clear inset stamp / permanent border | “OWNED” | optional |
| **Equipped/active** | attached to the current primary spell glyph | “ACTIVE” | optional |
| **Risked vs secured** | open vs closed container + distinct silhouettes | “AT RISK” / “SECURED” | optional |

Color and motion reinforce school identity; **never encode essential state through color alone**. Use restrained fire/frost/storm/arcane palettes with consistent silhouettes and readable text. No three unlabeled fantasy glyphs in navigation and no emoji as production art.

## Screen A — Hunt Hub (default, no scroll for principal action)

**Priority:** large illustrated current pursuit occupying the upper half, one primary **BEGIN HUNT** action within thumb reach; compact selected primary/loadout and *one* next meaningful reward. Maximum two small secondary actions: **Magic** and **Forge**.

```text
╔══════════════════════════════╗
║ WYRMFORGE            ⚙       ║
║                              ║
║  [painted Ashfang silhouette]║
║  ASHFANG    DEPTH II         ║
║  ◈ Ashfang Essence   0/1     ║
║  ━━━━━━━░░░                    ║
║                              ║
║ [◉ Fire Bolt II] [◇ Frostfire]║
║                              ║
║     [ BEGIN HUNT  › ]         ║
║                              ║
║    [ MAGIC ]     [ FORGE ]    ║
╚══════════════════════════════╝
```

Important: the featured pursuit is selected from existing `ForgeGoalPlanner`, `SpellMasteryGoalPlanner`, `GreatHuntGoalPlanner`. Don't invent a disconnected goal database. Let user change pursuit only by tapping the featured card; no competing three-card wall on default view.

## Screen B — upgrade decision (frozen combat, immediate compare)

Show exactly the choices delivered by `LevelChoiceService` and `PowerMilestoneProfile`, **not UI-made alternatives**. For ordinary levels, each card is one symbol + a two- to four-word label + one numeric delta, with a pre/post mini demonstration. On major milestone, show the actual same-effect *before → after* cast silhouette with a prominent new behavior (pierce, blast, chain, nova) and modest information.

On a 390px iPhone: a single fixed-screen stack of 2–3 tap cards; only selected card expands its mechanics in an overlay. If the visible content would overflow, reduce decoration/secondary metadata and fit the safe area; do not force scrolling past the confirmation action. Evolution can take a separate two-option choice view.

```text
╔══════════════════════════════╗
║ LEVEL 5  ✦ BREAKTHROUGH     ║
║                              ║
║       [small fire bolt]      ║
║              →               ║
║      [larger blast art]      ║
║                              ║
║ FIRE BOLT   I → II           ║
║ [SHATTERS ON IMPACT]         ║
║                              ║
║       [ CLAIM POWER ]        ║
╚══════════════════════════════╝
```

*Animation is skippable / obeys reduced motion*. No mandatory cinematic before a choice; effects must match actual canonical ability data.

## Screen C — Magic Lab, the core 100-hunt screen

A **single visible recipe rail**, with a big animation preview above and 1–3 slots below. The primary spell remains fixed for the hunt; in the out-of-run lab the recipe is a blueprint *possibility*, not a primary swap.

```text
╔══════════════════════════════╗
║ MAGIC LAB            ⌕       ║
║ [preview: firebolt + frost]  ║
║                              ║
║ [ FIRE ] + [ FROST ] + [◇ ?] ║
║                              ║
║     [FROSTFIRE BURST]        ║
║     FREEZE + BURN            ║
║                              ║
║  [ TRY COMBINATION ]         ║
║                              ║
║  [KNOWN] [READY] [UNKNOWN]   ║
╚══════════════════════════════╝
```

Behavior:
- Tap a slot: bottom sheet shows up to six contextually compatible **illustrated** options; search/filter if more, not a scrolling encyclopedia.
- Tap an option: immediately preview one canonical cast, projectile and impact on a dummy in the magic laboratory. Reuse game rendering; do **not fake** attacks or show effects the system cannot perform.
- Valid recipe: fused spell image, visual status icons and one descriptive verb (“shatter”, “freeze”, “ignite”), with a one-tap test/forge action.
- Invalid: visibly incompatible socket, show why in a short inline phrase (“Needs Frost essence”), not a dead button or endless locked list.
- Unknown: occasional silhouette hints tied to real Forge goals; don't render hundreds of grey question marks.
- In-depth formulation remains accessible via `DETAILS`, but never blocks the primary exploration loop.
- No separate supporting spell auto-fire; all compositions modify the one committed primary or its triggered consequences.
- Maintain result identity (preview, Codex, combat impact and reward card share an icon and silhouette).

**Important architecture:** current `SynergyCatalog` defines three curated fusions. The Lab shown above is an interaction design; a broader generic recipe/trigger/catalyst engine **does not yet exist** and must be implemented as typed validated domain components before this screen can be treated as fully playable.

## Screen D — post-hunt report

A single substantial artwork moment / outcome, *at most* three compact meaningful lines: what was secured, what changed permanently, and the most promising next pursuit. One large **HUNT AGAIN** action, with small **CHANGE BUILD** action. Avoid mandatory “next run” coercion; choice remains with player.

```text
╔══════════════════════════════╗
║      HUNT COMPLETE           ║
║     [Wyrm defeated art]      ║
║                              ║
║ [✓ Cinder Essence SECURED]   ║
║ [✦ Fire lineage  2 / 3 ]    ║
║ [› Next: Frostfire recipe]  ║
║                              ║
║     [ HUNT AGAIN › ]         ║
║     [ CHANGE BUILD ]         ║
╚══════════════════════════════╝
```

After death, **SECURED** must remain truthful. Clearly distinguish permanent records/discoveries from lost physical essence cargo. No artificial participation reward or invented secure loot.

## Four information levels across the entire game

1. **In-world:** recognizable silhouette, spell animation, VFX, environmental cue; no paragraph. Combat first.
2. **At-glance overlay:** one action, one icon, 1–4 word label, single meaningful value/status.
3. **One tap:** real preview or short comparison and reason.
4. **Codex:** optional deep mechanics, history and research for advanced players. This is where longer content belongs.

Avoid a long tutorial. Reveal each relevant mechanic exactly when unlocked and let the actual screen demonstrate the use.

## Technical integration plan

- **M1 — Shared presentation descriptors**: typed read-only `SpellVisualDescriptor`, `RecipeVisualDescriptor` and `HuntGoalVisualDescriptor` deriving IDs and availability from existing domain/canonical state. No duplicate gameplay logic in Razor/JS.
- **M2 — One-glance hub + after-hunt**: replace stacked goal excerpts with featured pursuit and explicit next action. Reuse all persistent progression.
- **M3 — Level-up visual compare**: simplified refinement and milestone cards and actual before/after VFX from shared spell rendering; preserve accessibility names.
- **M4 — Magic Lab proof-of-concept**: first ship ONLY existing Frostfire, Stormglass, Arcane Conduit as validated visual recipes with instant live previews; expand generic recipe DSL behind deterministic compatibility validation.
- **M5 — Expand Codex** into image-first collection + family filtering, with one tapped recipe details pane. Desktop can expose optional side-by-side authoring, not force mobile columns.

## UX research acceptance (must be measured, not assumed)

Test novice players who have never read these docs, and veterans on both iPhone Safari and desktop:
- **Five-second comprehension**: after a brief static screenshot, identify primary spell, next actionable goal, and whether a resource is secured.
- **First tap**: find Start Hunt, choose a major upgrade, and assemble Frostfire without tutorial help. Record mis-taps, false expectations and time-to-action.
- **Preview comprehension**: compare two upgrades and say which affects damage, trigger, or crowd control; verify effect in live combat.
- **Repeat-player efficiency**: an experienced user can start a hunt or rebuild a known recipe without scrolling or visiting multiple nested menus.
- **Accessibility**: mobile portrait 320/375/390/430px + landscape; safe areas; 44pt primary targets; readable labels and contrast, reduced motion, keyboard navigation and screen reader accessible names.
- **Performance**: cap live recipe-preview VFX; cancel inactive previews; ensure no constant expensive off-screen rendering and preserve real combat FPS.
- **State fidelity**: Playwright checks available/locked/secured states against authoritative C# progression; one-to-one effect preview pixel tests where meaningful.
- **Result:** screenshot review at a glance, real user task observation, browser CI evidence. Do not claim this UX is self-explanatory merely because the layout was implemented.

## Non-goals

Not an alternate combat system, not a new resource economy, not changing fixed primary or level-5/10/15 milestone balance, not a full-screen neon rune wheel or generic oversized particle backdrop, not another deep navigation tree, not an icon-only interface without labels, and **not** an attempt to ship a fully compositional spell engine before defining its domain contracts.
