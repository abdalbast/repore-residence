/* Reception journey: the camera walks to the doors and passes inside. */

import { gsap, ScrollTrigger, clamp, reducedMotion, coverFit, scrollToY } from "./core.js";
import { D, O, k, TIME_SCALE, WINDOW, WINDOW_SPAN } from "./film.js";

const FILM = { width: 2940, height: 1912 };
const RECEPTION = { width: 8000, height: 3523 };
const FRAME = { x: 1910.5 / 2940, y: 1648 / 1912 };
const SUB = {
  portal: [1780, 1515, 2070, 1723],
  opening: [1859, 1591, 1962, 1723],
  leftLeaf: [1859, 1591, 1912, 1723],
  rightLeaf: [1912, 1591, 1962, 1723],
};
const T = {
  walk: 2.8,
  doorsAt: 1.7,
  doors: 1.15,
  thresholdAt: 2.4,
  threshold: 0.45,
  arrive: 2.8,
  settle: 1.3,
  backAt: 3.7,
  welcomeAt: 4.25,
  exploreAt: 4.7,
};
const DURATION = T.exploreAt + 0.9;
const INSIDE_AT = (T.arrive + 0.35) / DURATION;
const SETTLE_GROWTH = 0.045;
const OVERSCALE = 1.35;

export function initRc({ onExplore } = {}) {
  const root = document.querySelector("[data-rc-root]");
  if (!root) return;
  const camera = root.querySelector("[data-rc-camera]");
  const film = root.querySelector("[data-rc-film]");
  const still = root.querySelector("[data-rc-still]");
  const through = root.querySelector("[data-rc-through]");
  const throughImg = through?.querySelector("img");
  const aperture = root.querySelector("[data-rc-aperture]");
  const leftLeaf = root.querySelector('[data-rc-leaf="left"]');
  const rightLeaf = root.querySelector('[data-rc-leaf="right"]');
  const streak = root.querySelector("[data-rc-streak]");
  const vignette = root.querySelector("[data-rc-vignette]");
  const bloom = root.querySelector("[data-rc-bloom]");
  const inside = root.querySelector("[data-rc-inside]");
  const insideImg = inside?.querySelector("img");
  const back = root.querySelector("[data-rc-back]");
  const explore = root.querySelector("[data-rc-explore]");

  const reduced = reducedMotion();
  let layout = null;
  let phase = "idle";
  let visible = false;
  let master = null;
  let prepared = false;

  const rect = (r) => ({ x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1] });
  const setRect = (el, r) => {
    if (!el || !r) return;
    el.style.left = `${r.x}px`;
    el.style.top = `${r.y}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
  };

  const measure = () => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const stillRect = coverFit(root, FILM.width, FILM.height, 0.5, 0.5);
    const stillScale = stillRect.width / FILM.width;
    const scale = (r) => ({
      x: stillRect.x + r[0] * stillScale,
      y: stillRect.y + r[1] * stillScale,
      width: (r[2] - r[0]) * stillScale,
      height: (r[3] - r[1]) * stillScale,
    });
    const portal = scale(SUB.portal);
    const opening = scale(SUB.opening);
    const left = scale(SUB.leftLeaf);
    const right = scale(SUB.rightLeaf);
    const target = {
      x: stillRect.x + FRAME.x * FILM.width * stillScale,
      y: stillRect.y + FRAME.y * FILM.height * stillScale,
    };
    const centre = { x: vw / 2, y: vh / 2 };
    const receptionScale = Math.max(vw / RECEPTION.width, vh / RECEPTION.height) * OVERSCALE;
    const reception = {
      x: (vw - RECEPTION.width * receptionScale) / 2,
      y: (vh - RECEPTION.height * receptionScale) / 2,
      width: RECEPTION.width * receptionScale,
      height: RECEPTION.height * receptionScale,
    };
    const throughScale = receptionScale / 7;
    const throughRect = {
      x: centre.x + (target.x - centre.x) / 7 - (RECEPTION.width * throughScale) / 2,
      y: centre.y + (target.y - centre.y) / 7 - (RECEPTION.height * throughScale) / 2,
      width: RECEPTION.width * throughScale,
      height: RECEPTION.height * throughScale,
    };
    const perspective = 420 * stillScale;
    const perspectiveOrigin = {
      x: `${(((target.x - opening.x) / opening.width) * 100).toFixed(2)}%`,
      y: `${(((target.y - opening.y) / opening.height) * 100).toFixed(2)}%`,
    };
    layout = { stillRect, stillScale, portal, opening, left, right, target, centre, reception, throughRect, perspective, perspectiveOrigin };
    paint();
  };

  const paint = () => {
    if (!layout) return;
    setRect(film, layout.stillRect);
    setRect(still, layout.stillRect);
    setRect(through, layout.throughRect);
    if (throughImg) {
      throughImg.style.width = `${layout.throughRect.width}px`;
      throughImg.style.height = `${layout.throughRect.height}px`;
    }
    setRect(aperture, layout.opening);
    if (aperture) {
      aperture.style.perspective = `${layout.perspective}px`;
      aperture.style.perspectiveOrigin = `${layout.perspectiveOrigin.x} ${layout.perspectiveOrigin.y}`;
    }
    setRect(streak, layout.portal);
    const leafStyle = (el, leaf) => {
      if (!el) return;
      el.style.left = `${leaf.x - layout.opening.x}px`;
      el.style.top = `${leaf.y - layout.opening.y}px`;
      el.style.width = `${leaf.width}px`;
      el.style.height = `${leaf.height}px`;
      el.style.transformOrigin = leaf === layout.left ? "0% 50%" : "100% 50%";
      el.style.backgroundImage = "url(/assets/reception-entry/building-final.webp)";
      el.style.backgroundSize = `${layout.stillRect.width}px ${layout.stillRect.height}px`;
      el.style.backgroundPosition = `${layout.stillRect.x - leaf.x}px ${layout.stillRect.y - leaf.y}px`;
    };
    leafStyle(leftLeaf, layout.left);
    leafStyle(rightLeaf, layout.right);
    if (insideImg) {
      insideImg.style.width = `${layout.reception.width}px`;
      insideImg.style.height = `${layout.reception.height}px`;
      insideImg.style.left = `${layout.reception.x}px`;
      insideImg.style.top = `${layout.reception.y}px`;
    }
    morph();
  };

  const state = { walk: 0, open: 0, settle: 0 };

  const morph = () => {
    if (!layout) return;
    const p = 1 + SETTLE_GROWTH * state.settle;
    const m = Math.pow(7, state.walk) * p;
    const h = 1 - Math.pow(1 - state.walk, 1.6);
    const g = layout.target.x + (layout.stillRect.x - layout.target.x) * m;
    const yy = layout.target.y + (layout.stillRect.y - layout.target.y) * m;
    const x = clamp(
      (layout.centre.x - layout.target.x) * h,
      window.innerWidth - (g + layout.stillRect.width * m),
      -g,
    );
    const y = clamp(
      (layout.centre.y - layout.target.y) * h,
      window.innerHeight - (yy + layout.stillRect.height * m),
      -yy,
    );
    if (camera) {
      camera.style.transformOrigin = `${layout.target.x}px ${layout.target.y}px`;
      camera.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${m.toFixed(4)})`;
    }
    if (inside) {
      inside.style.transform = `scale(${p.toFixed(4)})`;
    }
    if (through) {
      const inset = (1 - state.open) * 24;
      through.style.clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;
    }
  };

  const prepare = () => {
    if (prepared || !layout) return;
    prepared = true;
    master = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    if (reduced) {
      master
        .fromTo(inside, { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power1.inOut" }, 0.1)
        .fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 1)
        .fromTo("[data-rc-welcome]", { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.3)
        .fromTo(explore, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.6);
      return;
    }
    master
      .to(still, { opacity: 1, duration: 0.3, ease: "power1.inOut" }, 0)
      .to(state, { walk: 1, duration: T.walk, ease: "power1.inOut", onUpdate: morph }, 0)
      .to(leftLeaf, { x: () => layout.opening.width, duration: T.doors, ease: "power2.inOut" }, T.doorsAt)
      .to(rightLeaf, { x: () => -layout.opening.width, duration: T.doors, ease: "power2.inOut" }, T.doorsAt)
      .to(state, { open: 1, duration: T.threshold, ease: "power2.in", onUpdate: morph }, T.thresholdAt)
      .fromTo(streak, { opacity: 0, xPercent: -30 }, { opacity: 0.3, xPercent: 20, duration: 0.32, ease: "sine.inOut" }, 2.35)
      .to(streak, { opacity: 0, xPercent: 60, duration: 0.3, ease: "sine.in" }, 2.65)
      .to("[data-rc-exterior]", { filter: "blur(0.6px)", duration: 0.35, ease: "power1.in" }, 2.45)
      .fromTo(vignette, { opacity: 0 }, { opacity: 0.55, duration: 0.3, ease: "sine.in" }, 2.45)
      .fromTo(bloom, { opacity: 0 }, { opacity: 0.5, duration: 0.32, ease: "sine.in" }, 2.5)
      .to(inside, { opacity: 1, duration: 0.25, ease: "power1.inOut" }, T.arrive)
      .to(camera, { opacity: 0, duration: 0.2 }, 3)
      .to(bloom, { opacity: 0, duration: 0.6, ease: "sine.out" }, T.arrive)
      .to(vignette, { opacity: 0, duration: 0.7, ease: "sine.out" }, T.arrive)
      .to(state, { settle: 1, duration: T.settle, ease: "power2.out", onUpdate: morph }, T.arrive)
      .fromTo(back, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, T.backAt)
      .fromTo("[data-rc-welcome]", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, T.welcomeAt)
      .fromTo(explore, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out" }, T.exploreAt);
  };

  const setPhase = (next) => {
    if (next === phase) return;
    phase = next;
    root.setAttribute("data-phase", next);
    if (back) back.tabIndex = next === "idle" ? -1 : 0;
    if (explore) explore.tabIndex = next === "idle" ? -1 : 0;
    root.setAttribute("aria-hidden", String(next === "idle"));
  };

  const sync = (progress) => {
    if (!master) prepare();
    if (!master) return;
    const r = clamp((progress * TIME_SCALE - WINDOW.start) / WINDOW_SPAN);
    master.progress(r);
    setPhase(r <= 0 ? "idle" : r >= INSIDE_AT ? "inside" : "entering");
  };

  const trigger = ScrollTrigger.create({
    trigger: "[data-opening-root]",
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (!prepared && self.progress > 0.05) prepare();
      sync(self.progress);
    },
    onRefresh: (self) => sync(self.progress),
  });
  ScrollTrigger.create({
    trigger: "[data-opening-root]",
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      visible = self.isActive;
    },
  });

  const goBack = () => {
    const section = document.querySelector("[data-opening-root]");
    if (!section) return;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    scrollToY(top + span * k(D), 2.6 / 1.35);
  };
  back?.addEventListener("click", goBack);
  explore?.addEventListener("click", () => onExplore?.());
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && phase !== "idle" && visible) goBack();
  });

  measure();
  ScrollTrigger.addEventListener("refresh", measure);
  const ro = new ResizeObserver(measure);
  ro.observe(root);

  const prime = Promise.race([
    new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = "/assets/reception-entry/reception-final.webp";
    }),
    new Promise((resolve) => window.setTimeout(resolve, 3000)),
  ]);
  prime.then(() => {
    prepare();
    sync(trigger.progress);
  });

  return { sync, measure };
}
