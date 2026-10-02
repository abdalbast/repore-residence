/* Shared runtime: smooth scroll, scroll locking, math helpers. */

export const gsap = window.gsap;
export const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => t * t * (3 - 2 * t);

/* cover-fit an image inside a container, with focal point */
export function coverFit(container, imgW, imgH, fx = 0.5, fy = 0.5) {
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const scale = Math.max(cw / imgW, ch / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return { x: (cw - w) * fx, y: (ch - h) * fy, width: w, height: h, containerWidth: cw, containerHeight: ch };
}

/* ---- smooth scroll ---- */
let lenis = null;
let lockCount = 0;
let lockedY = 0;

export function initLenis() {
  if (lenis || reducedMotion()) return null;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  lenis = new window.Lenis({
    lerp: coarse ? 0.1 : 0.08,
    wheelMultiplier: 1.15,
    touchMultiplier: coarse ? 1 : 1.4,
    smoothWheel: true,
    syncTouch: false,
  });
  lenis.on("scroll", () => ScrollTrigger.update());
  const onRefresh = () => lenis.resize();
  ScrollTrigger.addEventListener("refresh", onRefresh);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  window.__reposeLenis = lenis;
  return lenis;
}

export function getLenis() {
  return lenis;
}

const scrollBlockKeys = new Set([
  " ",
  "Spacebar",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  "ArrowUp",
  "ArrowDown",
]);

function blockKey(e) {
  if (!scrollBlockKeys.has(e.key)) return;
  const path = e.composedPath ? e.composedPath() : [];
  if (path.some((el) => el instanceof Element && el.hasAttribute("data-scroll-lock-allow"))) return;
  e.preventDefault();
}

export function lockScroll() {
  lockCount += 1;
  if (lockCount !== 1) return;
  lockedY = window.scrollY;
  lenis?.stop();
  document.documentElement.classList.add("scroll-locked");
  window.addEventListener("wheel", preventScroll, { passive: false, capture: true });
  window.addEventListener("touchmove", preventScroll, { passive: false, capture: true });
  window.addEventListener("keydown", blockKey, true);
}

function preventScroll(e) {
  const path = e.composedPath ? e.composedPath() : [];
  if (path.some((el) => el instanceof Element && el.hasAttribute("data-scroll-lock-allow"))) return;
  if (e.cancelable) e.preventDefault();
  window.scrollTo(0, lockedY);
}

export function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount !== 0) return;
  document.documentElement.classList.remove("scroll-locked");
  window.removeEventListener("wheel", preventScroll, true);
  window.removeEventListener("touchmove", preventScroll, true);
  window.removeEventListener("keydown", blockKey, true);
  lenis?.start();
}

/* soft lock: absorb wheel momentum for a moment after a jump */
export function softLock(ms = 2000) {
  lockScroll();
  let timer = null;
  const release = () => {
    if (timer) window.clearTimeout(timer);
    timer = null;
    window.removeEventListener("wheel", onInput, { capture: true });
    window.removeEventListener("touchmove", onInput, { capture: true });
    window.removeEventListener("scroll", onInput, { capture: true });
    unlockScroll();
  };
  const onInput = () => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(release, 160);
  };
  window.addEventListener("wheel", onInput, { passive: true, capture: true });
  window.addEventListener("touchmove", onInput, { passive: true, capture: true });
  window.addEventListener("scroll", onInput, { passive: true, capture: true });
  timer = window.setTimeout(release, ms);
}

/* smooth scroll to a document offset */
export function scrollToY(y, duration = 1.15) {
  if (lenis) {
    lenis.scrollTo(y, { duration });
  } else {
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

export function instantToY(y) {
  lenis?.stop();
  window.scrollTo(0, y);
  requestAnimationFrame(() => lenis?.start());
}

/* element offset from top of document */
export function offsetTop(el) {
  return el.getBoundingClientRect().top + window.scrollY;
}

/* attention dots */
export function attnDots() {
  const span = document.createElement("span");
  span.className = "attn";
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = "<i></i><i></i><i></i><i></i>";
  return span;
}

/* image preloader with concurrency */
export function preloadImages(sources, concurrency = 4) {
  return new Promise((resolve) => {
    let index = 0;
    let done = 0;
    if (!sources.length) return resolve([]);
    const load = () => {
      const i = index++;
      if (i >= sources.length) return;
      const img = new Image();
      const finish = () => {
        done += 1;
        if (done === sources.length) resolve(sources);
        else load();
      };
      img.onload = finish;
      img.onerror = finish;
      img.src = sources[i];
    };
    for (let i = 0; i < Math.min(concurrency, sources.length); i++) load();
  });
}

export { ScrollTrigger as ST };
