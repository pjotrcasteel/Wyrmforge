# Hunter saves in the alpha

The browser builds a versioned Hunter snapshot from the keys registered in `SaveLayout.HunterKeys`. The first successful save copies the registered legacy values into the snapshot and leaves the original keys available for recovery. Existing serializers and progression rules still own each section.

The snapshot includes Hunter XP and levels, the chosen school and signature, Arcane Web budget and assignments, mutators, materials and Essence grades, research, loadouts, quests, onboarding, Forge and spell mastery, world progress, Chronicle state, one-time grants, Codex, bestiary and Great Hunt progress. Future professions and campaign features should register their own sections and save at the point where progress is committed. Device preferences, reporting data and leaderboard submissions have separate lifecycles.

Hunt settlement and Nexus purchases stage their related changes and commit them in a single browser storage write. If storage fails, keep the game open and use **Retry Hunter save**. Until a write succeeds, reopening the game restores the last successful snapshot.

## Online alpha

Keep the game on GitHub Pages and add optional Google sign-in for backups using Firebase Authentication and Cloud Firestore on Spark. The guest save works without signing in. Firebase setup still requires a project with Google sign-in enabled, the Pages hostname authorized and Firestore rules deployed. Use one private save per identity, write only at save checkpoints, and check the remote revision before uploading. Preserve the two saves when revisions conflict and require an explicit selection. Keep account recovery and Apple sign-in separate from device-local storage.

Before enabling backup, verify on iPhone Safari and Android Chrome that the same account can restore a Hunter from another device, the guest flow works without authentication, and users cannot access one another's saves. Test clearing storage, interrupted writes, old saves, and a conflict between two devices.
