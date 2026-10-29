# WyrmForge — central playtest collector (0.0.81)

## Status and security boundary

The **collector is deployed on Cloudflare** at `https://wyrmforge-feedback-collector.pjotr-2.workers.dev`, with D1 migrations and Worker secrets applied by GitHub Actions run #2. The public, non-secret intake URL is now part of the game's checked-in configuration, with optional override via `WYRMFORGE_FEEDBACK_ENDPOINT`. GitHub Pages itself remains a read-only host; do not place a private token in the web project.

The Cloudflare Worker accepts only explicitly consented reports: manual feedback submissions, or compact AI profiling reports uploaded automatically **after a tester deliberately enables the separate opt-in** in the playtest feedback dialog. Merely starting or playing the game never authorizes an upload. Automatic profiling occurs locally before consent and is never automatically uploaded while the option is off. It validates and allowlists fields, uses D1 storage, HMAC IP-based rate limiting (no raw IP persisted), private Bearer-token administrator endpoints and 30-day scheduled deletion.

**Important:** Like any web server, Cloudflare infrastructure can have operational logs. No guarantee of absolute anonymity can be made. Free text may contain identifying information volunteered by a tester; tell testers not to include personal details.


## AI6 automatic profiling for opted-in playtesting (merged PR #364)

During live Hunts with the AI opt-in enabled (`?agents=1`), the authoritative C# simulation samples about once every 300 AI frames (~5 seconds at 60 Hz) and at the end of the run. Samples summarize the agent-update frame count, population, rolling mean/p95 and peak CPU cost, maximum line-of-sight/path query counts, simultaneous threat slots, actual resolved hunter HP damage and bounded agent-trace diversity/decision latency. The ordinary browser run profiler continues to record slow frames and main-thread simulation/bridge sampling independently.

The collector stores **only compact allowlisted numeric AI summaries**, with no player/world coordinates, raw observations, detailed decision traces, names, free text, full user-agent string or precise viewport in automatic uploads. Its administrator-only summary aggregates submitted AI runs in D1; the optional local `collector_admin.py` dashboard shows AI p95, maximum frame cost, populations and query pressure. These are host-side measurements until tested on physical iOS and Android devices.

**Explicit choice and revocation:** from the Town/Forge playtest feedback dialog, an unticked option reads "Automatically send limited AI performance and combat summaries after each future Hunt." Ticking it stores an opt-in on that browser; each subsequent completed run with recorded AI metrics submits a single minimized report to the existing HTTPS collector. Unticking it stops future uploads, and **Erase my local playtest history** also revokes that choice. No opt-in means no background network upload. The normal manual feedback report still requires its own one-time checkbox before being sent. Failed automatic submissions never block play and local JSON export remains available.

**Privacy boundaries:** transport requests inevitably involve transient network metadata (such as a source IP) at Cloudflare, and coarse gameplay values may still be personal data when combined. Do not claim legal anonymity solely because names are omitted. The existing 30-day retention and temporary HMAC rate limiting apply. Confirm transparency, data-protection arrangements and applicable lawful basis before inviting external testers. There is no behavioral advertising, cross-device tracking or persistent telemetry identifier.

**Deployment and acceptance:** [PR #364](https://github.com/pjotrcasteel/Wyrmforge/pull/364) was merged to `main` on 29 October 2026. The `main` Pages and private Cloudflare collector deployment workflows succeeded on merge commit `e60a4ba8`; this does **not** prove an end-to-end consented report was received on a physical phone. The [post-merge frame-pacing follow-up #400](https://github.com/pjotrcasteel/Wyrmforge/pull/400) is a separate draft and must pass CI before release. CI runs `node --test tests/javascript/playtest-ai-profiler.test.mjs`, the collector sanitizer tests and the normal C#/browser suite. End-to-end real-device consent/upload/receipt and private dashboard verification remain required before declaring AI6 user testing ready.

## One-time Cloudflare setup (requires account owner)

1. Create or sign into a Cloudflare account. Enable Workers and D1. Choose EU jurisdiction if that matches your storage/compliance requirements. Review service pricing and privacy arrangements before inviting testers.
2. Create a D1 database named `wyrmforge-feedback` in Cloudflare's dashboard or run `npx wrangler d1 create wyrmforge-feedback` after authenticating. Copy the **real UUID** from the output.
3. Create a narrowly scoped Cloudflare API token with permission to deploy Workers and manage this D1 database. Do **not** commit or paste it into a chat or JavaScript.
4. In the GitHub repository Settings → Environments, create an environment named `playtest-collector`, preferably with required reviewer approval. Configure these **environment secrets**:
   - `CLOUDFLARE_API_TOKEN` — private account-scoped deployment token.
   - `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier.
   - `WYRMFORGE_COLLECTOR_ADMIN_TOKEN` — new random secret (e.g. generated from a password manager).
   - `WYRMFORGE_COLLECTOR_RATE_KEY` — separate random HMAC secret.
5. Add environment variable `WYRMFORGE_D1_DATABASE_ID` containing the D1 UUID. Enable the Worker `workers.dev` subdomain or configure a custom HTTPS hostname.
6. Trigger **Actions → Deploy private playtest collector → Run workflow**. This runs tests, D1 migrations, deployment and Worker secret installation. No endpoint accepts reports unless the rate-limit secret exists.
7. Verify `https://<your-worker-host>/health` returns a JSON status. Verify a POST requires the exact origin `https://pjotrcasteel.github.io`. **Never test with personal player data**.
8. The public HTTPS URL is now checked into `src/Wyrmforge.Presentation.Web/wwwroot/playtest-collector-config.json`, and the Pages workflow publishes it automatically. For a future hostname change, update this file or override it with the GitHub Actions repository variable `WYRMFORGE_FEEDBACK_ENDPOINT`. This URL is public configuration, not a credential.
9. A push to `main` triggers **Deploy Wyrmforge demo** and publishes the URL automatically. The post-deploy smoke validates the published URL, Worker health, CORS and rejection of no-consent requests. In the game, **Send feedback privately** appears in the playtest dialog, disabled until a tester checks the consent box.
10. Submit a synthetic test report and confirm its receipt using the owner tool below. Only then invite the external cohort.

The Cloudflare account and D1 database were provisioned by the owner; GitHub Actions deployed the Worker. The game's existing Share / Download JSON option remains available if the collector is unreachable. A real report write still needs a voluntary end-to-end submission to verify receipt in the private dashboard.

## Private reporting dashboard

On your **local trusted computer**, set `WYRMFORGE_COLLECTOR_ADMIN_TOKEN` as an environment variable (do not paste it in command arguments or committed files), then run:

```bash
python3 tools/playtesting/collector_admin.py --url https://<your-worker-host> --dashboard playtest-reports/dashboard.html
```

This writes a local, offline HTML dashboard showing report count, mean enjoyment/clarity, replay intent and most problematic areas. To obtain restricted individual JSON records (including optional free-text comments and reproduction seeds):

```bash
python3 tools/playtesting/collector_admin.py --url https://<your-worker-host> --export-dir playtest-reports/raw/
```

The `playtest-reports/` folder is gitignored. Never publish the dashboard or raw reports. The JSON admin endpoints require a private bearer token; they are not linked from the public game, return no CORS permission, and support deleting a specific report:

```bash
curl -X DELETE -H "Authorization: Bearer $WYRMFORGE_COLLECTOR_ADMIN_TOKEN" https://<your-worker-host>/v1/admin/reports/<report-id>
```

## Intake contract

- `OPTIONS /v1/reports` — preflight from the exact configured game origin.
- `POST /v1/reports` — body `{ "consent": true, "report": { ...v1 report... } }`, max 32 KiB, max 12 recent runs.
- Accepted: HTTP 202 with `{ "accepted": true, "id": "report-id", "duplicate": false }`.
- Rejected: 400 malformed/not consented, 403 origin mismatch, 413 too large, 415 wrong content type, 429 throttled, 503 unconfigured/down.
- `GET /health` — public operational readiness only (does not verify D1 secrets).
- `GET /v1/admin/summary`, `GET /v1/admin/reports?limit=50`, `DELETE /v1/admin/reports/:id` — Bearer secret, never public CORS.

The Worker deliberately rejects unknown fields rather than storing arbitrary user payloads. Hourly rate-limit keys use HMAC on transient IP values; only the digest is stored briefly. **Requests can still be abusive or spoof Origin outside a browser**; keep the collector under observation and add Cloudflare Turnstile/WAF when traffic requires it.

## Operational safeguards

- Retention: Worker cron daily, reports older than 30 days deleted, expired HMAC rate buckets cleaned.
- Availability: losing D1 or the rate key causes submission failures, not false success. The game retains Share / Download JSON fallback.
- Idempotency: each report uses a random report ID and duplicates do not create extra rows.
- Rotation: rotate Cloudflare deployment token and the two Worker secrets independently. Treat leaked administrator tokens as incidents.
- Privacy: report fields are non-identifying by design, but comments might include personally identifiable details; limit access, export only to trusted machines, and honor deletion requests that include the report ID.
- Native iOS/Android: reuse the schema and authenticated owner service; implement explicit mobile-specific consent and sharing in platform adapters, not direct database credentials.
