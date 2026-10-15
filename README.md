# Quest 3 WebXR Lab (A-Frame 1.8.0)

Files: `index.html` baseline, `dos.html` user-input-denial demonstration, `bst.html` blind-spot tracking concept demonstration, `app.js` shared JavaScript.

## Running
Host all files together on an HTTPS static site such as GitHub Pages. Open `/index.html` in the Meta Quest Browser, press **Enter VR**, and gaze at the target for 1.2 seconds. Navigate directly to `/dos.html` and `/bst.html` to test the other modes. The text navigation at the top is for 2D browser mode. It is not a VR menu.

For desktop smoke-testing, from this directory run `python -m http.server 8000`, then visit `http://localhost:8000/`. Immersive WebXR on Quest requires a secure context (HTTPS).

## Mode semantics
- Baseline: gaze-click activates blue target.
- DoS: an explicitly visible overlay in front of the target intercepts gaze clicks, demonstrating the geometry of user-input denial; this does **not** exploit a browser vulnerability.
- BST: gazing at the orange FRONT box records a **simulated** attribution event referring to a labeled REAR item. This does **not** perform advertising clicks, hidden tracking, third-party requests, or reproduce the full paper's exploit.

Click **Export CSV events** in 2D browser view to download local logs; data stays on device. Quest Browser download support may vary. Use browser developer console for logs if necessary. External dependency: A-Frame 1.8.0 loads from aframe.io.

## MQDH
Collect FPS/GPU/CPU metrics separately through MQDH during each mode. The app's CSV logs contain *interaction events only*, not Quest hardware metrics.

## References
- Cheng et al., USENIX Security 2024: https://www.usenix.org/conference/usenixsecurity24/presentation/cheng-kaiming
- Lee et al., USENIX Security 2021: https://www.usenix.org/conference/usenixsecurity21/presentation/lee-hyunjoo
