# Glass particle effect

Standalone Three.js particle-filtering visualization with a refractive panel, animated chromatic edges, dissolving harmful particles, live controls, and JSON configuration export. No React or build step required.

## Status and provenance

This is an independently written reconstruction inspired by the visual behavior discussed during development, not an exact port of Moderation API's shaders. It does not claim affiliation or permission to redistribute their original application. Refraction is simplified RGB texture sampling rather than their six-index model. The shield entry is aligned with the panel width. The demo has not yet been browser-tested; visual parity is not claimed.

## Run locally

Serve this directory with `python3 -m http.server 8000` (or `python -m http.server 8000`) and open http://localhost:8000. Do not open the HTML directly from disk. Internet is needed for pinned Three.js 0.184.0 CDN imports.

## Controls

Use the top-right panel to change count, harmful ratio, colors, speed, size, glass width, refraction, aberration and ripple. Export settings downloads JSON. Changing count or harmful ratio regenerates randomized particles. Pause freezes time. Reduced-motion preference freezes time automatically.

## Embed

Copy effect.js to your site, retain the import map from index.html, create a container with an explicit height, and call:

```js
import { createGlassEffect } from './effect.js';
const effect = await createGlassEffect(document.querySelector('#effect'), {
  controls: false,
  config: { count: 80, refraction: 0.5, aberration: 0.8 }
});
// On removal or SPA route teardown:
// effect.destroy();
```

Use exported JSON as the config object. Keep Three.js and addon versions aligned. For production, consider self-hosting dependencies and adapting the import map to your content security policy. Canvas does not refract arbitrary HTML behind it: it samples only the Three.js scene rendered to its texture.

## GitHub Pages

Pages is not enabled automatically. In repository Settings > Pages select deployment from the main branch, root folder, and save. Alternatively deploy these static files to your existing host.

## Verification checklist

- Confirm there are no console errors and white/red particles move.
- Confirm red particles dissolve on entering the panel, while white ones continue.
- Resize and test at mobile widths and high DPI.
- Test controls and exported JSON.
- Test reduced motion, pause, and destroy/recreate behavior.
- Check GPU load on target devices; lower count and pixel ratio as necessary.

No analytics, API keys, backend, or external account integrations are used.
