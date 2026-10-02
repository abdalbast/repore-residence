# Verification — 2 October 2026

The primary site runs the supplied production build. Its HTML, JavaScript,
CSS and fonts were left unchanged. The previous procedural recreation is
preserved in `design-study-backup/`.

## Resource verification

- All 655 runtime files supplied in the archive match it byte for byte.
- The live HTML shell, seven JS chunks, three CSS chunks and three fonts
  match the archive byte for byte. Both floor-explorer JSON files also matched.
- All 440 opening frames are present, along with the supplied videos and model.
- The archive omitted the original `units-web/` and `floorplates-web/` images.
  Its notes listed these paths as unavailable. All 44 paths now return images
  on the reference; the exact files were added with source URLs and SHA-256
  hashes in `additional-live-assets.json`.
- The resulting deployment contains 699 runtime files. Every original plan
  referenced by the residence data is present.
- `python3 tools/verify.py` passed, including syntax checks for all seven
  JavaScript modules. `uvx ruff check` and `uvx ruff format --check` passed for
  the authored Python files.

## Rendered desktop checks

Local and live pages were compared in the same browser at 1280 × 720, without
changing the theme.

| View or interaction | Observation |
| --- | --- |
| Hero | Original aerial image, typography and logo rendered on both pages. The font collection finished loading. |
| Opening film | Full-viewport frame sequences captured during scroll, including the approach and completed tower. |
| Why Dubai at scroll position 2990 | The saved local and reference JPEGs were pixel-identical. |
| Floor 15 | Opening transitions captured on both pages. Original geometry, labels and floorplate rendered. |
| Residence selection | Keyboard Enter opened the penthouse plan on both pages. The local 2D/3D image toggle worked. |
| Missing-plan regression | The initial local view used a fainter fallback because the original image was absent. After restoration, the local view used the same 4019 × 2541 original plan as the reference. |
| Corrected plan comparison | Visually matched the reference. PNG comparison had a full-frame mean channel difference of about 0.37 on a 0–255 scale; it was not pixel-identical. See `plan-pixel-comparison.json`. |
| Closing transitions | Full-viewport samples captured while returning from the residence to the floor and from the floor to the tower. |
| Reception | Original entrance and reception images appeared during the scroll journey. |
| Room gallery | Living-room film opened and played; other room videos remained paused. Closing returned to the gallery. |
| Chapter panel | All ten chapters loaded. Opening the panel and navigating to the terrace and finale worked. |
| Terrace chapter | Original terrace photography and typography rendered and were visually compared with the live page. |
| Finale | Original portal transition returned to the tower explorer. |
| Scrollbar | Root client width stayed 1265 with a 1280-wide viewport while the floor, residence, room film and chapter panel were open. |
| Runtime | No console errors or warnings were observed in the sampled run. The original-plan 404s found in the first pass were resolved by restoring all 44 missing files. |

Frame sequences include the entire viewport, surrounding artwork, controls,
edges and scrollbar. The sampled opening, floor and residence sequences were
visually inspected; no unexpected blank frame or flash was seen in those samples.
These captures sample roughly six frames per second, rather than every display
frame. They do not prove the absence of every transient rendering defect.

## Mobile and reduced motion

The mobile hero was inspected at a 390 × 844 CSS viewport. The root's scroll
width equalled its client width, and the reduced-motion media query was active.
Browser capture methods produced inconsistent crops while viewport emulation
was changing. A larger diagnostic capture showed the complete mobile hero
within the emulated viewport. A scroll attempt in that emulation did not move
the page, so mobile scrolling and full mobile animation parity are unverified.
The temporary viewport and media overrides were cleared and the test tabs closed.

Resizing during an open residence also left its controls inaccessible during
testing. This was not changed in the supplied production code, and modal resize
recovery is not claimed as passing.

## Scope and limits

The original animation code is preserved, including timing, easing, scroll
gates, camera choreography and video behavior. Frame-by-frame equivalence for
every animation, rapid re-entry, every control and every mobile device was not
established. Small raster differences remained in the corrected plan comparison.

The build contains a three.js terrace chunk and model, but its terrace selection
and hover handlers are inactive. The current reference has the same handlers;
interactive 3D terrace operation is therefore not claimed.

The local server returned valid 206 responses for beginning and suffix MP4
byte ranges, and 416 for a range beyond the end. Requests for the asset record
and the backup returned 404. The development server was stopped after testing.

No contact message, form submission or public deployment was performed.

## Complete reference audit and CDN correction

A subsequent pass compared all 699 original runtime files with the live
reference: 699 matched, covering 155,013,065 bytes. This includes the complete
frame sequences, media, residence data, model and fonts, rather than only the
code bundles. See `full-live-reference.json`.

The reference CDN negotiates 29 PNG/JPEG resources into WebP when the browser
advertises WebP. Comparing the original files alone missed this rendering
difference. The tower illustration was 1,359,489 bytes as its original PNG
but 106,618 bytes as the browser-served WebP. Its decoded pixel hash differed
before correction and matched after correction:
`55bf764f95719a4a993fd366007cb066b76fc4ae257c40138c1a29475b227519`.

All 673 image URLs were audited using the browser's image `Accept` header.
The 29 changed responses were saved under `browser-variants/`; originals remain
unchanged. The preview server now selects these exact files at the original
URLs, sets `Vary: Accept`, and preserves original delivery for clients that
do not accept WebP. A request with `image/webp;q=0` returned the original PNG.
All 673 local image responses matched the reference's bytes and media types.
The reference serves its AVIF files as `text/plain`; that media type is also
reproduced. See `browser-image-variants.json` and `archive-integrity.json`.

The synchronized desktop finale capture became pixel-identical, with zero
changed pixels across 1280 × 720, after the negotiated image was reloaded.
For this diagnostic, CSS animation phases were set to the same time and GSAP
scrub progress was settled on both pages. Normal motion was restored afterward.
This demonstrates the specific CDN image correction; it is not a claim that
every uncontrolled animation capture will be identical.

## Full scroll configuration and responsive journey

The original runtime was inspected through its own GSAP module. Each trigger's
start/end, pin, scrub, once flag, animation duration/delay, child tween positions,
targets and scalar animation properties were recorded. Section geometry,
viewport metrics and active CSS animation timing were also compared.

| Profile and capture phase | Local/reference result |
| --- | --- |
| Desktop normal, 1280 × 720 | All 64 registered triggers and recorded timeline configurations were identical. |
| Mobile normal, 390 × 844 | All 69 registered triggers and recorded timeline configurations were identical after layout refresh. |
| Mobile reduced motion, 390 × 844 | All 19 registered triggers and recorded configurations were identical. |
| Desktop reduced motion, 1280 × 720 | All 19 registered triggers and recorded configurations were identical. |

Counts describe the captured phase: one-time triggers may remove themselves
after firing. The first mobile inventory had four cached end bounds differing
by one pixel and an image transition still active on one page. Once that
transition finished and both layouts were refreshed, the inventories matched.
Both the initial and refreshed records are retained.

Twenty desktop chapter positions and eighteen mobile chapter positions were
traversed using wheel input. Every matched sample reached the same scroll
position on local and reference pages. The complete journey includes the amenity
index, all five wellness scenes, pool, terrace, family, interiors, essentials,
connections, map and finale. Full-viewport captures and DOM state are retained
in `screenshots/`, `desktop-scroll-samples.json` and `mobile-scroll-samples.json`.
Paired contact sheets were visually inspected. Moving videos and scrub settling
were at different clock phases in uncontrolled captures; those are not reported
as exact pixel comparisons.

The mobile flow also exercised building selection, its explicit floorplate
and residence confirmation steps, residence opening/closing, reception,
living-room film opening/closing, chapter navigation, the closing explorer's
residence gate, footer access and the walkthrough dialog. The living-room
video played with its three siblings paused. The walkthrough dialog opened;
walkthrough playback is not claimed. Root client width remained 375 and scroll
width remained 375 across the checked mobile overlays. Desktop overlay width
remained 1265 in the earlier checks.

The source retains full residence closing transition timing even when reduced
motion is selected. An early test attempted another action before the reference
finished that transition; waiting for completion resolved the navigation mismatch.

The synchronized mobile finale comparison had a mean channel difference below
0.00016 on the 0–255 scale. It was not completely pixel-identical. See
`mobile-finale-comparison.json`. No application code was altered to force a
capture to match.

## Input and capture limits

The in-app browser supports wheel/click input and touch emulation, but does not
support CDP touch gesture synthesis or touch-event dispatch. Mobile normal
verification used the responsive viewport with touch emulation and wheel/click
input; physical finger scrolling was not tested. In reduced motion the site
disables Lenis, and this browser's synthetic wheel input did not produce native
default scrolling on either page. Reduced-motion states were therefore checked
using controlled native `window.scrollTo` positions and ordinary controls.

The original opening, floor/residence and closing motion samples were inspected
as frame sequences. Captures sample display frames; every transient, every
rapid hover path, every unit and every physical device has not been exhaustively
recorded. Pixel identity is established for the synchronized desktop finale,
not every possible state. The previously observed modal-resize behavior and
inactive terrace handlers remain identical to the reference.

No application console errors or failed network requests were observed in
the normal mobile run. The desktop diagnostic briefly raised a TypeError while
calling a scrub accessor that returned a non-tween; the diagnostic was corrected
and repeated. This was test instrumentation, not an application error.

All temporary test tabs, viewport, media and device overrides were cleared.
The theme was not changed. No external contact or form submission occurred.

## Follow-up: complete portal state and playback

The current `browser-checks.md` supersedes the older finale conclusions above.
The finale draws both its underlying photo and a separately projected portal
photo. The portal's cached geometry and numeric tween targets must be compared,
not only `.rp-final-image`. `tools/visual-state.js` now records these values.

Fresh mobile reference/reference/local runs had identical complete visual states
and zero changed pixels in three repeated captures. A fresh desktop pair had
identical complete visual states but retained 180 photo-edge pixels differing
by at most one channel level. Its cause is unconfirmed. The earlier reference
repeat test omitted portal state and does not establish rendering nondeterminism.

The additional 24-pose comparison yielded six exact captures. Other poses retained
differences; those records predate complete portal/tween-state recording. Large
differences must not be dismissed as renderer noise. The enlarged-crop control
captures and initial inaccurate scroll-position diagnostics are excluded.

Four explicit-viewport portal sequences cover rewind, expansion, image exchange
and arrival. The latest playback checks establish progression in all four room
films, with inactive room films paused, and in both walkthrough films after
using their native controls. See `all-room-playback.json` and
`walkthrough-user-playback.json`. Width remained stable and no media errors
were recorded. Application bundles, styles, fonts and artwork remain unchanged.


## Follow-up: repeated checkpoint state and decoding evidence

The current summary is `browser-checks.md`; the current checklist is
`completion-audit.json`. No original application file was changed in this run.

- Repeated all 15 floor hovers; hit rectangles stayed equal to their initial
  local/reference bounds. Repeated wellness hover, keyboard/pointer replay,
  chapter panel opening/closing, and portal expansion/exchange/arrival/rewind
  with full viewport JPEG sequences. Panel client width remained 1265.
- Compared 24 desktop checkpoints with recorded GSAP and CSS state, a
  preliminary paint capture and three settled PNGs per checkpoint. All recorded
  states matched; 20 checkpoints matched pixel for pixel. Steam, zen and terrace
  retained small one-level differences; family retained a larger photo difference.
- Four additional portal checkpoints matched recorded GSAP, CSS and media state,
  but retained image differences. Actual target values and portal geometry are
  recorded, rather than inferred from matching scroll positions.
- Actual fresh family image responses had identical bytes and MIME, but loaded
  decoded pixel hashes differed and switched sides compared with the earlier
  run. Fresh blob decodes matched. Portal still downloads and fresh decodes also
  matched, while already-loaded still images returned different pixel hashes.
  The specific decoder/cache mechanism is unconfirmed. Original bytes are kept.
- The initial fresh lazy-image canvas read was transparent before load completion
  and is explicitly invalidated. Later family records with differing offscreen
  media readiness/time are excluded from complete media-state parity claims.
- Moving PNG captures with clipped bands are excluded from motion proof. Browser
  JPEG sequences preserve the full viewport, but have unsynchronized clock
  phases and are sampled rather than exhaustive.
- Python lint/format, visual-state JavaScript syntax, 655 archive hashes, 44
  additional originals, 440 frames, seven runtime modules, 29 image variants
  and 673 local browser-image HTTP responses passed. Desktop console logs were
  empty for warnings/errors. No CI was added.

At this historical checkpoint, the independent Chrome comparison awaited the
user's browser choice. The resumed goal later authorized unblocking that check;
see the independent Chrome follow-up below.


## Cache delivery and canvas-path follow-up — 2 October 2026

The preview now matches captured cache policies and validators for 728 original/negotiated representations. All profiles and 28 conditional/range/privacy checks pass; original code, assets and all 673 image HTTP payloads remain unchanged. See `reference-response-metadata.json` and `http-delivery-checks.json`.

Isolated default-canvas, software-hint and ImageBitmap probes prove that earlier readback hashes were path-sensitive, rather than canonical decoder-only evidence. Both origins match when using the same isolated path. Slow loading changes the default family-image readback. See `isolated-webp-decode-probe.json`, `progressive-loading-decode-probe.json`, and `portal-still-canvas-path-probe.json`.

Eight new synchronized poses match recorded GSAP/CSS/layout/media state across three repeats. Three portal poses match pixels exactly; the exchange has 645 changed pixels, max channel difference 1. Steam, zen, terrace and family still differ. Each origin is stable across repeats. This profile uses client width 1280, unlike the historical 1265 profile; no controlled caching-fix claim follows from changed counts. See `desktop-cache-pose-comparison.json` and `cache-render-environment.json`. The failed initial synchronization is explicitly excluded.

At this historical checkpoint, the Chrome comparison was pending. Diagnostic tabs were closed, network and viewport overrides reset, and the temporary server stopped. Full pixel identity was not claimed.

## Independent Chrome, full visible styles and encoded delivery — 2 October 2026

The resumed goal authorized unblocking Chrome verification. The existing
enabled browser extension was used; no software or security access was added.
The prior Chrome session closed, so the fresh encoded-delivery run uses a new
connection. All fresh pages use 1280 × 720, DPR 1, client width 1265, and preserve
the current dark system theme. Computer Use denied access to Codex's own app;
it was not bypassed.

An expanded diagnostic captures all visible computed CSS, ancestors, pseudos,
font faces, text and geometry, alongside GSAP/media state. Eight in-app triad
poses matched those diagnostics. An initial DPR-mismatched triad is excluded
from local pixel parity. Raw wheel delivery needed calibration in both browsers;
verified final scroll positions are recorded.

Chrome fetches proved the live reference uses Brotli for the main script and
sample AVIF while the preview initially used identity. Captured 80 exact coded
bodies (40 Brotli, 40 gzip) and validated each decoded SHA against its original.
The preview now negotiates those exact representations. All 80 GET/HEAD/ETag
checks, seven negotiation cases, private storage exclusion, 728 header profiles,
673 browser image responses, archive integrity and module syntax passed.
Fresh Chrome fetches confirm matching Brotli, MIME and decoded hashes.

Eight fresh Chrome poses match both diagnostics across three samples. Family
and portal exchange are pixel-identical in all samples. Other portal/terrace
captures have at most one-level channel differences; steam and zen retain
larger raster differences. Earlier pointer-overlay captures are not used as
proof of source defects. Pointer movement outside the viewport now happens
after scrolling and before measured captures. See the exact counts and limits
in `browser-checks.md` and `chrome-encoded-pose-comparison.json`.

A second reference repeats steam and zen with identical recorded state. The
two reference renders differ at steam (17,736 pixels, max 64) and zen (82,846,
max 8). Local/second-reference zen differs at only 15 pixels, max 1. This
establishes same-origin reference variability; it does not establish every
remaining difference's paint mechanism or exhaustive journey pixel identity.
No original app, CSS, font, image, video or animation file was altered.
