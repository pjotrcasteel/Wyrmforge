# Wyrmforge

Wyrmforge is an experimental magic roguelike built in small, playable milestones. Mechanics and architecture come before visual fidelity.

## Prototype 0.0.4 — Choice Clarity

The current playable slice contains:

- responsive arena combat for desktop and touch;
- a pre-run passive tree with Minor, Major, Epic and Legendary nodes;
- free pre-run respec;
- XP, level-ups and three-choice in-run progression;
- four distinct spells: Arcane Orb, Fire Bolt, Frost Shard and Chain Lightning;
- spell ranks that improve behavior as well as numbers;
- three first cross-spell synergies: Frostfire, Stormglass and Arcane Conduit;
- general runes that compound with the spell system;
- clearly differentiated Rune, New Spell, Spell Upgrade and Synergy choice cards;
- explicit rank transitions and before/after effect information on level-up choices;
- score, best-score persistence and run summaries;
- automated tests and GitHub Pages deployment.

## Technology

The game has **no paid runtime libraries**.

- TypeScript
- HTML5 Canvas
- Vite (MIT)
- Vitest (MIT)
- GitHub Pages

Game rules, rendering and input remain separated so we can keep the browser demo lightweight and later package the same web build for iOS and Android with Capacitor (MIT), rather than rewrite the game.

## Local development

```bash
npm install
npm run dev
```

Tests and production build:

```bash
npm test
npm run build
```

## Demo deployment

Pushes to `main` run tests, build the static site and deploy `dist/` through GitHub Pages.

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Every milestone adds one meaningful pillar rather than ten shallow systems.
3. Minor tree nodes add small additive stats.
4. Major tree nodes add large multiplicative or specialized stats.
5. Epic nodes change how a build works.
6. Legendary nodes change game rules.
7. Tree choices may lock competing paths.
8. Mobile input and responsive layout remain first-class requirements.
9. New content must create decisions or combinations, not merely inflate a list.
10. A player should understand the type and consequence of a level-up choice before needing to read its full description.
