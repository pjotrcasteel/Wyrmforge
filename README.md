# Wyrmforge

Wyrmforge is an experimental magic roguelike built in small, playable milestones. The project deliberately starts with mechanics and architecture before visual fidelity.

## Prototype 0.0.1

The first playable slice proves the foundation:

- responsive arena combat;
- keyboard and touch movement;
- auto-targeting magic attacks;
- score, survival and restart loop;
- a pre-run passive tree with Minor, Major, Epic and Legendary nodes;
- mutually exclusive Epic paths;
- one Legendary maximum;
- free respec before every run;
- local best-score persistence.

## Technology

The game has **no paid runtime libraries**.

- TypeScript
- HTML5 Canvas
- Vite (MIT)
- Vitest (MIT) for tests
- GitHub Pages for the web demo

Game state/rules, input and rendering are kept separate enough to evolve independently. The web build is intentionally compatible with a later [Capacitor](https://capacitorjs.com/) wrapper (MIT) so the same game can be packaged for iOS and Android instead of rewritten.

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

Repository Pages setting should use **GitHub Actions** as its deployment source.

## Foundation rules

1. A mechanic must be fun before it becomes pretty.
2. Minor nodes add small additive stats.
3. Major nodes add large multiplicative/specialized stats.
4. Epic nodes change how a build works.
5. Legendary nodes change game rules.
6. Tree choices may lock competing paths.
7. In 0.0.1 the tree can be freely respecced before each run.
8. Mobile input and responsive layout are first-class requirements from the beginning.
