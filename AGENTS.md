# Working on Wyrmforge

Start at [docs/canon/README.md](docs/canon/README.md). Read only the relevant canonical topic documents before changing gameplay, art, audio, UI or platform behavior. They are the sole intended-design authority; README release entries, dated handovers, RFCs and playtest notes are evidence, not competing specifications. Check current main and open PRs; preserve work from concurrent sessions. Check current main and open PRs; preserve work from concurrent sessions.

## Git checkpoints

The owner explicitly requires frequent remote checkpoints after repeated loss of unpublished work.

- Commit and push each coherent slice to a task branch before starting another slice.
- Push a checkpoint before long visual generation, capture, or validation work. A local commit alone is insufficient.
- Keep unfinished work on a clearly described draft PR; merge only validated changes.
- Verify the remote branch head after uploading. Record implementation status, remaining work and evidence in repository documentation.
- Do not describe incomplete art or missing validation as finished. Preserve source assets as well as runtime atlases.
