# Hunter saves in the alpha

The browser builds a versioned Hunter snapshot from the keys registered in `SaveLayout.HunterKeys`. The first successful save copies the registered legacy values into the snapshot and leaves the original keys available for recovery. Existing serializers and progression rules still own each section.

The snapshot includes Hunter XP and levels, the chosen school and signature, Arcane Web budget and assignments, mutators, materials and Essence grades, research, loadouts, quests, onboarding, Forge and spell mastery, world progress, Chronicle state, one-time grants, Codex, bestiary and Great Hunt progress. Future professions and campaign features should register their own sections and save at the point where progress is committed. Device preferences, reporting data and leaderboard submissions have separate lifecycles.

Hunt settlement and Nexus purchases stage their related changes and commit them in a single browser storage write. If storage fails, keep the game open and use **Retry Hunter save**. Until a write succeeds, reopening the game restores the last successful snapshot.

## Online alpha

GitHub Pages serves the game. Optional Google sign-in uses Firebase Authentication and Cloud Firestore on Spark. Backups are manual from **Settings → Hunter backup**, and each account has one private save. Uploads check the last known cloud revision in a transaction. A conflict preserves both copies until the player explicitly restores the cloud copy or confirms overwriting that specific cloud revision. Restoring reloads the game so the Hunter is rebuilt from the chosen snapshot.

### Configure Firebase

1. Create a Firebase Spark project and register a web app. Enable Google sign-in and authorize `pjotrcasteel.github.io` under Authentication settings. Add `localhost` explicitly for local sign-in tests if needed.
2. Create the default Firestore database. From `services/hunter-backup`, run `firebase deploy --only firestore --project YOUR_PROJECT_ID`. Use a dedicated database project for Wyrmforge. The deployed rules allow authenticated players to read and update only their own backup, and exclude the save payload from indexing.
3. Set the public web app's `apiKey`, `authDomain`, `projectId` and `appId` under `HunterBackup` in the web project's `wwwroot/appsettings.json`. Keep the section empty for builds where cloud backup should be disabled. Use separate Firebase projects for alpha and production when both exist.
4. On iPhone Safari and Android Chrome, sign in and back up after a Hunt. In a second browser profile, use the same Google account to restore. Then earn progress separately in both profiles and verify that the older revision prompts for a choice. Use a second Google account to verify account isolation, and test guest play with the network disconnected after the game has loaded.

The browser requests Firebase only after the player opens cloud backup setup. The alpha uses Google popup sign-in, so test popup permissions on both phones. These are application-level save documents on Spark, independent of Firestore's managed backup feature. Native Apple sign-in and native account deletion are separate release tasks.
