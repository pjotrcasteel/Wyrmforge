# Controlled walking reference

This replaces independent generated poses as the basis for the next movement experiment. It reconstructs one captured skeleton, fits a periodic version, and applies leg IK during estimated support phases. The same joint data supplies fixed side, front and elevated game cameras. It is a neutral motion study, not a mage asset or a finished game animation.

## Open the study

Serve this directory over HTTP and open `index.html`. The viewer supports original/cleaned motion selection, pause, phase scrubbing, multiple cameras, moving-world/in-place comparison, and optional support estimates. `walk-reference-preview.gif` shows the cleaned in-place side/game-camera study. World travel is inspected in the viewer; its grid continues across cycles instead of snapping back at each loop.

The selected stride has 32 frames at 30 fps, preserving a 1.0667-second duration: approximately 112.5 steps/minute. It comes from native 120 Hz frames 169–296 of CMU subject 07, trial 01. No image-generation model supplies the animation frames.

Blue and rust indicate persistent left/right limb identities. The plain body is an analytical rendering built from the reconstructed 3D joints. It is deliberately not a substitute for the approved mage artwork.

## Construction and reproducibility

1. `source/07.asf` defines bone lengths, rotation bases, degrees of freedom and hierarchy; `source/07_01.amc` supplies the captured channels.
2. `import_cmu.py` reconstructs the hierarchy using column-vector transforms, including each bone's axis-basis conversion. The input-specific root convention is checked rather than silently generalized.
3. Source units are converted using the ASF length setting, 0.45 source units per inch. Coordinates are rotated into a fixed travel-aligned basis and translated to a shared ground reference.
4. A stride candidate is selected using root-relative pose and velocity similarity. The original motion is not crossfaded or independently redrawn.
5. `motion.json` contains the sampled joint data; `render.mjs` supplies the common renderer used by the browser viewer and the preview exporter.
6. `clean_motion.py` fits five harmonics to the captured channels, including a separate linear root-travel component. This creates periodic motion deliberately instead of concealing the seam with an image crossfade.
7. Estimated support windows drive horizontal toe anchors. A two-bone leg solve preserves thigh/shin lengths. A bounded shared body-height adjustment (maximum 4.72 cm in this study) accommodates reachable ankle targets rather than stretching the legs. Correction ramps cover two neighboring frames. Floor clipping keeps the foot/toe endpoints at or above the reference plane while allowing vertical foot roll.

Run `python import_cmu.py` and then `python clean_motion.py` with NumPy and SciPy installed. Run `node render_preview.mjs /path/to/scratch-frames` with `@napi-rs/canvas` installed to reproduce cleaned PNG preview frames; pass `motion.json` as an additional argument to render the original reconstruction. Encode at 30 fps with FFmpeg to preserve the source stride duration. Dependencies are tooling for this art study; the game runtime is not changed.

## What was checked

- Every frame preserves reconstructed bone lengths within 1e-8 metres; measured maximum error is about 1e-15 metres.
- A root-translation perturbation moves all reconstructed joints equally within the same tolerance.
- Source frame numbering and channel counts are checked.
- The 32-frame preview is rendered from the actual joint data, including both game and side cameras. Frame timing is independent of sprite-sheet cell count.
- `validation.json` records boundary mismatch, heuristic toe-contact measurements, source units, sampling and caveats. It can be regenerated.
- `cleanup-validation.json` records periodic-fit closure, preserved limb lengths, endpoint floor bounds, and near-zero horizontal toe speed inside the inferred support windows. This does not claim zero sliding outside those windows or ground-truth contact detection.
- Exported JSON is rounded to six decimals and checked independently for bone-length error below 5 micrometres and interior-support horizontal drift below 0.1 mm/s.
- Viewer logic and native-canvas drawing were exercised at widths 960 and 342, including source/cleaned switching, all camera modes, phase 1, and travel/contact toggles. This was a canvas-adapter check, not a browser-layout test.

These checks do not prove realistic balance, correct floor reaction forces or production readiness. Length invariance also does not by itself prove that a motion-file rotation convention was interpreted correctly; the render has been visually reviewed against the captured-motion reference.

## Remaining issues

The original reconstruction has approximately 18 mm RMS error per coordinate, or 32 mm RMS 3D joint distance at the selected boundary. It remains available for comparison. The periodic channel fit closes to numerical precision before export, and the support correction is cyclic. The sampled cleaned loop and correction ramps still need visual review. Horizontal cycle displacement is exported separately; vertical displacement is not accumulated between cycles.

The original capture indicator uses a 6 cm near-floor threshold and a 0.35 m/s speed threshold. Its candidate-contact median toe speeds are approximately 0.12 and 0.15 m/s, and source toe positions can dip about 1 cm below the chosen plane. Cleanup infers windows from the periodic fit using 5.5 cm and 0.55 m/s thresholds, then locks horizontal toe motion only during those windows. These thresholds are animation-study choices, not biological rules or measured contact truth. Vertical toe motion remains where foot roll and floor fitting require it. CMU notes that early subjects can be lower quality and toe/hand channels can be noisy.

The maximum joint correction from the periodic fit is about 8.63 cm. This is kinematic animation cleanup, not a dynamics or physical balance simulation. Next work is to review the cleaned body motion, retarget it to a consistent mage body, establish the staff grip, then add clothing and render sprites. Do not independently regenerate each rendered frame with an image model. Compare silhouette, stride distance, support and loop continuity before making additional directions.

## Data credit and terms

The data used in this project was obtained from mocap.cs.cmu.edu.
The database was created with funding from NSF EIA-0196217.

CMU's [dataset home page](http://mocap.cs.cmu.edu/) permits use of the data, including in commercial products, while prohibiting resale of the data itself. These source files are retained solely for reproducibility and attribution as part of this motion study. See [subject 07](http://mocap.cs.cmu.edu/search.php?subjectnumber=7) and the [trial 07_01 preview](http://mocap.cs.cmu.edu/subjects/07/07_01.avi).

Format references: [Acclaim ASF/AMC explanation, University of Wisconsin](https://research.cs.wisc.edu/graphics/Courses/cs-838-1999/Jeff/ASF-AMC.html) and [CMU-hosted Acclaim format details](https://graphics.cs.cmu.edu/nsp/course/cs229/info/ACCLAIMdef.html). The importer implements the conventions required by this source; it is not a general-purpose ASF/AMC library.
