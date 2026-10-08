# WyrmForge — Community playtest, round one (0.0.80)

## What are we testing?

This is the **first external-player usability and fun gate**. Put new Ascendants and features on hold until we have evidence from players who did not build the game. We need to learn whether someone can start, move, choose a route, understand rewards, enjoy a fight and want another run. The Great Hunt remains a long-term goal but **the first 10 minutes matter more than endgame mastery** for this cohort.

## Recruitment and sessions

Invite **10–15 independent testers**, including at least 5 who have never seen WyrmForge. Aim for iPhones/Safari, Android/Chrome and desktop/laptop browsers (record only coarse touch/pointer context). Ask for **15–20 minutes** and at least two runs if they want to play again. Do not explain the UI unless they are genuinely blocked. Encourage a screenshot or a short description of trouble, never real-world personal information.

**Copyable invitation:**

> We're playtesting WyrmForge, an early action roguelite you can play in your browser. Could you try it for 15 minutes without instructions and tell me where it's fun, confusing or frustrating? https://pjotrcasteel.github.io/Wyrmforge/ — At any point, tap **Tell us how your hunt felt** (or **Send playtest feedback** after a run). Tap **Tell us how your hunt felt** (or **Send playtest feedback** after a run), answer the quick questions, tick the consent box and choose **Send feedback privately**. That securely submits your report to WyrmForge; Share / Download JSON is an alternative. No account required, and nothing is sent without your choice.

## What gets recorded

The browser locally tracks: run starts, interrupted restarts, selected trail/Wyrm gates, Refuge/descend/extraction, last twelve run summaries, seed, outcome, build evolutions, depth, score, kills, secured Essence and lightweight sampled frame/bridge timing.

The report includes an optional anonymous questionnaire (1–5 enjoyment/clarity, replay intent, most problematic area, best moment, improvement). The tester can **uncheck Include my recent runs** before sharing. No raw clickstream, position history, full user-agent, name, email address or IP address is included in a report. The browser host can have its own access logs; the report collection itself is local-only until the tester shares it. No automatic transfer is enabled.

Direct private submission to the Cloudflare D1 collector is live and requires an explicit consent checkbox; the game confirms receipt only after an accepted API response. Manual sharing is optional: the phone share sheet or downloaded JSON still works. No personal report or free-text comment may be published to GitHub.

## Organizing the results

1. Create a private local `playtest-reports/` folder (already gitignored).
2. Save the files that people explicitly send to you. Use the report's run seed to reproduce a problem; don't ask for contact details inside the report.
3. Generate the overview: `python3 tools/playtesting/analyze.py playtest-reports/ > playtest-round-1-summary.md`.
4. Review free-text feedback privately and group the recurring themes into **blockers**, **friction**, **fun**, and **feature requests**.
5. Decide on the next changes based on recurrence, impact and reproduction. Keep raw reports private and delete them once they are no longer needed.

## Practical gates

These are **targets**, not claims about results:

| Question | First-pass target |
| --- | --- |
| Can players reach their first trail unaided? | At least 80% of observed first-time testers |
| Is the goal of the run understood? | Median clarity at least 4/5 |
| Is basic combat appealing? | Median enjoyment at least 4/5 |
| Would players willingly play another run? | At least 60% answer "yes" |
| Are movement/choice/Forge interactions blocked on a phone? | No reproducible severe blocker |
| Are crashes, startup failures or device-specific slowdowns reported? | None remaining unexplained |

Collect observations in a brief moderated session when practical; **offline reports alone cannot measure true page exits or silent drop-offs**.

## Central collection and automated insights (0.0.81+)

The consent-only HTTPS collector is live. Testers explicitly tick a consent box and press **Send feedback privately**; there are no passive background uploads. Cloudflare stores report submissions privately for up to 30 days, with no raw identifiers or comments added to the public GitHub repository.

A daily GitHub Actions workflow uses only aggregate SQL queries against Cloudflare D1. The anonymized summary is published to the separate public `playtest-insights` branch **only after at least 10 voluntary reports** and only lists issue categories selected by at least 3 submissions. A small sample remains withheld, and raw comments/seeds remain restricted to the Cloudflare administrator dashboard. The acknowledged synthetic integration test is deleted/excluded automatically.

Read [insights automation](insights-automation.md). The public aggregate cannot support individual defect reproduction or free-text analysis; those still require restricted owner access.

## Next decision

Fix onboarding, control, balance and performance problems before adding Stormcoil/Rimeclaw/Voidweaver Ascendants. Use new builds and separate cohorts for follow-up measurements. Elder Wyrms and further Build Evolution remain planned. See [mobile release roadmap](../design/mobile-platform-roadmap.md).
