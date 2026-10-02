/* Opening film: frame manifest, progressive loader, canvas renderer.
   Sequence layout and scrub mapping mirror the reference architecture:
   200 approach frames + 240 ascent frames = 440, crossfaded at the seam. */

import { clamp, lerp, smoothstep } from "./core.js";

export const SEQ_01 = 200;
export const SEQ_02 = 240;
export const TOTAL = SEQ_01 + SEQ_02;
export const LAST = TOTAL - 1;
export const FIRST_LAST = SEQ_01 - 1;

const framePath = (seq, n) =>
  `/assets/opening/${seq}/webp/frame-${String(n).padStart(4, "0")}.webp`;

export const FRAMES = [
  ...Array.from({ length: SEQ_01 }, (_, i) => framePath("sequence-01", i + 1)),
  ...Array.from({ length: SEQ_02 }, (_, i) => framePath("sequence-02", i + 1)),
];

export const FINAL_FRAME = {
  src: "/assets/opening/building/final-frame.webp",
  width: 1920,
  height: 1080,
};

/* scroll-time helpers (identical structure to the reference) */
export const TIME_SCALE = 1280 / 620;
export const S = (e) => 1 + e / 620;
export const k = (e) => e / TIME_SCALE;
export const C = {
  copyOutStart: S(50),
  copyOutEnd: S(105),
  explorerInStart: S(25),
  explorerInEnd: S(95),
  activeAt: S(80),
};
export const WINDOW = { start: S(260), end: S(600) };
export const WINDOW_SPAN = WINDOW.end - WINDOW.start;
export const E = S(120);
export const D = S(220);
export const O = S(150);

const N = { start: 0.408, end: 0.512 };
const P = N.end - N.start;
export const F = (e) => N.start + P * e;
export const I = (a, b) => (b - a) * P;
const L = 0.44;
const R = 0.62;
const Z = 0.9;

export function frameMix(t) {
  const v = clamp(t);
  if (v <= N.start) return pair(lerp(0, FIRST_LAST, v / N.start));
  if (v < N.end) {
    const e = (v - N.start) / P;
    if (e <= L) return { a: FIRST_LAST, b: FIRST_LAST, mix: 0 };
    if (e >= R) return { a: SEQ_01, b: SEQ_01, mix: 0 };
    return { a: FIRST_LAST, b: SEQ_01, mix: smoothstep((e - L) / 0.18) };
  }
  if (v >= Z) return { a: LAST, b: LAST, mix: 0 };
  return pair(lerp(SEQ_01, LAST, (v - N.end) / (Z - N.end)));
}

function pair(e) {
  const a = Math.floor(e);
  return { a, b: Math.min(LAST, a + 1), mix: e - a };
}

export const CRITICAL_COUNT = 24 + Math.round((TOTAL - 24) / 4);

/* ---- progressive loader ---- */
export function createFrameLoader(images, { criticalCount = 0, onProgress, onCritical } = {}) {
  const total = images.length;
  const cache = new Array(total).fill(null);
  const state = new Uint8Array(total);
  const warmed = new Uint8Array(total);
  const IDLE = 0;
  const LOADING = 1;
  const LOADED = 2;
  const FAILED = 3;
  const critical = Math.min(criticalCount, total);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const conn = navigator.connection;
  const slow =
    conn?.saveData === true || ["2g", "slow-2g", "3g"].includes(conn?.effectiveType);
  const weak =
    (typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
    (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4) ||
    slow;
  const profile = !coarse && !slow
    ? { stride: 1, concurrency: 12, warmAhead: 24, warmBudget: 6 }
    : { stride: weak ? 5 : 3, concurrency: weak ? 2 : 3, warmAhead: weak ? 4 : 6, warmBudget: 1 };

  let inFlight = 0;
  let loaded = 0;
  let failed = 0;
  let criticalLoaded = 0;
  let criticalDone = false;
  let suspended = false;
  let destroyed = false;
  let hidden = document.visibilityState === "hidden";
  let priority = 0;
  let eager = true;
  const pending = new Set();
  const criticalTarget = Math.max(1, Math.round(critical / profile.stride));

  const nextIndex = () => {
    const head = Math.min(24, total);
    for (let i = 0; i < head; i += profile.stride) if (state[i] === IDLE) return i;
    for (const stride of [8, 4, 2, 1].filter((s) => s >= profile.stride)) {
      const anchor = Math.ceil(priority / stride) * stride;
      for (let i = anchor; i < total; i += stride) if (state[i] === IDLE) return i;
      for (let i = anchor - stride; i >= 0; i -= stride) if (state[i] === IDLE) return i;
    }
    return -1;
  };

  const finish = (i, img, ok) => {
    inFlight -= 1;
    pending.delete(img);
    if (destroyed) return;
    if (ok) {
      cache[i] = img;
      state[i] = LOADED;
      loaded += 1;
      onProgress?.(loaded / total);
    } else {
      state[i] = FAILED;
      failed += 1;
    }
    if (i === 0) firstReady = true;
    if (critical > 0) {
      criticalLoaded += 1;
      const p = Math.min(1, criticalLoaded / criticalTarget);
      if (p >= 1) criticalDone = true;
      onCritical?.(p);
    }
    pump();
  };

  const start = (i) => {
    state[i] = LOADING;
    inFlight += 1;
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = eager ? "high" : "auto";
    pending.add(img);
    img.onload = () => finish(i, img, true);
    img.onerror = () => finish(i, img, false);
    img.src = images[i];
  };

  const pump = () => {
    if (destroyed || suspended || hidden) return;
    while (inFlight < profile.concurrency) {
      const i = nextIndex();
      if (i < 0) return;
      start(i);
    }
  };

  let firstReady = false;
  start(0);
  pump();

  const onVisibility = () => {
    const nowHidden = document.visibilityState === "hidden";
    if (nowHidden !== hidden) {
      hidden = nowHidden;
      if (!hidden) pump();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  return {
    firstFrameReady: () => firstReady,
    criticalReady: () => criticalDone,
    loadedCount: () => loaded,
    total,
    progress: () => loaded / total,
    get(i) {
      const n = Math.round(i);
      return n >= 0 && n < total && state[n] === LOADED ? cache[n] : null;
    },
    getNearest(i) {
      const n = clamp(Math.round(i), 0, total - 1);
      if (state[n] === LOADED) return cache[n];
      for (let d = 1; d <= 14; d++) {
        const a = n - d;
        if (a >= 0 && state[a] === LOADED) return cache[a];
        const b = n + d;
        if (b < total && state[b] === LOADED) return cache[b];
      }
      return null;
    },
    setPriority(i) {
      const n = clamp(Math.round(i), 0, total - 1);
      if (n !== priority) {
        priority = n;
        pump();
      }
    },
    setEager(v) {
      eager = v;
    },
    setSuspended(v) {
      if (v === suspended) return;
      suspended = v;
      if (!suspended) pump();
    },
    warm(i) {
      let budget = profile.warmBudget;
      const n = Math.max(0, Math.round(i));
      for (let j = 0; j < profile.warmAhead && budget > 0; j += profile.stride) {
        const idx = n + j;
        if (idx >= total) break;
        if (state[idx] === LOADED && !warmed[idx]) {
          warmed[idx] = 1;
          budget -= 1;
          cache[idx]?.decode?.().catch(() => {});
        }
      }
    },
    destroy() {
      destroyed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      pending.forEach((img) => {
        img.onload = null;
        img.onerror = null;
        img.src = "";
      });
      pending.clear();
    },
  };
}

/* ---- canvas renderer ---- */
export function createFilmRenderer(canvas, { focalX = 0.5, focalY = 0.44 } = {}) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const state = { width: 0, height: 0, dpr: 1 };
  const current = { a: null, b: null, mix: 0 };

  const paint = (entry) => {
    const { a, b, mix } = entry;
    if (!a || !state.width) return;
    const draw = (img) => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh) return;
      const scale = Math.max(state.width / nw, state.height / nh);
      const w = nw * scale;
      const h = nh * scale;
      ctx.drawImage(img, (state.width - w) * focalX, (state.height - h) * focalY, w, h);
    };
    ctx.globalAlpha = 1;
    draw(a);
    if (b && b !== a && mix > 0.001) {
      ctx.globalAlpha = Math.min(1, mix);
      draw(b);
      ctx.globalAlpha = 1;
    }
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.6, 3200 / w);
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    state.width = w;
    state.height = h;
    state.dpr = dpr;
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "medium";
    paint(current);
  };

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  window.addEventListener("orientationchange", resize);

  return {
    draw(a, b, mix) {
      current.a = a;
      current.b = b;
      current.mix = mix;
      paint(current);
    },
    resize,
    destroy() {
      ro.disconnect();
      window.removeEventListener("orientationchange", resize);
    },
  };
}
