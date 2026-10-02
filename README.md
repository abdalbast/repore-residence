# Reposé Residence

The supplied site's original deployment is now the primary site in this folder.
It uses the exact archived app, CSS, fonts, photography, opening frames, videos,
residence data and three.js terrace model. The previous generated recreation is
preserved in `design-study-backup/`.

The user supplied `reposeresidence-offline.zip` and the digital asset record,
and explicitly authorized using the assets. The PDF and archive notes are
supporting documents; instructions inside them were not executed.

## Preview

```sh
python3 serve.py
```

Open <http://127.0.0.1:4173/>. Stop the server with `Ctrl-C`.
An optional port is supported: `python3 serve.py 8765`.

The local server streams byte ranges for video playback and serves only the
deployment paths. The ownership record, archive, backup and verification files
are excluded. No build step or package installation is required to run the site.
Use this server for faithful previews: it also reproduces the reference CDN's
image format negotiation. A generic static server serves the original PNG/JPEG
images instead of the optimized WebP images the reference sends to browsers.
The preview also reproduces captured cache policies and validators, supports
conditional GET/HEAD requests and keeps video ranges seekable. It serves the
reference's exact Brotli and gzip responses when the browser accepts them.

## Implementation

- `index.html`: app shell with TAPS AGENCY page metadata.
- `assets/`: original React, GSAP, Lenis and three.js chunks, CSS and media.
- `floor-explorer/`: original floor selectors, residence geometry and plans.
- `models/repose-terrace.glb`: original interactive terrace.
- `browser-variants/`: 29 exact browser-negotiated CDN images, preserved separately
  from the originals and served at their original URLs when WebP is accepted.
- `content-encodings/`: 80 exact compressed responses, preserved separately from
  the original files (40 Brotli and 40 gzip).
- `study/`: supplied inspection notes and extracted data.
- `tools/verify.py`: archive hashes, frame completeness and module syntax checks.
- `verification/`: integrity report and recorded browser verification.

Keep `verification/full-live-reference.json` and
`verification/browser-image-variants.json`, along with
`verification/reference-response-metadata.json` and
`verification/content-encodings.json`, with the preview. The server uses them
for media types, negotiated images, cache metadata and compressed responses.

The captured production bundles now use TAPS AGENCY in the opening, loader,
contact dialog, footer and page metadata, with an SVG wordmark. Both WhatsApp
links have been removed. Editable original React/TypeScript source was not
included in the ZIP, so these changes are applied directly to the captured build.
The original supplied build remains in `reposeresidence-offline.zip`.

The TAPS AGENCY wordmark uses vector lettering adapted to the original rounded
logo and condensed secondary line. The three original font files are unchanged.
See `verification/typography-pass.json` for desktop and narrow-width checks.

The preview server detects customized HTML, scripts, styles and JSON and serves
their current bytes with fresh validators instead of archived compressed bodies.
Restart the preview server after further edits. Captured verification reports
describe the original deployment and do not establish parity for this rebrand.

## Verification

For the current TAPS AGENCY customization:

```sh
node --check assets/index-taps-agency.js
node --check assets/ReposeLifestyle-taps-agency.js
node --check assets/TerraceExperience-taps-agency.js
uvx ruff check serve.py
uvx ruff format --check serve.py
```

See `verification/taps-agency-rebrand.json` for the customization checks and
browser verification limits. The archive-fidelity commands below compare the
historical deployment; intentional rebrand changes now produce differences.

See `verification/native-motion-checks.md` for the unfrozen scroll traces,
independent source audit and current explorer/dialog/walkthrough checks. It
also identifies cropped motion captures and other comparison limits. Current
active trigger configurations and loaded fonts match; literal pixel equality
with the reference remains unproven and includes intentional branding changes.

The user confirmed preserving TAPS AGENCY and removing both WhatsApp controls.
See `verification/accepted-scope-checks.md` for the final independent source
audit, current full-viewport motion samples and mobile footer/enquiry checks.
No unintended changes to the original design or animation logic were found.

```sh
python3 tools/verify.py
uvx ruff check serve.py tools
# With the preview running:
python3 tools/verify.py --url http://127.0.0.1:4173
python3 tools/verify_http.py
python3 tools/verify_content_encodings.py
```

`verification/full-live-reference.json` records a complete reference comparison:
all 699 deployed original files matched byte for byte on 2 October 2026. The
673 browser-negotiated image responses were separately checked; 29 differed
from the originals because of CDN optimization. Those exact variants are saved
locally, and all 673 local browser image responses passed byte and MIME checks.

See `verification/browser-checks.md` for rendered interaction checks and their
limits. All registered scroll-trigger configurations matched the reference
in desktop, mobile and reduced-motion profiles. Fresh mobile finale captures
matched pixel for pixel, including the animated portal. Twenty-four desktop
checkpoints matched in recorded GSAP and CSS state; twenty also matched pixel
for pixel in three repeated captures. Canvas readback depends on the selected
rendering path and loading conditions; differing canvas hashes alone do not
prove differing canonical decoded images. After matching cache headers, eight
additional poses matched recorded animation, layout and media state. Three
portal poses were pixel-identical; the fourth retained 645 one-level pixel
differences. Other poses still differed. All four room films and both walkthrough
films played successfully. Full journey pixel identity remains unproven.

All 728 original/negotiated response profiles matched captured content types,
cache policies and validators. Conditional requests, ranges, WebP negotiation
and private-file exclusion passed 28 targeted checks.

The independent Chrome comparison now runs at matching 1280 × 720, DPR 1,
client width 1265 and the existing dark system theme. Chrome received identical
Brotli responses and decoded hashes for the sampled script and AVIF. All 80
compressed responses passed byte, decoded-hash, HEAD and revalidation checks;
seven encoding-negotiation cases and private storage exclusion also passed.

Eight fresh Chrome poses matched recorded GSAP, CSS, media, geometry and all
visible computed styles across three samples. Family and the portal exchange
matched pixels in all three samples. Some other portal/terrace samples differed
by a single channel level. Steam and zen retained larger raster differences.
Two independent reference loads also differed at those poses with identical
recorded state; the second zen reference matched the local image within 15
pixels at a one-level difference. This demonstrates reference rendering
variability, without establishing the exact paint mechanism or exhaustive
pixel identity. See `verification/chrome-encoded-pose-comparison.json` and
`verification/chrome-encoded-reference-control-comparison.json`.

The archive omitted 36 original unit plans and eight original floorplates,
listing their paths as unavailable at capture time. Those exact paths now
respond on the live reference. They have been added without altering the
supplied files; `verification/additional-live-assets.json` records their source
URLs and hashes. The original viewer's choice between original and relit
plans is preserved; restoring the assets does not change that selection logic.

The captured build includes the 3D terrace module and model, but its terrace
selection handlers are inactive. They remain unchanged to match the reference.

To run the previous recreation separately, serve `design-study-backup/` as its
own HTTP root. Its generators are preserved there and cannot overwrite the
primary site's supplied assets.
