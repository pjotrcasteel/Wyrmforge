# Wyrmforge: development and player-test environments

## Why two origins (not merely two Pages subdirectories)

The existing `main` branch automatically publishes to
[GitHub Pages](https://pjotrcasteel.github.io/Wyrmforge/).
That address remains the **development** build for the immediate alpha.

The **player-test** build is published independently to a Firebase Hosting
project at `https://wyrmforge-player-test.web.app/`.
A separate browser origin prevents shared `localStorage`, service workers
and other browser-origin state between builds. Two directories under the same
GitHub Pages hostname would **not** provide that separation.

This change does not modify the existing Pages deployment, G4 previews,
gameplay, world save schema, or Cloudflare feedback collector.

## Release rules

- `main`: fast development; existing Pages CI/CD stays automatic.
- `release/player-test`: deliberately promoted, reviewed commit; only this branch can publish
  to Firebase Hosting, either on push or by manual workflow_dispatch on `release/player-test`.
- Never automatically sync `main` into `release/player-test`.
- Require review or branch protection for `release/player-test` and approval on GitHub
  Environment `player-test`; do not enable unattended deployments for testers.
- Share only the test Firebase URL with external players.
- Every player-test bundle contains `build-id.txt` with its source SHA.
- When a test build must be rolled back, restore a known-good Firebase Hosting
  release in the console, then reconcile `release/player-test` with a reviewed revert before
  its next deployment. No force-push is required.

## One-time owner setup

1. The **dedicated Firebase Spark player-test project** has been created with
   ID `wyrmforge-player-test`. In Firebase Console enable Authentication
   (Google sign-in, with support email). Since October 15, 2026 newly created
   Firebase projects no longer automatically include a default Hosting site;
   enabling Firebase Authentication creates that default site. Check Hosting
   now lists `wyrmforge-player-test.web.app`. If not, create the default site
   using Firebase's hosted Cloud Shell (`firebase hosting:sites:create
   wyrmforge-player-test --project wyrmforge-player-test`); this runs in Google's
   cloud, not on your personal computer. Keep Auth and Firestore isolated.
2. The player-test workflow is already pinned to `wyrmforge-player-test`;
   there is **no project ID variable** to enter or maintain.
3. Create a limited-purpose Firebase Hosting deployment service account and
   securely store its JSON as the `FIREBASE_SERVICE_ACCOUNT_TEST` secret in the
   `player-test` GitHub Environment. Never commit or paste private keys.
   Do **not** generate a second automatic Firebase GitHub workflow: the
   checked-in `player-test.yml` is the single controlled release pipeline.
4. In GitHub Settings → Environments → `player-test`, configure a required
   reviewer and restrict deployments to the `release/player-test` branch, where available.
5. Enable Google Authentication in the **test project** only if the app needs
   it; authorize the test `*.web.app` hostname for Google sign-in.
   Ensure published `HunterBackup` settings use the test project. The workflow
   rejects a nonempty project ID that differs from `FIREBASE_TEST_PROJECT_ID`.
6. For in-game remote feedback, add the exact test origin (e.g.
   `https://wyrmforge-player-test.web.app`, no trailing slash) as the
   `WYRMFORGE_TEST_ORIGIN` variable in the GitHub `playtest-collector`
   environment. Run **Deploy private playtest collector** and validate a
   consented POST from the test browser; the existing Pages origin remains
   accepted. Then set the repository Actions variable
   `WYRMFORGE_TEST_FEEDBACK_ENDPOINT` to
   `https://wyrmforge-feedback-collector.pjotr-2.workers.dev/v1/reports`.
   Until explicitly configured, the test bundle has no remote collector;
   local feedback still works. Never put private tokens in the browser.
7. The dedicated `release/player-test` branch has already been created from
   the pinned environment-setup commit. Promote subsequent approved `main`
   commits deliberately, after CI and device checks. An environment approval
   gate is recommended before deployment.
8. Inspect the workflow's live smoke result and
   `https://wyrmforge-player-test.web.app/build-id.txt`; then share the
   test URL.

### Promote a tested commit

On your workstation, start from the existing `release/player-test` branch and fast-forward
it to a specific reviewed commit that is a descendant of the current `release/player-test`
head:

```bash
git fetch origin
git switch release/player-test
git merge --ff-only <approved-main-commit-sha>
git push origin release/player-test
```

If the SHA is not a descendant, review a cherry-pick/release PR instead of
force-updating `release/player-test`.

The exact `test` branch name could not be created via GitHub API (422), while
`release/player-test` was allowed. Avoid renaming the protected release branch
without updating the workflow and GitHub Environment deployment restrictions.

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
