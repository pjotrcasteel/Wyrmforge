# Play the WyrmForge PR build before merging

This is an **unmerged draft preview** generated only after the browser test suite passes. It does not change the public site, your production save, or the Pages deployment. Use it to feel mage animation, magic lighting, first-hunt readability and navigation on an actual device.

## Download
1. Open the **Browser smoke** GitHub Actions run associated with PR #107 and its latest commit.
2. At the bottom of the run, under **Artifacts**, download the `wyrmforge-playable-preview-<commit>` artifact (GitHub sign-in may be required).
3. Extract it. You should see `wwwroot/`, `preview_server.py`, and this `README.md`.

## Start on your computer
Open a terminal in that extracted folder (with Python 3 installed):

```bash
python3 preview_server.py --directory wwwroot --port 4173 --host 0.0.0.0
```

On Windows the equivalent is often `py preview_server.py --directory wwwroot --port 4173 --host 0.0.0.0`.

**Computer:** visit `http://localhost:4173/`.

**iPhone:** connect to the same trusted home Wi-Fi as your computer, find the computer's local IPv4 address, and visit `http://YOUR-COMPUTER-IP:4173/` in Safari. Windows Firewall or another local firewall may request permission; permit private networks only. Disconnect the server with Ctrl+C afterward. Never expose port 4173 to the public Internet or port-forward your router for a preview.

The app's local save may be separate because the preview runs at a different web origin. Avoid judging long-term persistence or backend feedback collection from the private preview; its collector may not support the local HTTP origin.

## What to test on your phone
- Slate-blue mage and pale collar remain visible against wet dark terrain.
- Each real cast has a distinct wind-up, release and follow-through. Fourth focused cast uses a more forceful Surge frame.
- Staff tip and local masonry respond to Fire/Frost/Storm/Arcane lighting, while enemies and mage stay legible.
- Movement and aiming still feel responsive when spells fire in groups. No new moving HUD buttons.
- Clipped/off-screen effects should not cause frame drops; actual gameplay damage and spell selection are unchanged.

**This is a local, private playable preview—not a hosted public preview URL.** The public `https://pjotrcasteel.github.io/Wyrmforge/` remains on its previously deployed `main` until a separate merge/deployment decision.
