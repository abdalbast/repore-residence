# Verification — 2 October 2026

The clone runs the original deployed application, with its JavaScript, CSS,
fonts and animation code unchanged. All missing original plans and the exact
browser-negotiated CDN image variants have been restored.

## Source and delivery

- All 699 original runtime files matched the live reference byte for byte,
  covering 155,013,065 bytes. This includes all 440 opening frames, seven JS
  chunks, three CSS chunks, three fonts, residence data, videos and model.
- The 655 archived files remain unchanged. The 44 omitted original unit plans
  and floorplates were retrieved from their exact reference URLs.
- All 673 image URLs were checked with the browser's image Accept header.
  The CDN returns 29 PNG/JPEG resources as optimized WebP. These exact
  variants are preserved separately in `browser-variants/`.
- All 673 local browser image HTTP responses matched reference bytes and MIME
  types. Original delivery remains available when WebP is not accepted,
  including `image/webp;q=0`. Negotiated responses use `Vary: Accept`.
- Archive integrity, module syntax, Python linting/formatting and local image
  delivery checks passed. No CI configuration was added.
- Reference HEAD responses were recorded for 699 originals and 29 negotiated
  variants, without downloading the media again. The preview now reproduces
  their cache policies, ETags and Last-Modified headers. All 728 content-type
  and cache-header profiles matched; 28 conditional/range/privacy checks passed.
  `Vary: Accept` remains on negotiated resources to keep local representations
  separate. See `reference-response-metadata.json` and `http-delivery-checks.json`.

## Scroll and interaction parity

The runtime inventory compares trigger bounds, pin/scrub/once configuration,
animation durations/delays, child tween positions, targets, scalar properties,
section geometry and CSS animation timing. Counts reflect the captured phase;
one-time triggers remove themselves after firing.

| Profile | Identical registered trigger configurations |
| --- | --- |
| Desktop normal, 1280 × 720 | 64 |
| Mobile normal, 390 × 844 | 69 after layout refresh |
| Mobile reduced motion, 390 × 844 | 19 |
| Desktop reduced motion, 1280 × 720 | 19 |

Twenty desktop and eighteen mobile chapter positions were traversed. Local
and reference reached the same scroll position at every recorded sample.
The journey covers the amenity index, all five wellness scenes, pool, terrace,
family, interiors, essentials, connections, map and finale. Paired full-viewport
captures and contact sheets are retained in `screenshots/`.

The checked interactions include floor/residence opening and closing,
keyboard residence selection, the desktop 2D/3D plan toggle, reception,
all four room films, chapter navigation, the closing explorer's residence gate,
mobile footer access and both walkthrough films. Each room film advanced while
the other three remained paused. Both walkthrough films advanced after clicking
their native play controls, with no media errors. They start paused in both builds.
Root client width stayed 1265 on desktop and 375 on mobile across checked overlays;
scroll width stayed equal to client width.

The first mobile inventory had four cached bounds differing by one pixel and
an image transition active on one page. The inventories matched after the
transition finished and both layouts were refreshed. Both records are retained.

## Rendered comparison and limits

The CDN format negotiation explained the remaining tower illustration difference:
the original PNG and browser-served WebP had different decoded pixels. Their
local/reference pixel hashes matched after negotiation was reproduced.

The finale includes a separate animated portal image, mask and content layer.
Comparing only the underlying `.rp-final-image` does not establish identical
portal geometry. The new `tools/visual-state.js` diagnostic records the portal,
actual GSAP tween target values and progress, computed styles, and target bounds.

Fresh mobile runs at 390 × 844 matched pixel for pixel across three captures.
Two independent reference tabs and the local tab also matched in their complete
recorded visual state. See `mobile-render-baseline-comparison.json` and
`mobile-complete-visual-states.json`. This supersedes the earlier 134-pixel mobile
edge difference for that tested phase; no application code was changed.

A fresh desktop pair at 1280 × 720 matched in complete recorded visual state.
Its three captures consistently retained 180 changed pixels, with a maximum
one-level channel difference at the photo edge. The cause remains unconfirmed.
See `desktop-fresh-finale-comparison.json`. An earlier desktop diagnostic recorded
zero changed pixels, but that does not establish identity for every state.

The earlier 24-pose comparison (`desktop-phase-comparison.json`) had six exact
frames and did not record all portal or tween target state. It is retained as
history. A new 24-checkpoint comparison records actual GSAP target values,
progress, portal geometry, computed styles, and CSS animation state. Native
scroll positions, settled scrub progress, CSS at 2000 ms and paused video at
one second are diagnostic controls, rather than normal scrolling behavior.
A preliminary paint capture precedes three measured PNG captures at each pose.

All 24 checkpoints matched in their recorded GSAP and CSS state. Twenty matched
pixel for pixel in every repeated capture. Steam, zen and terrace retained
21, 19 and 79 changed pixels respectively, each with a maximum one-level channel
difference. Family retained 148,651 changed pixels, maximum 19. See
`desktop-complete-pose-captures.json` and `desktop-complete-pose-comparison.json`.
`tools/compare_checkpoint_frames.py` reproduces these image comparisons.

The family photo's default-canvas readback hashes differed. After reloading both pages
with response caching temporarily disabled, their actual image responses had
identical bytes, MIME and SHA-256, while default-canvas hashes switched
sides. Fresh blob-image readbacks matched in both pages. These readbacks do not
isolate canonical image decoding; the later path probes below qualify this
earlier interpretation. See
`family-actual-network-response.json`, `family-decoded-image-hashes.json`,
`family-fresh-visible-decoding.json` and `family-fresh-decode-timing.json`.
The initial `family-fresh-dom-decoding.json` read happened before the lazy image
completed and returned a transparent canvas; it is excluded from decoded-image
claims. Later family repeat records include differences in offscreen media
readiness or time and do not establish identical complete media state.

Four additional portal checkpoints at y=32100, 32500, 32800 and 32982 matched
in recorded GSAP, CSS and media state across all three repeated captures. Their
pixel differences were 180, 11,768, 258,004 and 132,555, with maximum channel
differences of 1, 12, 14 and 2 respectively. The tower capture image's canvas
readbacks matched; default-canvas readbacks of the loaded opening still differed.
Fresh downloads and blob-image readbacks of that still matched. See
`desktop-complete-portal-comparison.json`, `portal-decoded-image-hashes.json` and
`portal-still-fresh-delivery-and-decoding.json`. Full journey pixel identity
remains unproven; no original application code or asset was changed.

### Canvas paths and delivery follow-up

Isolated image-viewer probes of both origins returned the same hashes when the
same path was used. The family HTML image returned `ef745003…` through a default
canvas and `2c30f270…` with `willReadFrequently: true`. An ImageBitmap returned
`2c30f270…` with either canvas setting. The opening still similarly returned
`0c0ada02…` through the default HTML-image path and `deaedb0f…` with the software
hint or ImageBitmap. All delivered bytes matched. See
`isolated-webp-decode-probe.json` and `portal-still-canvas-path-probe.json`.

At 64 KiB/s and 100 ms latency, both origins returned `2c30f270…` through all
tested family-image canvas paths. With throttling removed, local default-canvas
readback changed to `ef745003…`; reference readback remained `2c30f270…` in that
run. See `progressive-loading-decode-probe.json`. This establishes sensitivity
to loading and raster paths, rather than a canonical decoded-pixel mismatch.

Chromium's [canvas implementation](https://chromium.googlesource.com/chromium/src/+/63cc88a00dfe15f406487da666eb5c2611120963/third_party/blink/renderer/core/html/canvas/html_canvas_element.cc)
prefers CPU rendering with the read-frequency hint. Its [WebP decoder](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/platform/image-decoders/webp/webp_image_decoder.cc)
can enable YUV decoding when the complete eligible image arrives together.
These support a rendering-path explanation; they do not prove which installed
Chromium branch produced every screenshot difference.

After cache-header parity, eight additional poses were captured three times.
All matched their recorded GSAP, CSS, layout and media state, and both pages
loaded all three original fonts. The fresh profile had client width 1280 at
1280 × 720, DPR 1; previous runs had client width 1265. Counts from these profiles
must not be used as a controlled before/after proof of a caching fix.

| Pose / scroll y | Changed pixels in each repeated pair | Maximum channel difference |
| --- | ---: | ---: |
| Steam / 19546 | 30,129 | 80 |
| Zen / 20890 | 14,664 | 72 |
| Terrace / 24480 | 1,344 | 1 |
| Family / 25580 | 6,054 | 6 |
| Portal / 32100 | 0 | 0 |
| Portal / 32500 | 0 | 0 |
| Portal / 32800 | 645 | 1 |
| Portal / 32982 | 0 | 0 |

See `desktop-cache-pose-captures.json`, `desktop-cache-pose-comparison.json` and
`cache-render-environment.json`. Within each page, all three screenshots of each
pose were identical. Text/photo raster differences remain despite identical
recorded state. The initial cache-pose attempt failed before synchronization
completed and is excluded; `desktop-cache-pose-initial-captures.json` records
that failure. Diagnostic evaluation now surfaces CDP exceptions explicitly.
The cache changes are delivery fidelity work, not a verified cure for all
rendering differences. The original app and media remain unchanged.

Opening, floor/residence transitions, all ten desktop chapters, reverse scrolling,
mobile reverse/replay, and portal rewind/expansion/image exchange/arrival were
inspected as rendered frame sequences. The portal uses an explicit viewport clip;
its full viewport sequences showed continuous progression in the sampled frames.
These are samples, not an exhaustive recording of every display frame, rapid
hover path, unit or physical device. Uncontrolled video and scrub captures can
have different clock phases.

Some in-app captures produced an enlarged crop while DOM geometry was unchanged.
The affected desktop control-hover, scene-replay and chapter-panel sequences,
the initial `phase-*` captures, and the earlier device-metrics mobile captures
are excluded from visual parity claims. They are retained as diagnostic history.
Moving-scroll captures with explicit PNG clips also produced clipped bands in
some frames, so those affected samples are excluded. Settled PNG comparisons
specify visible document position, viewport size and scale. Motion checks now
use browser viewport JPEG screenshots, which preserve the full viewport at a
uniformly reduced size and are not used for strict pixel comparison.

The new viewport sequences repeat wellness navigation hover, keyboard and
pointer replay, chapter panel opening/closing, and portal expansion, exchange,
arrival and rewind. The inspected samples show full viewport progression and
no discrete flashing; unsynchronized local/reference samples have different
clock phases. Page client width stayed 1265 and scroll width matched it through
panel opening and closing. All 15 floor hover hit rectangles remained stable;
paired hover and idle samples are retained. See `motion-capture-review.json`.
These sampled checks do not prove every display frame or every rapid pointer
path. The independent Chrome comparison has now been performed; see below.

### Independent Chrome and encoded delivery

The resumed goal authorized unblocking the independent browser check. Chrome
was opened using its existing extension, without installing software or
changing security permissions. Computer Use could not inspect Codex's own
window because the tool denied access; browser-owned captures were used.

Both Chrome pages used 1280 × 720, DPR 1, client width 1265 and the existing
dark system theme. Matching keyboard input opened the same residence at
scroll y 5119 with client/scroll widths 1265. Earlier mixed pointer/keyboard
input produced different positions and is not evidence of an app mismatch.
The same lazy chapter gate expanded both documents to height 34421 at y 12904.

Actual Chrome fetches exposed a delivery gap: the reference used Brotli for
scripts and AVIF while the local preview used identity encoding. Forty original
resources now have separately preserved exact Brotli and gzip responses. All
80 compressed hashes and decoded original hashes match their captured source.
GET, HEAD and ETag revalidation passed for every representation; seven encoding
quality cases and private storage exclusion passed. The 728 identity/image
header checks and 673 browser image byte/MIME checks still pass. Chrome then
received matching Brotli, MIME and decoded hashes for the sampled script and
AVIF. See `content-encoding-checks.json` and `chrome-encoded-response-probe.json`.

`render-state.js` extends the earlier state diagnostic with every computed
property of visible elements and their ancestors, generated pseudos, font
faces, text, styles and geometry. It complements GSAP and media state; it does
not expose every GPU/compositor detail. Eight fresh poses match both recorded
diagnostics in all three samples. The pointer was moved outside the viewport
after scrolling, removing the pointer overlay seen in earlier Chrome captures.

| Pose / scroll y | Changed pixels in the three pairs | Maximum channel difference |
| --- | ---: | ---: |
| Steam / 19546 | 18,177 / 18,177 / 18,177 | 59 |
| Zen / 20890 | 82,859 / 82,859 / 82,859 | 8 |
| Terrace / 24564 | 66 / 74 / 68 | 1 |
| Family / 26307 | 0 / 0 / 0 | 0 |
| Portal / 32100 | 0 / 57 / 0 | 1 |
| Portal / 32500 | 53 / 16 / 53 | 1 |
| Portal / 32800 | 0 / 0 / 0 | 0 |
| Portal / 32982 | 0 / 0 / 9 | 1 |

See `chrome-encoded-pose-captures.json` and
`chrome-encoded-pose-comparison.json`. These are controlled settled captures,
with scrub completion, CSS time 2000 ms and ready videos paused at 1 s; they
do not substitute for the normal motion sequences recorded earlier. Different
scroll positions, fresh loads and pointer handling prevent attributing all
changes from older captures specifically to compression.

A second independent reference load repeats the steam and zen poses with the
same full recorded state. Reference/reference steam differs at 17,736 pixels,
max channel 64; local/second-reference differs at 10,763, max 45. At zen the
two references differ at 82,846 pixels, max 8, while local/second-reference
differs at 15 pixels, max 1. All three samples repeat those counts. This proves
some residual variability occurs within the reference itself; the precise
installed rendering mechanism remains unconfirmed. See
`chrome-encoded-reference-control-comparison.json`. Original application
bundles, artwork, fonts and animation code remain unchanged. Full journey
pixel identity remains unproven.

The earlier in-app triad likewise records eight fresh DPR-1 poses with equal
GSAP/media and expanded style/geometry state across three origins. The first
triad had mismatched screenshot scale and is excluded from local parity.
Raw wheel delivery under Retina emulation needed calibration; target positions
were verified rather than inferred from requested deltas. See
`desktop-render-triad-comparison.json` and `chrome-wheel-calibration.json`.

The fresh Chrome animation inventory matches exactly, including viewport,
section geometry, timing, scrub settings and trigger bounds. There are 48
currently active triggers on each page after the opening's once-only triggers
have retired; this is separate from the earlier 64 registered desktop triggers.
See `chrome-encoded-animation-inventory.json`. Both Chrome warning/error logs
were empty. All authored Python lint/format and diagnostic JavaScript syntax
checks passed.

The in-app browser cannot synthesize touch gestures. Mobile normal verification
used touch emulation with wheel/click input. Physical finger scrolling was not
tested. Reduced motion disables Lenis, and this browser's synthetic wheel did
not perform native default scrolling on either page. Reduced-motion states
were checked with controlled native scroll positions and ordinary controls.

The original viewer still requires full residence closing transition time in
reduced motion. Waiting for that transition resolved an early navigation test
mismatch. The reference's inactive terrace handlers and its observed modal
resize behavior remain unchanged.

No application errors or failed network requests were observed in the normal
mobile run. The latest desktop run had no warnings or application errors.
Test-instrumentation failures were corrected; a bathroom card became selectable
after scrolling into its active range. All temporary tabs, viewport, device and
media overrides were cleared; the theme was preserved. No contact message,
form submission or deployment occurred.

See `browser-checks-detailed.md` for the initial checks and additional diagnostic
history. The JSON inventories and image comparisons retain the underlying data.
