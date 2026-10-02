/* Opening loader — the arch draws itself while frames arrive. */

import { gsap, lockScroll, unlockScroll, reducedMotion } from "./core.js";

const GROUND = "M14 262 H206";
const OUTER = "M56 262 V128 A54 54 0 0 1 164 128 V262";
const INNER = "M70 262 V140 A40 40 0 0 1 150 140 V262";
const FLOOR = 262;
const LIFT = 172;

export function createLoader({ ready, minimum, onReveal, onDone }) {
  const root = document.querySelector("[data-opening-loader]");
  if (!root) return { setProgress() {} };
  const pct = root.querySelector("[data-ol-pct]");
  const plate = root.querySelector("[data-ol-plate]");
  const rise = root.querySelector("[data-ol-rise]");
  const level = root.querySelector("[data-ol-level]");
  const progress = { value: 0 };
  let maxProgress = 0;
  let revealed = false;
  let released = false;
  let exitTimeline = null;

  lockScroll();

  const setProgress = (value, duration = 0.7) => {
    maxProgress = Math.max(maxProgress, Math.min(1, Math.max(0, value)));
    gsap.to(progress, {
      value: maxProgress,
      duration,
      ease: "power2.out",
      overwrite: true,
      onUpdate: () => {
        const v = progress.value;
        gsap.set(rise, { scaleY: v, svgOrigin: `110 ${FLOOR}` });
        gsap.set(level, { y: -LIFT * v });
        if (pct) pct.textContent = String(Math.round(v * 100)).padStart(2, "0");
      },
    });
  };

  const reduce = reducedMotion();
  const intro = gsap.timeline({ defaults: { ease: "power2.inOut" } });
  if (reduce) {
    gsap.set("[data-ol-draw]", { strokeDashoffset: 0, opacity: 1 });
    gsap.set("[data-ol-meta], [data-ol-foot]", { opacity: 1, y: 0 });
  } else {
    intro
      .to("[data-ol-ground]", { strokeDashoffset: 0, opacity: 1, duration: 0.85 }, 0)
      .to("[data-ol-outer]", { strokeDashoffset: 0, opacity: 1, duration: 1.5 }, 0.14)
      .to("[data-ol-inner]", { strokeDashoffset: 0, opacity: 1, duration: 1.4 }, 0.34)
      .to("[data-ol-meta]", { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 0.2)
      .to("[data-ol-foot]", { opacity: 1, y: 0, duration: 0.9, ease: "power2.out" }, 0.42);
  }

  const started = performance.now();
  const exit = () => {
    if (revealed) return;
    revealed = true;
    if (!released) {
      released = true;
      unlockScroll();
    }
    onReveal?.();
    if (reduce) {
      exitTimeline = gsap
        .timeline({ onComplete: () => finish() })
        .to(root, { opacity: 0, duration: 0.4, ease: "power1.out" });
      return;
    }
    setProgress(1, 0.34);
    exitTimeline = gsap.timeline({ defaults: { ease: "power2.inOut" }, onComplete: () => finish() });
    exitTimeline
      .to("[data-ol-meta], [data-ol-foot]", { opacity: 0, y: -8, duration: 0.4, ease: "power2.in" }, 0)
      .to(plate, { scale: 2.15, opacity: 0, duration: 0.92 }, 0.12)
      .to(root, { opacity: 0, duration: 0.54, ease: "power1.inOut" }, 0.4);
  };

  const finish = () => {
    root.remove();
    onDone?.();
  };

  const timer = window.setInterval(() => {
    const elapsed = performance.now() - started;
    if (elapsed < 1700) return;
    if (ready() || (minimum() && elapsed >= 4500) || elapsed >= 15000) {
      window.clearInterval(timer);
      exit();
    }
  }, 100);

  return {
    setProgress,
    destroy() {
      window.clearInterval(timer);
      exitTimeline?.kill();
      if (!released) {
        released = true;
        unlockScroll();
      }
      root.remove();
    },
    paths: { GROUND, OUTER, INNER },
  };
}
