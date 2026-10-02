# Study notes — Reposé Residence (repo residence.com)

Notes gathered while mirroring the site. Everything here is verifiable against the
files in this archive.

---

## 1. What kind of site this is

A **single-page application**. There is exactly one HTML document (`index.html`, 3.2 KB)
and it contains no content at all — just an empty `<div id="root">` and a module script:

```html
<div id="root"></div>
<script type="module" crossorigin src="/assets/index-Bez0Vhn_.js"></script>
```

Every word, image and interaction is produced at runtime by JavaScript. There is no
`sitemap.xml`, no `robots.txt`, and no other HTML route — `/residences`, `/about`,
`/gallery` and friends all return 404. **This is why an ordinary "save the page" or a
naive site ripper captures an empty shell**: there is nothing in the HTML to read.

Consequences for the mirror:

- All paths are **absolute** (`/assets/...`), so the archive folder must be the server root.
- Content strings live inside the minified JS bundles, not in markup.
- Some asset paths are **built at runtime** by string interpolation, so they cannot be
  found by grepping for extensions alone.

---

## 2. Tech stack

Identified from the bundles in `assets/`:

| Concern | Library | Evidence |
| --- | --- | --- |
| UI | React 18/19 + `react-dom` | `vendor-react-CL6k3kZJ.js` (190 KB) |
| Bundler | Vite | Hashed `/assets/name-HASH.js` filenames, `modulepreload` links |
| Animation | GSAP + ScrollTrigger | `vendor-gsap-CeZ-nkAJ.js` (113 KB) |
| Smooth scroll | Lenis | `vendor-lenis-b6LeKTCb.js` (20 KB) |
| 3D | three.js | `vendor-three-FFYe1X5b.js` (598 KB), lazy-loaded |
| CSS minifier | Lightning CSS | `--lightningcss-light` / `--lightningcss-dark` custom properties left in `:root` |

Exact library versions were stripped from the production build, so they cannot be
recovered from these files.

### Code splitting

Two route-level chunks are loaded on demand, **each with its own stylesheet**:

- `ReposeLifestyle-C-0HJaSK.js` (101 KB) + `ReposeLifestyle-CyDo--Vq.css` (64 KB)
- `TerraceExperience-B6r5GuYE.js` (24 KB) + `TerraceExperience-DPRIbK4J.css` (7.6 KB)

Easy to miss: the per-chunk CSS files are referenced from inside the JS, not from
`index.html`, so a mirror built only from `index.html` renders completely unstyled.

---

## 3. Structure — ten chapters

The site is a scroll-driven narrative in ten numbered chapters:

| # | Section id | Heading | What it does |
| --- | --- | --- | --- |
| 01 | `life` | Twelve ways to spend a day. | The 12 amenities, grouped Stillness / Movement / Water / Together |
| 02 | `rhythm` | A slower kind of everyday. | Scroll-scrubbed full-bleed panels + gym and steam-room films |
| 03 | `water` | Nothing to do. Everything to feel. | Full-screen swimming pool film |
| 04 | `terrace` | Above the everyday. | **three.js** terrace, six hotspots with named meshes |
| 05 | `family` | For every generation. | Generations/lifestyle imagery |
| 06 | `interiors` | The luxury of coming home. | Four rooms, each with a looping film, card and still |
| 07 | `essentials` | Life, considered. | Specification list incl. smart-home, 3.65 m ceilings |
| 08 | `connected` | Your world. Within reach. | Al Furjan location with stated travel times |
| 09 | `amenities-map` | Everything within reach. | Podium plan with six coordinate hotspots |
| 10 | `finale` | REPOSÉ | Closing CTA, enquiry, restart |

There is also a pre-chapter sequence: a hero, a "why Dubai?" statement, a **15-level
residence explorer**, and the film-strip intro described below.

### The interactive residence explorer

A separate subsystem, notable because it is data-driven rather than hard-coded:

- `/floor-explorer/repose-floor-explorer-assets/residences-map.json` (47 KB) — 15 levels,
  8 floorplates, 36 unit plans, residence sets, and **SVG-style hotspot polygons** per plate.
- `/floor-explorer/repose-floor-explorer-assets/floor-selector.json` (5.4 KB) — the level picker.
- 8 floorplate images (`.webp`).
- 36 unit plan images in `relit/units/`, and 36 separate "3D" presentation renders in
  `units-3d/`.

The code validates itself at runtime and throws on mismatch — for example
`Floor explorer: level ${level} missing from residences-map.json` and a check that the
floorplate image path matches what the JSON declares. Worth noting as an example of
rigorous data integrity.

### The three.js terrace

`/models/repose-terrace.glb` (1.9 MB) plus six poster images in `assets/terrace/`. Hotspots
are addressed by **mesh name**, not by index:

| Label | Mesh |
| --- | --- |
| Sports court | `Sports_Court` |
| Garden | `Landscape_07` |
| Play area | `Play_Area` |
| Fitness area | `Fitness_Area` |
| Swimming pool | `Main_Pool` |
| Walking track | `Walking_Track` |

---

## 4. Typography

Three self-hosted WOFF2 faces, no external font CDN:

```css
@font-face{font-family:ReposeDisplay;src:url(/assets/fonts/repose-display.woff2)format("woff2");font-weight:400;font-style:normal;font-display:swap}
@font-face{font-family:ReposeDisplay;src:url(/assets/fonts/repose-display-italic.woff2)format("woff2");font-weight:400;font-style:italic;font-display:swap}
@font-face{font-family:ReposeSans;src:url(/assets/fonts/repose-sans.woff2)format("woff2");font-weight:400;font-style:normal;font-display:swap}
```

The fallback stacks give away the originals:

- Display: `ReposeDisplay, "Instrument Serif", Georgia, …` — a **high-contrast serif**
- Sans: `ReposeSans, Manrope, system-ui, …`

Both are single-weight (400) and rely on **size, not weight**, for hierarchy. Full token
values are in `08-design-tokens.css`.

### Type scale

Entirely fluid with `clamp()` — no breakpoint jumps:

| Token | Value |
| --- | --- |
| `--type-hero` | `clamp(4.5rem, 12.5vw, 14.5rem)` |
| `--type-chapter` | `clamp(3.4rem, 8.4vw, 9.2rem)` |
| `--type-statement` | `clamp(2.2rem, 4.2vw, 4rem)` |
| `--type-lead` | `clamp(1.35rem, 2vw, 2.05rem)` |
| `--type-body` | `1rem` |

Line heights: display `.9`, heading `1.05`, body `1.55`, UI `1.4`.
Tracking: display `-.025em`, heading `-.018em`, body `0`, UI `.12em`, UI-wide `.18em`.

That pairing — `.9` line height with `-.025em` tracking on a serif display face — is the
main typographic signature, and it is where most of the site's "expensive" feel comes from.

---

## 5. Colour

The palette is two values, near-black on warm off-white:

```css
--ink:   #090c10;   /* background */
--paper: #f6f4f1;   /* text — warm, not pure white */
```

Plus `color-scheme: dark`, antialiased smoothing, and `font-synthesis: none`.
The page background is dark throughout, including the final CTA.

---

## 6. Media strategy

### The film-strip intro

The site's opening is a **440-frame scrubbed film**: 200 frames of `sequence-01` and 240
of `sequence-02`, each a WebP at
`/assets/opening/sequence-NN/webp/frame-0001.webp`.

The whole thing is driven by one GSAP timeline mapped to a virtual 620-unit timeline.
Named moments from the code:

```js
copyOutStart: S(50), copyOutEnd: S(105),
explorerInStart: S(25), explorerInEnd: S(95),
activeAt: S(80), w:{start:S(260), end:S(600)}
```

These images are ~1.5 KB each — the intro costs only a few MB but is smooth. They are
*not* a video: they are frame images so scrubbing, reversing and mobile frame-stride
skipping can be handled per-frame. The HTML comments in the source are unusually candid
about the performance reasoning ("Chrome said so itself — 'preloaded but not used'").

### Responsive image variants

Every brochure image exists in up to six forms, declared in a JSON manifest embedded in
the bundle: `file` (webp), `jpegFile`, `avifFile`, plus a 720 px-wide
`responsiveFile` / `responsiveAvifFile` / `responsiveJpegFile`. 123 files total.

The manifest also records **provenance** per image — brochure page, PDF XRef, original
pixel dimensions, crop rectangle, source bytes, and a note such as "Exact supplied file
copied byte for byte; no image edits". Captured in `05-brochure-image-provenance.json`.

### Video

9 MP4s, 56.6 MB total — the largest single cost in the site:

| Group | Files |
| --- | --- |
| Room films | `interiors/{living-room,kitchen,bedroom,bathroom}.mp4` |
| Amenity films | `amenity-videos/{gym,steam-room,pool}.mp4` |
| Walkthroughs | `walkthrough/{one,two}-bedroom-walkthrough.mp4` (15 MB + 25 MB) |

All are `muted`, `loop`, `playsInline`, `preload="none"`, with
`disablePictureInPicture` and `controlsList="nodownload noplaybackrate noremoteplayback"`.
Playback is suppressed entirely under `prefers-reduced-motion: reduce`.

---

## 7. Performance details worth noting

The build is unusually heavily commented about its own performance budget. Observable
choices:

- **One preload** for the intro film, not several. The comment explains the second frame
  was preloaded and then unused on mobile — Chrome's own "preloaded but not used" warning.
- Fonts, vendor chunks and the logo are `<link rel="preload">` / `modulepreload`ed.
- A `data/opening → filmBudget` mechanism steps the film by 3 or 5 frames on phones.
- GSAP's ScrollTrigger is **refreshed after fonts load** —
  `document.fonts.status !== "loaded" && document.fonts.ready.then(() => refresh())`,
  because late metric changes otherwise mismeasure every trigger.
- `font-display: swap` throughout.
- `loading="lazy"` / `decoding="async"` / `fetchPriority` set on below-fold imagery.

The `<meta name="viewport">` also carries `interactive-widget=resizes-content`, a
comment-documented workaround so that the iOS Safari address bar collapsing mid-scroll
does not fire a resize that re-measures every ScrollTrigger.

---

## 8. Accessibility and interaction

- `prefers-reduced-motion` honoured for all video playback.
- The custom cursor is pointer-only and mirrored by a real focus label —
  `aria-hidden` on the visual, `.closest('[data-cursor]')` to read intent.
- Hotspot markers in the amenities map and floor explorer are real buttons with labels.
- `aria-label`s are descriptive and written properly ("The children's play area",
  "Reposé's equipped gym with strength and functional training…"), not filename-derived.
- A `WELCOME TO REPOSÉ — SCROLL TO CONTINUE` interstitial gates entry.
- Contact routes: `info@saionproperties.com`, `+971 42 61 4002`, and a prefilled
  WhatsApp deep link (`wa.me/971563960318`).

---

## 9. How this archive was verified

The mirror was served locally and re-loaded in headless Chrome, scrolling the full page
and triggering every hover/click control, then compared against the same run against the
live site:

- **508 requests offline vs 509 live**; the one difference is a lazily-loaded map image
  that fired in one run and not the other — the file is present either way.
- **Zero failed requests, zero console errors** offline.
- Extracted visible text is **byte-identical** to the live site (4,797 bytes).
- 128 paths referenced in build metadata 404 on the live server too (pre-rewrite
  `*-web/` names, unbuilt `*-master/` variants, unused brochure entries). None are needed
  to run the site; listed in `06-paths-not-deployed.txt`.
