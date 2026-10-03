# Wyrmforge

Wyrmforge is an experimental magic roguelike built in small, playable milestones. The project deliberately proves mechanics and architecture before increasing visual fidelity.

## Prototype 0.0.2 — Growth Loop

The current playable slice includes:

- responsive arena combat on desktop and touch devices;
- auto-targeting magic attacks;
- score, survival, death and restart loop;
- a pre-run passive tree with Minor, Major, Epic and Legendary nodes;
- mutually exclusive paths, one Legendary maximum and free pre-run respec;
- XP and run levels earned from kills;
- a paused 1-of-3 upgrade choice at each level;
- stackable in-run upgrades for damage, cast speed, health, movement, multicast, freeze, chaining and echoes;
- interactions between in-run upgrades and permanent-tree mechanics;
- local best-score persistence.

The purpose of 0.0.2 is not content volume. It tests the first complete roguelike growth loop: **kill → XP → choose → feel stronger → survive longer**.

## Technology

The game has **no paid runtime libraries**.

- TypeScript
- HTML5 Canvas
- Vite (MIT)
- Vitest (MIT) for tests
- GitHub Pages for the web demo

Game rules, input and rendering are kept separate. The web build is intentionally compatible with a later Capacitor wrapper (MIT), allowing the same game to be packaged for iOS and Android without rewriting the core game.

No Capacitor/native projects are checked in yet; they will be added when the web gameplay is stable enough to justify beta packaging.

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
2. Minor tree nodes add small additive stats.
3. Major tree nodes add large multiplicative/specialized stats.
4. Epic tree nodes change how a build works.
5. Legendary tree nodes change game rules.
6. Tree choices may lock competing paths.
7. During early prototypes the tree can be freely respecced before each run.
8. Mobile input and responsive layout are first-class requirements from the beginning.
9. In-run progression should create visible gameplay changes, not only larger numbers.
