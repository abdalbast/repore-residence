/* The approach: canvas film scrub + overlaid chapter choreography. */

import { gsap, ScrollTrigger, clamp, reducedMotion } from "./core.js";
import {
  FRAMES,
  CRITICAL_COUNT,
  createFrameLoader,
  createFilmRenderer,
  frameMix,
  C,
  E,
  D,
  O,
  WINDOW,
  WINDOW_SPAN,
  k,
  F,
  I,
  TIME_SCALE,
} from "./film.js";

export function initOpening({ onNearLifestyle, onExplore, onTerrace }) {
  const root = document.querySelector("[data-opening-root]");
  const canvas = document.querySelector("[data-opening-canvas]");
  if (!root || !canvas) return null;

  const meterFill = document.querySelector("[data-opening-meter-fill]");
  const meter = document.querySelector("[data-opening-meter]");
  const fxRoot = document.querySelector("[data-fx-root]");
  const rcRoot = document.querySelector("[data-rc-root]");

  const loader = createFrameLoader(FRAMES, {
    criticalCount: CRITICAL_COUNT,
    onProgress: (p) => {
      if (meterFill) meterFill.style.transform = `scaleX(${p})`;
    },
    onCritical: (p) => openingLoader?.setProgress(p),
  });
  const renderer = createFilmRenderer(canvas);

  const reduced = reducedMotion();
  let active = false;
  let heroGone = false;
  let lastKey = "";
  let lastFrame = true;
  let stalled = 0;
  let jankTimer = 0;
  let suspended = false;

  const syncActive = (progress) => {
    const next = progress * TIME_SCALE >= C.activeAt - 1e-6;
    if (next !== active) {
      active = next;
      fxRoot?.toggleAttribute("data-active", next);
      rcRoot?.toggleAttribute("data-active", next);
      fx?.setActive(next);
    }
  };
  const syncHeroGone = (progress) => {
    const next = progress * TIME_SCALE >= 0.105;
    if (next !== heroGone) {
      heroGone = next;
      root.toggleAttribute("data-hero-gone", next);
    }
  };

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      syncActive(self.progress);
      syncHeroGone(self.progress);
    },
  });
  syncActive(trigger.progress);
  syncHeroGone(trigger.progress);

  /* film render loop */
  const loop = () => {
    jankTimer = requestAnimationFrame(loop);
    if (suspended) return;
    const t = trigger.progress * TIME_SCALE;
    const { a, b, mix } = frameMix(t);
    loader.setPriority(Math.round(a));
    loader.warm(a);
    const key = `${a}:${b}:${mix.toFixed(2)}`;
    if (key === lastKey && !lastFrame) return;
    lastKey = key;
    const imgA = loader.get(a) ?? loader.getNearest(a);
    if (!imgA) {
      lastFrame = true;
      return;
    }
    lastFrame = false;
    const imgB = mix > 0.001 && b !== a ? loader.get(b) : null;
    renderer.draw(imgA, imgB, mix);
  };
  requestAnimationFrame(loop);

  /* visibility suspension */
  const visibilityTrigger = ScrollTrigger.create({
    trigger: root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      const off = !self.isActive;
      loader.setSuspended(off);
      if (!off) lastFrame = true;
    },
  });

  /* lifestyle preload */
  ScrollTrigger.create({
    trigger: root,
    start: () => `top top-=${(root.offsetHeight - window.innerHeight) * k(O)}`,
    invalidateOnRefresh: true,
    onEnter: () => onNearLifestyle?.(),
  });

  /* master scrub */
  const master = gsap.timeline({
    scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: true },
    defaults: { ease: "none" },
  });

  master.to({}, { duration: TIME_SCALE }, 0);
  master.to("[data-opening-hint]", { opacity: 0, y: 12, duration: 0.028, ease: "power1.in" }, 0);
  master.to(
    "[data-opening-hero]",
    { yPercent: -9, scale: 1.035, opacity: 0, filter: "blur(5px)", duration: 0.085, ease: "power2.in" },
    0.02,
  );
  master.to("[data-opening-scrim]", { opacity: 0, duration: 0.105 }, 0.02);

  master.fromTo("[data-cb-veil]", { opacity: 0 }, { opacity: 1, duration: I(0, 0.36), ease: "power2.in" }, F(0));
  master.fromTo(
    "[data-opening-canvas]",
    { scale: 1, filter: "blur(0px)" },
    { scale: reduced ? 1.008 : 1.055, filter: `blur(${reduced ? 0 : 6}px)`, duration: I(0, 0.5), ease: "power1.in" },
    F(0),
  );
  master.to(
    "[data-opening-canvas]",
    { scale: 1, filter: "blur(0px)", duration: I(0.5, 1), ease: "power1.out" },
    F(0.5),
  );
  master.fromTo("[data-cb-field]", { opacity: 0 }, { opacity: 1, duration: I(0.1, 0.4) }, F(0.1));
  master.fromTo(
    "[data-cb-rule]",
    { scaleY: 0 },
    { scaleY: 1, duration: I(0.12, 0.5), stagger: I(0, 0.035), ease: "power2.out" },
    F(0.12),
  );
  master.fromTo("[data-cb-type]", { opacity: 0 }, { opacity: 1, duration: I(0.16, 0.36) }, F(0.16));
  master.fromTo(
    "[data-cb-line]",
    { yPercent: 116, y: 0 },
    { yPercent: 0, y: 0, duration: I(0.18, 0.54), stagger: I(0, 0.05), ease: "power3.out" },
    F(0.18),
  );
  master.fromTo("[data-cb-hrule]", { scaleX: 0 }, { scaleX: 1, duration: I(0.3, 0.58), ease: "power2.out" }, F(0.3));
  master.fromTo(
    "[data-cb-meta]",
    { opacity: 0, y: 14 },
    { opacity: 1, y: 0, duration: I(0.34, 0.6), ease: "power2.out" },
    F(0.34),
  );
  master.fromTo(
    "[data-cb-sweep]",
    { xPercent: -135, x: 0 },
    { xPercent: 135, x: 0, duration: I(0.2, 0.84), ease: "none" },
    F(0.2),
  );
  master.fromTo("[data-cb-sweep]", { opacity: 0 }, { opacity: reduced ? 0 : 1, duration: I(0.2, 0.34) }, F(0.2));
  master.to("[data-cb-sweep]", { opacity: 0, duration: I(0.66, 0.84) }, F(0.66));
  master.to(
    "[data-cb-type]",
    { opacity: 0, y: -18, filter: "blur(3px)", duration: I(0.66, 0.9), ease: "power2.in" },
    F(0.66),
  );
  master.to("[data-cb-field]", { opacity: 0, duration: I(0.64, 0.94), ease: "power2.in" }, F(0.64));
  master.to("[data-cb-veil]", { opacity: 0, duration: I(0.62, 1), ease: "power2.out" }, F(0.62));

  master.fromTo("[data-why-dubai]", { opacity: 0 }, { opacity: 1, duration: 0.06, ease: "power2.out" }, 0.58);
  master.fromTo(
    "[data-why-panel]",
    { clipPath: "inset(0% 100% 0% 0%)", opacity: 0 },
    { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, duration: 0.09, ease: "power3.out" },
    0.575,
  );
  master.fromTo("[data-why-heading]", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.08, ease: "power3.out" }, 0.58);
  master.fromTo("[data-why-body]", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.08, ease: "power3.out" }, 0.62);
  master.to("[data-why-dubai]", { opacity: 0, y: -20, duration: 0.06, ease: "power2.in" }, 0.74);
  master.fromTo("[data-tallest-eyebrow]", { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "power2.out" }, 0.78);
  master.fromTo("[data-tallest-rule]", { scaleX: 0 }, { scaleX: 1, duration: 0.06, ease: "power2.out" }, 0.8);
  master.fromTo("[data-tallest-heading]", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.08, ease: "power3.out" }, 0.8);
  master.fromTo("[data-tallest-sub]", { opacity: 0 }, { opacity: 1, duration: 0.05, ease: "power2.out" }, 0.85);
  master.fromTo("[data-tallest]", { opacity: 1 }, { opacity: 0, duration: 0.05, ease: "power2.in" }, 0.92);
  master.to(root, { "--fx-in": 1, duration: (C.explorerInEnd - C.explorerInStart) * 0.7 }, C.explorerInStart);

  /* entrance reveal, fired when first frame + building still are ready */
  const building = new Image();
  let buildingReady = false;
  const buildingPromise = new Promise((resolve) => {
    building.onload = () => {
      buildingReady = true;
      resolve(true);
    };
    building.onerror = () => resolve(false);
    building.src = "/assets/opening/building/final-frame.webp";
  });

  let fontsReady = document.fonts?.status === "loaded";
  const fontPromise = fontsReady
    ? Promise.resolve(true)
    : Promise.race([
        document.fonts?.ready.then(() => true) ?? Promise.resolve(true),
        new Promise((resolve) => window.setTimeout(() => resolve(false), 4000)),
      ]).then((v) => {
        fontsReady = true;
        return v;
      });

  let firstFrame = false;
  let revealed = false;
  const reveal = () => {
    if (revealed || !firstFrame || !fontsReady || !buildingReady) return;
    revealed = true;
    const tl = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.4 });
    tl.fromTo("[data-opening-line]", { yPercent: 140, y: 0 }, { yPercent: 0, y: 0, duration: 1.55, stagger: 0.16 })
      .fromTo("[data-opening-rule]", { scaleX: 0 }, { scaleX: 1, duration: 1.5, ease: "power2.out" }, 0.62)
      .fromTo("[data-opening-tagline]", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 1.25 }, 0.8)
      .fromTo("[data-opening-brand]", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1.15 }, 1.02)
      .fromTo("[data-opening-hint-inner]", { opacity: 0 }, { opacity: 1, duration: 1.1 }, 1.2);
  };

  /* first frame readiness is polled cheaply */
  const readyPoll = window.setInterval(() => {
    if (loader.firstFrameReady()) {
      firstFrame = true;
      window.clearInterval(readyPoll);
      meter?.setAttribute("data-primed", "");
      reveal();
    }
  }, 100);
  buildingPromise.then(() => {
    ScrollTrigger.refresh();
    reveal();
  });
  fontPromise.then(() => reveal());

  const openingLoader = createLoaderBridge();

  function createLoaderBridge() {
    let bridge = null;
    import("./loader.js").then(({ createLoader }) => {
      bridge = createLoader({
        ready: () => firstFrame && fontsReady && loader.criticalReady(),
        minimum: () => firstFrame && fontsReady,
        onReveal: () => {
          root.setAttribute("data-primed", "");
        },
        onDone: () => {},
      });
    });
    return {
      setProgress(p) {
        bridge?.setProgress(p);
      },
    };
  }

  /* performance guard: if the film can't keep up, stand it down */
  const guard = (now) => {
    if (!jankTimer) return;
    const delta = now - (guard.last ?? now);
    guard.last = now;
    if (delta > 55 && delta < 400) {
      stalled += 1;
      if (stalled >= 40) {
        suspended = true;
        loader.setSuspended(true);
        console.warn(
          "Reposé: this device cannot keep up with the approach film; the rest of it has been stood down so the page stays responsive.",
        );
      }
    } else if (delta <= 55) {
      stalled = Math.max(0, stalled - 1);
    }
    requestAnimationFrame(guard);
  };
  requestAnimationFrame(guard);

  /* wire interactive chapters */
  let fx = null;
  import("./fx.js").then(({ initFx }) => {
    fx = initFx({ active: () => active, onTerrace });
    fx.setActive(active);
  });
  import("./rc.js").then(({ initRc }) => initRc({ onExplore }));

  return { loader, renderer, trigger, master };
}
