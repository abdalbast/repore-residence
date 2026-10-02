# Independent visual audit

Read-only review of the existing encoded Chrome captures and seven native-motion traces. No application or original asset files were changed.

## Encoded Chrome checkpoints

All 8 first-sample pairs have the same 1280 × 720 raster size. The full interface, image clipping, typography placement, header, scroll marker and surrounding perimeter were inspected in the two `visual-audit-encoded-pairs-*.jpg` sheets.

- Family, finale, exchange and arrival are pixel-identical in the first sample. Family and exchange remain identical in all three original samples. The other reported repeated-sample differences are at most 1 channel value.
- Terrace has 66 first-sample differing pixels, all at most 1 channel value. Expansion has 53, also at most 1.
- Steam has 18,177 differing pixels, maximum channel difference 59. Substantial differences trace the glyph edges of the large heading and right-hand caption. The header and entire left/right perimeter are identical. Only 2 pixels differ in the bottom navigation underline, maximum 7. No changed video content or image/clip geometry was observed. The independent reference-versus-reference2 control has 17,736 differing pixels, maximum 64, at the same glyph edges. The specific rasterization mechanism is unproven; these captures do not establish a local font/source defect.
- Zen has 82,859 differing pixels, maximum 8. Removing the garden region leaves only 13 pixels, maximum 1, in the heading. Reference-versus-reference2 reproduces 82,846 differing pixels, maximum 8, in the garden; reference2-versus-local has only 15 pixels, maximum 1. The garden difference is reproducible within the reference site and does not establish a local asset defect. The arch silhouette, image placement, typography geometry, header and perimeter match.

Region counts are in `visual-audit-pixel-regions.json`; full-resolution crops and amplified differences are in `visual-audit-steam-region.png` and `visual-audit-zen-region.png`. These are diagnostic comparisons, not compensating changes to the source artwork or styles.

## Native motion traces

The seven traces are opening exit, two lazy expansions, portal expansion, exchange, arrival and rewind. All seven finish at equal scroll positions and have exactly equal final recorded trigger states. The actual native scroll easing has also been fitted separately from each trace's first timestamp: opening, lazy lifestyle, portal expansion/exchange and rewind fit exponential time constants around 208.2–208.5 ms on both origins (R² greater than 0.99998). Reference/local input onset timestamps differ. Consequently, the same screenshot index is not the same animation time or scroll position, and interim appearance differences cannot be called implementation defects from their index alone. The first lazy expansion contains additional callback timing variation; the fit there is weaker.

The raster sizes expose a coverage problem:

| Segment | Reference raster | Local raster |
|---|---|---|
| Opening exit, sample 7 | 1265 × 712 | 1265 × 712 |
| First lazy expansion, sample 7 | 524 × 720 | 1265 × 712 |
| Lifestyle lazy expansion, sample 7 | 524 × 720 | 524 × 720 |
| All four portal segments, sample 7 | 524 × 720 | 789 × 720 |

Recorded CSS client widths remain 1265. The narrow captures visibly truncate the right side of the interface and leave a dark area below the painted content. This is a capture-size discrepancy, and cannot be treated as a confirmed site flash or as complete full-interface visual proof. The native contact sheets were corrected to preserve each raster's aspect ratio, pad the available area and show the actual dimensions. Per-frame dimensions are in `visual-audit-native-raster-sizes.json`; fitted native scroll profiles are in `visual-audit-native-scroll-fit.json`.

Within the available painted regions, the sequence shows the intended forward portal growth, source-image exchange, arrival darkening/labels, and reverse contraction on both origins. No abrupt local-only flash was identified in these eight sparse samples per segment. The unseen right/lower areas and intervals between screenshots remain unverified.

## Next targeted evidence

1. Repeat native motion screenshot capture with a full viewport raster and explicit dimensions on both tabs. Capture through CDP with a known full-viewport clip if the browser-panel screenshot API remains clipped.
2. Preserve the current unfrozen motion and compare pictures at matched scroll/animation phases, rather than matching only screenshot indices or wall-clock timestamps.
3. Include the entire fixed header, progress marker, floating action button, clip perimeter and lower page area in those corrected sequences; inspect entry, completion, layer release and reverse motion.
4. Continue floor viewer/dialog interaction coverage. This audit found no confirmed authored visual defect warranting an application or original-asset change.
