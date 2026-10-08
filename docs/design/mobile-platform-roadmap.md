# WyrmForge — iOS and Android release roadmap

**Explicit product goal:** ship WyrmForge on **iOS (App Store)** and **Android (Google Play)** after evidence-backed browser gameplay has stabilized. This is not merely a responsive web page goal.

## Architectural invariants

- The deterministic .NET 10 **Domain + Application simulation** remains platform-independent. No gameplay logic moves into the browser, mobile shell or a second engine.
- Platform adapters own storage, input, graphics, audio, sharing, crash reports and permissions. They do not modify progression rules.
- Keep save schemas versioned and provide migrations. Today's localStorage player saves must not silently disappear when moving to native storage.
- Do not put secrets or privileged analytics credentials in a native bundle or public JavaScript.
- Touch controls, safe areas, portrait/landscape, back navigation, pause/resume and reduced motion are first-class design constraints.

## Planned delivery gates

| Stage | What must be true |
| --- | --- |
| 1. Browser beta / 0.0.80 | External sessions, simple report sharing, action-oriented feedback, mobile web baselines |
| 2. Playtest fixes | Unassisted first-run clarity, engaging combat, reliable performance, readable long-term goals |
| 3. Mobile architecture proof | Compare .NET MAUI Blazor Hybrid/native shell or another supported packaging route against pure-web rendering on actual iPhone/Android hardware; select only after measuring input latency, frame pacing, startup, battery and store compatibility |
| 4. Platform abstraction | Interfaces for save persistence, diagnostics consent, native share sheet, audio/haptics, lifecycle and updates |
| 5. Native alpha | Installable development builds on iOS and Android, reliable offline launch, progress migration, device matrix and crash capture |
| 6. Store release | App Store / Play policy, privacy disclosures, signing, ratings, screenshots, accessibility, QA, support and release workflows |

## Porting decision

The current presentation uses Blazor WebAssembly and a canvas-based JavaScript renderer. A WebView-based mobile shell could preserve that investment, but this is **only a candidate**, not a decision to ship a wrapper. Test hardware before committing: a native rendering layer might become necessary for consistently satisfying control and frame-time targets. Keep Build Evolution, Great Hunt, Ascendants and Elder Wyrms independent of that UI decision.

## Data continuity

Playtest evidence now uses a versioned JSON schema and explicit export/sharing. Future analytics intake and native diagnostics should reuse its **meaningful events**, not browser-specific global functions. An iOS/Android release must have its own privacy choices and report-sharing affordances, and should never require a GitHub account.
