# Quest 3 baseline and invisible-overlay DoS

This package replaces the earlier demonstration with matched scenes and scheduled application-pointer input. It demonstrates denial of an application interaction through a transparent foreground mesh. It does not claim a Quest OS/browser exploit, resource-exhaustion attack, or complete reproduction of the paper's threat model.

## Files and deployment

- `index.html`: baseline, transparent shield excluded from hit testing.
- `dos.html`: same scene, transparent shield included in hit testing.
- `app.js`: shared experiment and logging logic.

Put these files together in the directory served by GitHub Pages. Open the HTTPS URL in Quest Browser. A-Frame 1.8.0 is loaded from aframe.io, so internet access is needed. There is no build step. The old BST page is intentionally not included.

For a desktop functional check, serve the directory with `python -m http.server 8000`, visit http://localhost:8000/index.html and click Start desktop test. Desktop tests are explicitly labeled in the exports. They cannot establish Quest GPU behavior.

## Headset procedure

1. Open baseline on Quest Browser. Enable your MQDH hardware recording, with casting disabled and consistent profiler settings.
2. Enter VR. A run starts automatically: 15 seconds of warmup, followed by 60 seconds of measurement.
3. Look toward the target and keep head position/orientation as consistent as possible. Do not press controller buttons. This implementation fixes the input pointer, not the headset camera.
4. Twelve input attempts occur at measurement offsets 0, 5, 10, ... 55 seconds. The measurement ends at 60 seconds. The in-scene phase changes to FINISHED.
5. Exit VR. The browser panel should report `completed: 12 attempts; target 12; blocked 0; failures 0` for baseline.
6. Export CSV and JSON BEFORE navigating away. Events are held in memory and are not uploaded or persisted across page reloads.
7. Open dos.html and repeat. Expect `completed: 12 attempts; target 0; blocked 12; failures 0`.
8. Repeat runs in randomized/interleaved order. Save device, browser, OS, MQDH version and capture settings alongside the exports. Reject runs marked invalid or aborted.

If a run finishes with unexpected receivers, do not treat it as data. Save its JSON for debugging. If the frame scheduler is more than 250 ms late, the trial terminates with `invalid_timing` rather than generating catch-up clicks. Exiting VR or hiding the document aborts an active run. Re-entering VR begins a new run without deleting prior in-page logs.

## Input path and attack

The pointer origin is world XYZ (0, 1.5, 0) and direction is (0, 0, -1), aiming at the target. A static ring marks that ray near the target; a static label displays its coordinates.

Each attempt refreshes the actual A-Frame mesh raycast, then emits the cursor's configured down/up events. A-Frame delivers the resulting click to its nearest intersection. The experiment never directly calls the target success handler. Baseline includes only the target in `.interactive`; DoS also includes the nearer shield. The target handler remains installed in both modes. The result log records the actual click receiver, independently of the expected receiver.

This is synthetic input at the A-Frame application layer, not a physical-controller replay, native trusted WebXR input, or IWER integration. It isolates application hit testing and event delivery. Both conditions use the same path; hardware input is excluded from experiment results.

## Why both pages contain the shield

Both pages contain the same plane with transparent material, zero opacity, and depthWrite disabled. Only its participation in hit testing differs. This creates a benign overlay control with matching scene content. The engine/GPU may optimize zero-opacity rendering, so its exact cost must be measured rather than assumed.

No object color flashes, changing counters, per-click text, or console output occur during the measurement. The blue target looks the same even when activated; activation is verified by exported click-receiver records. This prevents success feedback from becoming a fragment-workload confound. The phase label changes once at the start/end; exclude transition windows if analyzing steady state.

A successful DoS may produce little or no GPU-counter separation. That is a valid finding for this controlled implementation. Distinguishing two scenes is not by itself attack detection.

## Logs and synchronization

CSV includes the union of all event fields (nothing silently discarded); JSON includes the same events plus latest-run configuration. Each event has a run ID, condition, environment, ISO timestamp, epoch estimate, and monotonic timestamp. Attempt records include schedule lateness, intended target, nearest hit, pointer pose and headset pose. Results record actual click receivers. Run endings summarize attempts, successes, blocks and failures.

Hardware counters come from MQDH/OVR separately. These CSV files are interaction logs, NOT GPU measurements. Use `measurement_start` and `run_end` to identify the intended window. Browser epoch timestamps do not automatically synchronize with a separate MQDH clock: establish the offset/time basis using your actual exporter. Pose is sampled per attempt, not continuously.

## Verification status

JavaScript syntax and automated scheduler checks passed: warmup/duration, twelve scheduled attempts, late-timer rejection, abort behavior, invalid-run handling, and identical HTML apart from mode. A-Frame 1.8.0 cursor/raycaster source was inspected for the input path.

Browser rendering and actual A-Frame event delivery were NOT successfully exercised in the authoring environment: its browser could not reach the local preview server, and direct dependency fetching was unavailable. Physical Quest validation is also outstanding. The expected counts above are acceptance criteria, not claimed observed hardware results.
