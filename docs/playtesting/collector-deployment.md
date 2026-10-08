# WyrmForge — central playtest collector (0.0.81)

## Status and security boundary

The **implementation is included in the repository**. The online collector only becomes available after the Cloudflare account/database/secrets and public endpoint have been provisioned. GitHub Pages itself remains a read-only host; do not place a private token in the web project.

The Cloudflare Worker accepts *only actively submitted, explicitly consented* reports. There is no passive telemetry upload. It validates and allowlists fields, uses D1 storage, HMAC IP-based rate limiting (no raw IP persisted), private Bearer-token administrator endpoints and 30-day scheduled deletion.

**Important:** Like any web server, Cloudflare infrastructure can have operational logs. No guarantee of absolute anonymity can be made. Free text may contain identifying information volunteered by a tester; tell testers not to include personal details.

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
8. In GitHub repository Settings → Secrets and variables → Actions → Variables, set `WYRMFORGE_FEEDBACK_ENDPOINT` to the **public** full HTTPS URL such as `https://<your-worker-host>/v1/reports`. This is a public endpoint, not a credential.
9. Run **Actions → Deploy Wyrmforge demo → Run workflow** to publish the endpoint in the versioned public JSON configuration. Check the game: **Send feedback privately** becomes visible in the playtest dialog. It is disabled until a tester checks the consent box.
10. Submit a synthetic test report and confirm its receipt using the owner tool below. Only then invite the external cohort.

No Cloudflare credentials, D1 database, or account were created simply by merging the code. The game falls back to the existing Share / Download JSON flow whenever the collector is not configured.

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
