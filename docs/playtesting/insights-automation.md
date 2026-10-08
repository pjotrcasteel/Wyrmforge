# Privacy-safe scheduled playtest insights

**First external tester cohort gate:** keep gameplay development paused until real tester evidence exists. GitHub issue #54 tracks the opt-in Cloudflare intake; this workflow completes its *aggregate* reporting loop.

## How it operates

The `Publish privacy-safe playtest insights` workflow starts on a new `main` deployment, can be triggered manually and runs daily at 08:17 UTC. It reads the existing `playtest-collector` environment credentials. No new API token or database secret is needed.

The GitHub runner calls Cloudflare's **authenticated D1 Query API**, querying only aggregate SQL projections (ratings, intent, issue categories, distinct recent runs and average run duration/depth). It does not fetch raw reports or verbatim feedback and never stores a JSON dump, test seed or report identifier in a public artifact. The only allowed output is `docs/playtesting/insights/latest.md` on the separate **public** branch `playtest-insights`.

The owner's known synthetic integration report is excluded and deleted by exact ID at the start of each run. This deletion is idempotent and does not touch other reports. The output stays in a privacy-safe 'waiting for testers' state until at least **10** consented reports have been received. After that, only grouped categories with **at least 3 responses** are named, and small sub-samples are hidden. Daily report updates can still shift statistics; do not treat aggregate results as guarantees of anonymity.

**Visibility matters:** this is a public repository, so the aggregate report branch is public. Do not put any tester's written comments, run seeds, UUIDs or device specifics in that branch. Private comments and reproduction data remain accessible only through Cloudflare's owner-only endpoints.

## Where to review

- Aggregated results: `https://github.com/pjotrcasteel/Wyrmforge/blob/playtest-insights/docs/playtesting/insights/latest.md`.
- Workflow: `https://github.com/pjotrcasteel/Wyrmforge/actions/workflows/playtest-insights.yml`.
- Raw/private dashboard, if explicitly required by the owner: `tools/playtesting/collector_admin.py` using private credentials on a trusted local computer.

A development review can now inspect the aggregate GitHub report without receiving D1 administrator credentials. To analyze individual free-text responses safely, use the private dashboard or move that detailed analysis to a separate, private destination. The public aggregate intentionally contains **no verbatim player opinions**.

## Limitations

Reports reflect explicit consent and can contain repeated submissions from one tester. Report counts are **not** unique player counts. A person who never opens the feedback form is unobserved; completion funnels cannot be measured from this sample alone. The recent run sample is deduplicated by run ID, but includes only runs the tester chose to share.

Scheduled workflows may run late. GitHub Actions requires `contents:write` on the repository's workflow token for publishing the insights branch. A blocked automatic job must be investigated before inviting testers.

## Next step

Review aggregate results after the first 10–15 independent playtesters. Prioritize blockers in onboarding, touch controls, game feel and performance before returning to Ascendant and Elder Wyrm milestones. The iOS and Android release remains an explicit roadmap goal.
