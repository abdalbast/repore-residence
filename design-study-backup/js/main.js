/* Entry point: boots smooth scroll, cursor, opening, and lazy chapters. */

import { gsap, ScrollTrigger, initLenis, getLenis, scrollToY, offsetTop, softLock, reducedMotion } from "./core.js";
import { initOpening } from "./opening.js";

window.history.scrollRestoration = "manual";
window.scrollTo(0, 0);

const lenis = initLenis();

/* ---------- cursor label ---------- */
function initCursor() {
  const label = document.querySelector(".cursor-label");
  const text = label?.querySelector(".cursor-label__text");
  if (!label || !text) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const pos = { x: 0, y: 0 };
  let raf = 0;
  const paint = () => {
    raf = 0;
    label.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  };
  const onMove = (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    if (!raf) raf = requestAnimationFrame(paint);
    const target = e.target instanceof Element ? e.target.closest("[data-cursor]") : null;
    const next = target?.dataset.cursor?.trim() || null;
    label.toggleAttribute("data-shown", !!next);
    if (text.textContent !== (next ?? "")) text.textContent = next ?? "";
  };
  const clear = () => label.removeAttribute("data-shown");
  document.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerdown", clear, { passive: true });
  window.addEventListener("blur", clear);
}

/* ---------- lifestyle lazy chapter ---------- */
let lifestylePromise = null;
let lifestyleLoaded = false;
function loadLifestyle() {
  if (!lifestylePromise) {
    lifestylePromise = import("./lifestyle.js")
      .then((mod) => mod.initLifestyle())
      .then(() => {
        lifestyleLoaded = true;
        ScrollTrigger.refresh();
        return true;
      })
      .catch((err) => {
        console.error("Reposé: the lifestyle chapter could not be loaded", err);
        lifestylePromise = null;
        return false;
      });
  }
  return lifestylePromise;
}

const scrollToLifestyle = () => {
  const root = document.querySelector("[data-repose-root]");
  if (!root) return false;
  getLenis()?.resize();
  ScrollTrigger.refresh();
  scrollToY(offsetTop(root), 1.4);
  return true;
};

function onExplore() {
  if (scrollToLifestyle()) return;
  loadLifestyle().then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => scrollToLifestyle()));
  });
}

/* ---------- terrace overlay ---------- */
let terraceLoaded = false;
function onTerrace() {
  if (terraceLoaded) return;
  import("./terrace.js")
    .then(({ initTerrace }) => {
      terraceLoaded = true;
      initTerrace({ onReturn: () => {} });
    })
    .catch((err) => console.error("Reposé: the terrace could not be loaded", err));
}

/* ---------- boot ---------- */
initCursor();

initOpening({
  onNearLifestyle: () => loadLifestyle(),
  onExplore,
  onTerrace,
});

/* refresh after fonts land so measurements settle */
if (document.fonts?.ready) {
  document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
    getLenis()?.resize();
  });
}
window.addEventListener("load", () => {
  ScrollTrigger.refresh();
  getLenis()?.resize();
});
