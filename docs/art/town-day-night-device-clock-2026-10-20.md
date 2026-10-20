# Town day/night lighting — device-local clock (2026-10-20)

**Independent feature branch:** `feat/town-day-night-auto-clock`

## Behavior
- Settings -> Town lighting: **Auto, Day, Night**. Default **Auto**.
- Auto uses `new Date().getHours()` in JavaScript. This is the user's **local device clock** in Safari/Chrome and on iOS WKWebView / Android WebView, without GPS, timezone permission, or an app-specific native bridge.
- **Day:** 07:00–18:59, **Night:** 19:00–06:59 in the device's local time. No location/weather-dependent solar calculations in this milestone.
- On every return to the town, when reopening a hidden tab, and at most one minute after a boundary while open, re-evaluate Auto. Day and Night force that look regardless of the clock.
- The selection persists in `localStorage['wyrmforge.townLighting.v1']`. A denied-storage/privacy mode falls back safely to Auto.
- The controller updates **only image sources** within the existing single-scene panorama. It does not remount the scene, move the camera, reroute a building, or modify gameplay progress/unlocks.
- Unlike the earlier Photoshop-style per-building standalone concept cards, both base images depict one continuous town from the same camera. Night uses existing `night-active.webp`; day uses newly archived `day-active.webp` from the owner-approved daytime overview.
- Day-specific vacancy layers use soft authored WebP alpha corrections for extinguished windows/arcane effects so a vacant building doesn't paste a night rectangle onto day. They share the same pixel-aligned bounds as the existing night PNGs.

## Concurrent development boundary

**Do not overwrite `CanonicalTownView.razor` or progression handlers from the other session.** That session is rewiring temporary vacancy toggles into actual unlock-driven gameplay. This change limits edits to the dedicated town-time JS, isolated settings component, one-line host integration and boot-script import, art, docs and tests. The light controller operates on the existing panorama base image and `refuge-town-vacant-layer` contracts, regardless of who determines when those layers exist.

If the other session renames those CSS selectors or rewrites the town renderer, update the controller selectors during rebase with visual acceptance before merge.

## Validation
- Node tests: auto/day/night edge hours, local storage persistence, independence from gameplay keys, day/night/auto image switching, and daytime vacancy mapping.
- Browser smoke: Settings -> Day -> town -> Night -> town -> Auto -> town, decoding and validating the daylight panorama and verifying each building's underlying state remains unchanged.
- Visual: 390px mobile West/Gate/East with both lighting modes and at least one vacant building. Ensure player labels and camera don't jump during the switch.
- Source: daytime approved `1672x941` original and per-building derived alpha layers archived under `user_handover_files/concepts/town/day`, byte-identical copies deployed under `wwwroot/art/town`.
- Do **not** merge on this branch until the concurrent gameplay PR is accounted for and green browser validation confirms no regressions. No pixel-coordinate overlays of the wrong image type.

## Next enhancement (not included)
Actual sunset/sunrise times based on location (requires consent to use location or a user-chosen city) and gradual dawn/dusk transitions. Current fixed-hour cycle is predictable and privacy-preserving.
