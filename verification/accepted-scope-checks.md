# Accepted design and motion scope — 2 October 2026

The user selected preservation of **TAPS AGENCY** and removal of both WhatsApp
controls while matching Reposé Residence's design and motion. The earlier
branding blocker is resolved. The implementation uses the supplied original
deployment, with the original fonts, artwork and animation code. No additional
application changes were necessary in this final verification pass.

## Independent current-source audit

All 655 archived public files were reconciled: 649 unchanged files are identical,
two retain their paths with authorized branding changes, and four captured
bundles have replacement filenames. Main and lifestyle JavaScript match the
original after exact branding, email, import and WhatsApp removal transformations.
Terrace changes only its main import. Main CSS removes the 1,906-byte WhatsApp
block; the other stylesheets, fonts and vendor libraries are unchanged.

The audit checked the 44 restored plans, 29 negotiated image variants, 80 encoded
responses and eight customization manifest hashes. Eighteen HTTP checks across
six customized resources with identity/Brotli/gzip preferences returned current
on-disk bytes rather than stale archived compressed bodies. No retired bundle
references or unintended motion, typography or asset changes were found.

## Current normal desktop motion

Seven valid segments cover opening exit, both lazy expansion gates, portal
expansion, exchange, arrival and rewind. They contain 5,880 GSAP ticker samples
and 80 paired PNG captures at 1280 × 720, DPR 1, client width 1265. All seven
settled scroll positions match. Compared trigger configurations and scalar
structures match, with no forced scrub, CSS animation or video clocks.

The seven full-viewport contact sheets were inspected, including the surrounding
interface and edges. The sampled sequences follow the same portal growth,
image exchange, arrival labels/darkening and reverse contraction. No authored
local-only flash was established. Current floor, wellness and walkthrough
sequences in `native-motion-checks.md` provide complementary interaction checks.

There are 58 pairs with stable pre/post capture scroll bounds. Moving-scroll
document clips can produce edge bands; those frames are excluded from perimeter
pixel claims. Separate no-clip calibration/replay captures were enlarged crops
despite matching raster dimensions and are also excluded. Matching dimensions
alone do not prove correct framing.

The first lazy-expansion attempt caught the remote plan still loading and the
reference floor still open; it is excluded. The corrected ready-state run reaches
y=5800 on both pages. The large opening wheel reaches the original gate at
y=5328 rather than the initial requested y=5000. Unsynchronized callback and
capture phases retain nearest-scroll gaps up to 166.5 pixels in that large jump,
and up to 7 pixels in the other six segments. These are source/state and sampled
motion checks, not exact wall-clock or exhaustive framebuffer comparisons.

Evidence: `accepted-scope-native-traces.json`,
`accepted-scope-native-frames.json`, `accepted-scope-native-comparison.json`,
and the seven `accepted-*-contact-sheet.jpg` files.

## Current mobile customization

At 390 × 844, DPR 1, both pages have client/scroll width 390 and load the three
original font faces. The TAPS opening logo, final explorer branding, contact
footer and enquiry dialog were inspected. Both WhatsApp controls are absent
locally. The contact email is `info@tapsagency.com`.

Native controls traverse the original coarse-pointer flow: reveal the levels,
select a floor, choose View floorplate, select a unit and choose View residence.
Both pages pass the opening and closing residence gates. Both lazy modules load
and the resulting document height is 32283. The accessible footer settles at
y=31439 on both pages. Initial unit-selection backgrounds had different scroll
positions and are not used for full-frame pixel comparisons. Earlier premature
and auto-scrolling locator attempts are not successful-flow evidence.

The enquiry dialog opens at y=29714 on both pages with identical panel bounds
(x=16, y=147.2578125, width=358, height=549.484375). Tab cycles through Close,
Email and Call and wraps to Close. Wheel input leaves the underlying scroll
position unchanged. Escape restores Enquire focus. Client and scroll widths
remain 390 throughout, with no horizontal overflow or page-width shift.
Six paired exit captures were inspected; the original dismissal returns to the
underlying page. The active mobile inventory has 49 matching trigger
configurations, with equal loaded font records.

Evidence: `accepted-mobile-checks.json`,
`accepted-mobile-animation-inventory.json`, the `accepted-mobile-*.png` captures
and `accepted-mobile-enquiry-exit-contact-sheet.jpg`.

## Validation and limits

Python lint and formatting pass for `serve.py` and all eleven Python tools.
JavaScript syntax passes for all three customized bundles and the native trace
helper. No CI, dependency installation, deployment or contact submission was
performed. Existing light/dark preferences were preserved; viewport and touch
overrides were cleared.

The accepted implementation has no identified unintended source or design/motion
differences. Original artwork, typography, timing, easing, triggers, effects and
interaction logic are preserved outside the accepted branding and WhatsApp
changes. Historical reference-versus-reference controls
reproduce residual raster variability; changing the original artwork or motion
to compensate would not improve source fidelity. This report does not claim
that every possible GPU framebuffer or physical-device gesture was tested.
Mobile input was emulated with mouse/wheel/keyboard controls, not physical touch.
