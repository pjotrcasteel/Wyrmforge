# Material Lab — Fine detail toggle changes no ground pixels (22 October 2026)

## iPhone repro
The owner supplied screenshots of the same Natural ground preview with **Fine detail On** and **Off**. A direct RGB comparison of the ground-only rectangle (x 30–680, y 555–1340 on the uploaded 706×1536 captures) showed **zero different pixels**; only the button state had changed. Therefore the old A/B study did not demonstrate a working detail switch. This is not acceptable as mere "subtlety".

## Root-cause hypothesis and prevention
The Blazor page loaded the JavaScript material renderer from a **non-versioned ES module URL**, while the deployment changed Blazor page assembly and JS together. On browsers with an older cached module, the new interop function could be unavailable even though the new button rendered. We cannot confirm that this was the exact failing path without the owner's iOS browser console, so this remains a *hypothesis*, not a proven diagnosis.

## Fix
- Import a revisioned `arena-materials.js?v=20261022-fine-pixels-1` to avoid earlier module cache identities.
- Bake the requested texture first, then update the live canvas state and return whether it succeeded. The button changes state only on confirmed success, and shows an error if the renderer is not ready / JS interop throws.
- Expose completed canvas render counters and the applied state through canvas `dataset` for integration checks, not cosmetic UI assertions.
- Add a real Playwright portrait browser test: wait for a loaded atlas; sample **every RGBA canvas pixel** into a deterministic checksum; demand On ≠ Off, and switching Off restores the exact original checksum. Capture both canvases to the normal CI browser evidence artifact.
- Keep the approved six textures, their seeded composition, blending and the optional micro-detail painting unchanged until the owner evaluates a **working** A/B comparison.

## Acceptance
1. `node --test tests/javascript/arena-materials.test.mjs` and `dotnet test tests/Wyrmforge.Browser.Tests/Wyrmforge.Browser.Tests.csproj` pass.
2. The iPhone On/Off toggle must change actual grass/mud/marsh visual pixels, and Off must restore the current accepted baseline.
3. Confirm browser smoke, Pages deployment and actual phone visual acceptance. Browser tests are not themselves physical iPhone acceptance.

No arena props, paths, game simulation, collision or material redesign in this fix.
