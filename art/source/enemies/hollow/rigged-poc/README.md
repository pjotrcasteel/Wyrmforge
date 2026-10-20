> Current exports, 20 October 2026: **8×16 walk, 8×16 attack, and 8×24 death frames**,
> rendered from one UV-textured, weighted 3D rig on the local RTX 5090.
> [Movement](exports/movement-eight-directions-v1/README.md) · [Attack and lifecycle preview](exports/attack-eight-directions-v2/README.md) · [Death](exports/death-eight-directions-v4/README.md).
> Owner accepted movement, attack and death and authorized integration and release.
> The runtime adapter is implemented and locally validated; see
> [runtime integration and release evidence](../../../../../docs/art/hollow-runtime-integration-2026-10-20.md).
>
> The text below records the earlier hosted-service attempt, not current status.
# The Hollow: rigged-source proof status

20 October 2026. **Blocked at model reconstruction; no mesh, rig or walk exists.**
This draft follows `docs/art/card-to-spritesheet-production.md` and deliberately
does not promote a static image or a passing render test into a finished animation.

## Preserved work

- `design-brief.md`: original-card identity invariants and one-view gait brief.
- `production.json`: card checksum, stage status and explicit TRELLIS.2 approval.
- `references/hollow-neutral-reference.png`: full-resolution transparent neutral
  modeling input, created with the approved card as reference and self-reviewed.
- `reference-generation.md`: image-generation provenance and prompt requirements.
- `reconstruction-log.json`: exact provider response. No successful mesh output.
- `tools/sprite-lab/hollow-reconstruct.py`: single-attempt public API recipe with
  fixed seed 1729, 1024 reconstruction, 100,000 faces and 2048 texture export.

The neutral image is modeling input, not an animation frame, production-approved
sprite or exact recovery of the original card's hidden geometry.

## Observed blockers

The owner explicitly approved Microsoft TRELLIS.2. The API accepted/preprocessed
the reference, then refused GPU reconstruction with a ZeroGPU quota error. The
exact message is retained in the JSON log; its requested/remaining values are
internally surprising, so do not reinterpret them as proof that quota is available.

Secure Hugging Face browser sign-in was attempted once. Its submission returned
a CloudFront 403 "Request blocked" page. A fresh homepage still showed Log In,
so authenticated browser access was not established. No HF_TOKEN is configured
in this workspace. Do not ask for credentials in chat or retry the blocked login
in a loop. No model generation, extraction or gait review succeeded.

## Local rendering prerequisite verified

An isolated Python 3.11 environment with `bpy==4.5.3` successfully rendered a
64x64 CPU Cycles test with real RGBA transparency. This was a render-engine smoke
test using a sphere, not a character proof. The sphere is not a delivered asset.

Recreate the environments using uv (or equivalent isolated Python environments):

```sh
uv python install 3.11
uv venv --python 3.11 .venv-hollow-blender
uv pip install --python .venv-hollow-blender/bin/python bpy==4.5.3

uv venv --python 3.12 .venv-hollow-reconstruct
uv pip install --python .venv-hollow-reconstruct/bin/python gradio_client==2.7.2
```

Do not commit environments or credentials. `HF_TOKEN`, if configured through a
secure credential mechanism, is supported by the recipe and must never be printed
or written to provenance. The currently saved source does not require a token to
be inspected; GPU generation still needs available service quota.

## Resume at the actual blocked stage

1. Establish permitted working TRELLIS.2 access/quota; do not repeatedly resubmit
   the same refusal. The existing owner approval covers this reference/destination.
2. Run the reconstruction recipe once. Preserve the resulting initial GLB and its
   checksum if successful. Do not overwrite rejected generations silently.
3. Review the real model's front/side/back and separated limbs. Repair topology
   and design if necessary before binding.
4. Build a deforming rig, inspect the prescribed pose tests, then author one
   three-quarter shamble. Only then render/export a walking sheet and preview.
5. Update this record and the draft PR at each coherent stage. Keep game artwork
   unchanged until the resulting exported motion has been accepted.

The next useful artifact is an inspected textured model, not another independently
generated walking image grid. Runtime integration remains false.
