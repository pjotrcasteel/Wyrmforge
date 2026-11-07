# Wyrmforge: development and player-test environments

## Why two origins (not merely two Pages subdirectories)

The existing `main` branch automatically publishes to
[GitHub Pages](https://pjotrcasteel.github.io/Wyrmforge/).
That address remains the **development** build for the immediate alpha.

The **player-test** build is published independently to a Firebase Hosting
project at `https://<FIREBASE_TEST_PROJECT_ID>.web.app/`.
A separate browser origin prevents shared `localStorage`, service workers
and other browser-origin state between builds. Two directories under the same
GitHub Pages hostname would **not** provide that separation.

This change does not modify the existing Pages deployment, G4 previews,
gameplay, world save schema, or Cloudflare feedback collector.

## Release rules

- `main`: fast development; existing Pages CI/CD stays automatic.
- `test`: deliberately promoted, reviewed commit; only this branch can publish
  to Firebase Hosting, either on push or by manual workflow_dispatch on `test`.
- Never automatically sync `main` into `test`.
- Require review or branch protection for `test` and approval on GitHub
  Environment `player-test`; do not enable unattended deployments for testers.
- Share only the test Firebase URL with external players.
- Every player-test bundle contains `build-id.txt` with its source SHA.
- When a test build must be rolled back, restore a known-good Firebase Hosting
  release in the console, then reconcile `test` with a reviewed revert before
  its next deployment. No force-push is required.

## One-time owner setup

1. Create a **dedicated Firebase Spark project for player testing** (different
   from the existing development/alpha Firebase project). Enable Hosting.
   Keep Authentication and Firestore isolated too if cloud save is enabled.
2. In GitHub repository Settings → Secrets and variables → Actions → Variables,
   add `FIREBASE_TEST_PROJECT_ID` equal to the exact project ID.
3. Run the official Firebase CLI `firebase init hosting:github` or create a
   limited-purpose Hosting deploy service account and securely add its JSON as
   the `FIREBASE_SERVICE_ACCOUNT_TEST` secret to the `player-test`
   GitHub Environment. Never commit or paste private keys.
4. In GitHub Settings → Environments → `player-test`, configure a required
   reviewer and restrict deployments to the `test` branch, where available.
5. Enable Google Authentication in the **test project** only if the app needs
   it; authorize the test `*.web.app` hostname for Google sign-in.
   Ensure published `HunterBackup` settings use the test project. The workflow
   rejects a nonempty project ID that differs from `FIREBASE_TEST_PROJECT_ID`.
6. If using in-game remote feedback, first configure the Cloudflare collector
   to allow the test site origin and verify a consented POST end-to-end.
   Then set repository variable `WYRMFORGE_TEST_FEEDBACK_ENDPOINT` to an
   HTTPS endpoint ending in `/v1/reports`. Until explicitly configured,
   the test bundle exposes no remote collector; local feedback still works.
   Never put private tokens in the browser.
7. Once a candidate has passed CI and device checks, create the `test` branch
   from that *exact* approved `main` commit. Push it. The workflow is already
   defined in the repository and its release requires the environment approval.
   Creating the branch in advance is optional.
8. Inspect the workflow's live smoke result and
   `https://<FIREBASE_TEST_PROJECT_ID>.web.app/build-id.txt`; then share the
   test URL.

### Promote a tested commit

On your workstation, start from the existing `test` branch and fast-forward
it to a specific reviewed commit that is a descendant of the current `test`
head:

```bash
git fetch origin
git switch test
git merge --ff-only <approved-main-commit-sha>
git push origin test
```

If the SHA is not a descendant, review a cherry-pick/release PR instead of
force-updating `test`.

### Monday player-test acceptance

1. Development Pages and test Firebase show distinct build identities.
2. A subsequent `main` merge changes Pages **without changing test SHA**.
3. On the same iPhone/Android browser, new game progress in dev does not
   modify the test origin's local progress, or vice versa.
4. Restart the test game, finish a Hunt, and verify progression survives.
5. Test Google sign-in, cloud save/restore and cross-device conflict handling
   against only the test Firebase project, if enabled.
6. Submit one fully consented feedback report, verify receipt, then remove
   test data; if collector origin is not ready, keep remote feedback disabled.
7. Test offline/reload, iOS Safari, Android Chrome and one complete Hunt
   through the Wyrm including death, restart and rewards.
8. Record the source SHA and keep Monday's cohort on that version until an
   explicitly approved hotfix.

## Future production

When Wyrmforge is ready to launch broadly, add a third, production-specific
origin, Firebase project, protected branch/environment, and stricter release
gates. Do not turn the rapid development Pages site into production by accident.
