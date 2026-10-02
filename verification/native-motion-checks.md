# Motion and interaction follow-up — 2 October 2026

The user confirmed preserving TAPS AGENCY and removing both WhatsApp controls
while matching the reference design and motion. These are accepted differences.
The current implementation preserves the original artwork, fonts, styles and
animation logic after those accounted-for changes. See
`accepted-scope-checks.md` for the final current-source audit and desktop/mobile
checks. Exhaustive framebuffer equality across all loading and rendering phases
is not claimed; reference-versus-reference controls also exhibit raster variance.

## Source audit

An independent subagent compared the current bundles with the intact supplied
ZIP using bounded, in-memory transformations. Main and lifestyle JavaScript
match the archive exactly after accounting for branding, logo/email references,
renamed imports, WhatsApp UI removal and its readiness/export wiring. Terrace
JavaScript only changes the imported main filename. Main CSS removes exactly
1,906 bytes of WhatsApp rules/keyframes. Both other stylesheets, all three font
files and all four vendor bundles remain byte-identical.

No additional changes to GSAP/Lenis configuration, scroll triggers, easing,
timelines, geometry constants or non-brand asset references were found. The
opening logo link became a div and the footer action row lost its WhatsApp CTA;
their interaction and layout differences are intentional source changes.
Source equality does not by itself prove rendered motion equality.

## Unfrozen scroll traces

`native-motion-traces.json` was recorded before the rebrand with normal native
wheel delivery and the GSAP ticker. No scrub, CSS, video or animation state was
forced. Seven segments contain 420 ticks per origin, totaling 5,880 ticks:
opening exit, both lazy mounts, portal expansion, exchange, arrival and rewind.

`native-motion-comparison.json` compares input-relative scroll crossings and
nearest-scroll trigger states. All seven segments finish at equal scroll
positions with a stable sampled tail. Trigger identities and static bounds
match. Nearest-scroll pairs retain gaps up to 42 pixels and trigger-progress
differences up to 0.009563; they are not simultaneous animation-clock samples.
The largest interpolated crossing difference is approximately 18.1 ms, while
one recording has an 87.4 ms callback gap. These are finite samples, not proof
of every rendered frame or exact timing.

The accompanying normal-motion JPEGs contain cropped/enlarged captures in
several sequences. They are excluded from whole-interface and perimeter pixel
claims. See `visual-audit-native-raster-sizes.json` and
`visual-audit-findings.md`. Dimensions or matching trigger endpoints alone
do not establish complete rendered-frame fidelity.

## Current rebrand browser checks

One in-app browser pair used 1280 × 720, DPR 1 and a 1265-pixel page width.
Existing preferences were preserved: reference light and local dark. The
current pages have 48 active trigger configurations after once-only retirement,
all equal, and equal loaded font-face records. See
`current-rebrand-animation-inventory.json`.

A fresh normal-wheel rewind on the current rebrand runs from 32981.5 to 31850
on both pages. Each records 420 ticker frames, with equal settled endpoints,
equal trigger identities/bounds and no scalar-structure mismatches. Interpolated
input-relative scroll crossings differ by at most 1.41 ms. Nearest-scroll pairs
still differ by up to 8 pixels and 0.007408 in progress; the sampled callback
phases differ. See `current-native-motion-traces.json` and
`current-native-motion-comparison.json`. This is additional unfrozen state
evidence, not a rendered-pixel or exact-clock identity claim.

- Floor explorer: queued 15 → 14 → 13, then 12 → 11 and reversal to 12;
  double-click zoom to 2.4, bounded dragging and reset to 1. Settled plan assets,
  figure geometry and zoom transforms match. The underlying pages started one
  pixel apart (5119 versus 5120), so these are not whole-background pixel checks.
- Residence: Level 12 right-wing plan, native wheel zoom to 1.2117, reset to 1,
  Escape back to floor and then building. Asset and settled transforms match.
  Focus-induced panel scrolling occurs on both pages. An early Escape return
  capture has different transition phases and is not used as timing parity.
- Enquiry: Tab/Shift+Tab wrap, contained wheel input and Escape dismissal restore
  focus to ENQUIRE. No contact link was activated.
- Wellness and pool: focus wraps on the close control; wheel scrolls the dialog
  without moving the page. Escape restores the wellness trigger. Pool overlay
  dismissal closes both dialogs, but leaves BODY focused on both pages.
- Walkthrough: rapid ArrowRight/ArrowLeft settles on the second film; close during
  a film change and reopen succeed. Enter and Escape skip a confirmed active
  reentry introduction. Both settle on the first film. Videos expose native
  controls and initially remain paused, as the original source specifies.

Evidence is in `viewer-interaction-checks.json`, `unit-interaction-checks.json`,
`dialog-interaction-checks.json`, `walkthrough-reopen-skip.json` and
`walkthrough-enter-skip.json`. The earlier rows named `walkthrough-intro` and
`walkthrough-skipped` were captured after the first introduction had already
finished; they do not prove that first-open skip path.

Explicit viewport PNG clips have matching pre/post scroll bounds. Full-frame
contact sheets were inspected for wellness and walkthrough entry/change/reentry.
No local-only flash was identified in those sampled frames. Sampling misses
intervening display frames, and independent captures are not synchronized.
Walkthrough reentry briefly has different underlying page positions; its
intermediate images do not establish cross-origin pixel equality.

The settled wellness and pool panel interiors match pixel-for-pixel in the
region x=330..919, y=40..679. That comparison excludes their perimeter and
scrollbar: residuals remain there and in the background, including the
reference's WhatsApp control. `current-dialog-pixel-regions.json` records the
regions and limits. This limited match is not a whole-interface claim.

Python lint/format checks pass for `serve.py` and `tools`. Syntax checks pass
for the new native trace helper and all three current customized app bundles.
No application motion code was changed during this follow-up.

## Fresh navigation and floor frame sequences

A later pass reloaded both documents and recalibrated native wheel delivery.
With the fresh per-tab viewport overrides, a raw delta of 10 delivered a DOM
delta of 10 on both pages, unlike the earlier factor-of-two delivery. Wheel
scaling is measured for the active viewport rather than assumed.

At y=5121 the reference already had its first lazy component mounted while
the local page had not. The actual lazy scroll trigger starts at 5544. After
opening an available residence, closing both explorers and crossing to y=5800,
both pages had the component mounted and a document height of 13625. Later
mounts also matched: y=12905 with document height 34422, then y=14600. The
earlier difference is before the trigger and does not establish a missed local
trigger. The precise reason for the reference's early mount is unconfirmed.
See `fresh-visit-input-calibration.json` and `fresh-visit-lazy-journey.json`.

A clean bootstrap control then used two new blank tabs, each navigated once to
its origin, to remove prior scroll/app state from the comparison. Both began
at y=0 with document height 9936, no lazy component and exactly equal six-trigger
configurations, including the near-lifestyle start at 5544. Both inherited light
theme defaults without an override. This confirms matching clean initial state;
the precise reload-history mechanism remains unconfirmed. The two diagnostic
tabs were closed and their viewport overrides cleared. See
`clean-bootstrap-comparison.json`.

The explorer first requires a building-hover reveal. An initial keyboard
activation before that reveal entered a plan while shifting both pages out of
the active range. Those seven `entry-*` pairs in
`current-floor-motion-frames.json` are excluded from normal entrance fidelity.
Native Escape recovered both pages. A building hover then revealed the selector
on both, and a native click opened Level 15 with both pages held at y=5328.

Thirty subsequent full-viewport frame pairs cover native entrance, queued
15 → 14 → 13 changes, reversal to 14 and settled states. All PNGs are 1280 × 720
and have stable pre/post capture scroll bounds. The entire viewport, including
surrounding artwork, edges and controls, was inspected in
`floor-native-entry-contact-sheet.jpg`, `floor-queued-change-contact-sheet.jpg`
and `floor-reverse-change-contact-sheet.jpg`. No local-only flash was identified
in these sampled frames. The image-wait branches and capture clocks differ, so
intermediate rows do not prove simultaneous timeline phases or every display
frame. Settled plan assets, geometry and transforms match.

`current-floor-settled-pixel-comparison.json` records remaining raster differences.
The intentionally removed WhatsApp control occupies x=1178.28..1234.28 and
y=633.28..689.28; its padded corner is explicitly excluded in one comparison.
Native scrollbar and small channel-level content differences still remain.
These captures are not whole-frame pixel-identical, and no source-level cause
requiring an artwork or typography change has been established.

The same fresh document's first walkthrough open was checked before any earlier
walkthrough activation. Both introductions were present before native Enter.
Both skipped to the first film and removed the introduction, with page width
1265 throughout. Six full-frame pairs were inspected in
`walkthrough-first-open-skip-contact-sheet.jpg`. The record is
`walkthrough-first-open-enter-skip.json`. This closes the first-open Enter skip
gap; the older mislabeled rows remain excluded. Escape on reentry is covered
separately by the preceding checks.
