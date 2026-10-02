/* Residences explorer: tower selector → floorplate → residence. */

import { gsap, ScrollTrigger, clamp, lerp, coverFit, reducedMotion, lockScroll, unlockScroll } from "./core.js";

const TOP = { y: 7.59, left: 41.67, right: 53.93 };
const BOTTOM = { y: 69.17, left: 38.88, right: 56.35 };
const BAND_BASE = 71.97;
const CUE_CYCLE = 6400;
const CUE_THROTTLE = 1400;
const HOVER_DELAY = 140;
const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN = 520;

const bandAt = (y) => {
  const t = clamp((y - TOP.y) / (BOTTOM.y - TOP.y));
  return { left: lerp(TOP.left, BOTTOM.left, t), right: lerp(TOP.right, BOTTOM.right, t) };
};
const centerAt = (y) => {
  const b = bandAt(y);
  return (b.left + b.right) / 2;
};

function levelModel() {
  const data = window.REPOSE_FLOORS;
  const ids = data?.levels?.map((l) => l.id) ?? [];
  const sorted = [...ids].sort((a, b) => Number(b) - Number(a));
  const span = (BOTTOM.y - TOP.y) / 14;
  return sorted.map((id, i) => {
    const y = 10.28 + i * span;
    const b = bandAt(y);
    const units = data.units ? Object.values(data.units).filter((u) => u.id.startsWith(`l${id}-`)) : [];
    const types = [...new Set(units.map((u) => u.variant))];
    const available = units.filter((u) => !u.sold).length;
    return {
      id,
      y,
      top: i === 0 ? TOP.y : 10.28 + (i - 1) * span,
      left: b.left,
      right: b.right,
      units,
      types,
      available,
      sold: units.length > 0 && available === 0,
    };
  });
}

const AREAS = { "1-bedroom": "72 – 84 m²", "2-bedroom": "108 – 126 m²", "3-bedroom": "148 – 172 m²" };
const pretty = (v) => v.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function initFx({ active: isActive, onTerrace }) {
  const root = document.querySelector("[data-fx-root]");
  if (!root) return;
  const stage = root.querySelector("[data-fx-stage]");
  const tower = root.querySelector("[data-fx-tower]");
  const hits = root.querySelector("[data-fx-hits]");
  const line = root.querySelector("[data-fx-line]");
  const tag = root.querySelector("[data-fx-tag]");
  const ui = root.querySelector("[data-fx-ui]");
  const copy = root.querySelector("[data-fx-copy]");
  const readout = root.querySelector("[data-fx-readout]");
  const listOl = root.querySelector("[data-fx-list-ol]");
  const dim = root.querySelector("[data-fx-dim]");
  const scrim = root.querySelector("[data-fx-scrim]");
  const cue = root.querySelector("[data-fx-cue]");
  const cueArt = root.querySelector("[data-fx-cue-art]");
  const gate = root.querySelector("[data-fx-gate]");
  const gateSkip = root.querySelector("[data-fx-gate-skip]");
  const plate = root.querySelector("[data-fx-plate]");
  const plateHead = root.querySelector("[data-fx-plate-head]");
  const plateTitle = root.querySelector("[data-fx-plate-title]");
  const plateTypes = root.querySelector("[data-fx-plate-types]");
  const plateShared = root.querySelector("[data-fx-plate-shared]");
  const plateUnit = root.querySelector("[data-fx-plate-unit]");
  const plateArea = root.querySelector("[data-fx-plate-area]");
  const plateFigure = root.querySelector("[data-fx-plate-figure]");
  const plateImage = root.querySelector("[data-fx-plate-image]");
  const unitsSvg = root.querySelector("[data-fx-units]");
  const unitsSold = root.querySelector("[data-fx-units-sold]");
  const unitsTags = root.querySelector("[data-fx-units-tags]");
  const res = root.querySelector("[data-fx-res]");
  const resHead = root.querySelector("[data-fx-res-head]");
  const resEyebrow = root.querySelector("[data-fx-res-eyebrow]");
  const resTitle = root.querySelector("[data-fx-res-title]");
  const resVariant = root.querySelector("[data-fx-res-variant]");
  const resMeta = root.querySelector("[data-fx-res-meta]");
  const resArea = root.querySelector("[data-fx-res-area]");
  const resFigure = root.querySelector("[data-fx-res-figure]");
  const resImage = root.querySelector("[data-fx-res-image]");
  const resViewLabel = root.querySelector("[data-fx-res-view-label]");
  const resNote = root.querySelector("[data-fx-res-note]");

  const reduced = reducedMotion();
  const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const levels = levelModel();

  let layout = { x: 0, y: 0, width: 0, height: 0, containerWidth: 0, containerHeight: 0 };
  let mode = "selector";
  let revealed = false;
  let shown = null;
  let selected = null;
  let focusedUnit = null;
  let hoverTimer = null;
  let cueCycle = 0;
  let cueEngaged = false;
  let suspended = false;
  let gateAttempts = 0;
  let gateSkipFlag = false;
  let switching = false;
  let currentLevel = levels[0]?.id ?? "15";

  const syncCueVisibility = () => {
    const visible = isActive() && mode === "selector" && !cueEngaged;
    cue?.toggleAttribute("hidden", !visible);
    root.toggleAttribute("data-cue", visible);
  };

  const setMode = (next) => {
    mode = next;
    root.setAttribute("data-mode", next);
    syncCueVisibility();
  };

  /* ---------- layout ---------- */
  const layoutFigures = () => {
    const fit = (area, figure, iw, ih) => {
      if (!area || !figure) return;
      const w = area.clientWidth;
      const h = area.clientHeight;
      if (!w || !h) return;
      const scale = Math.min(w / iw, h / ih);
      const fw = iw * scale;
      const fh = ih * scale;
      figure.style.width = `${fw.toFixed(2)}px`;
      figure.style.height = `${fh.toFixed(2)}px`;
      figure.style.left = `${((w - fw) / 2).toFixed(2)}px`;
      figure.style.top = `${((h - fh) / 2).toFixed(2)}px`;
    };
    fit(plateArea, plateFigure, 1400, 900);
    fit(resArea, resFigure, 1200, 800);
  };

  const measure = () => {
    layout = coverFit(root, 1920, 1080, 0.5, 0.44);
    layoutFigures();
    const set = (el, x, y, w, h) => {
      if (!el) return;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    };
    set(stage, layout.x, layout.y, layout.width, layout.height);
    set(tower, layout.x, layout.y, layout.width, layout.height);
    const terraceCue = root.querySelector("[data-fx-terrace-cue]");
    if (terraceCue) {
      const cx = layout.x + (centerAt(TOP.y) / 100) * layout.width;
      const cy = layout.y + (((TOP.y + 4.2) / 2) / 100) * layout.height;
      terraceCue.style.setProperty("--fx-terrace-x", `${cx.toFixed(1)}px`);
      terraceCue.style.setProperty("--fx-terrace-y", `${cy.toFixed(1)}px`);
    }
    if (tower) {
      const p = (x, y) => `${x}% ${y}%`;
      tower.style.clipPath = `polygon(${p(TOP.left, TOP.y)}, ${p(TOP.right, TOP.y)}, ${p(BOTTOM.right, BOTTOM.y)}, ${p(BOTTOM.left, BOTTOM.y)})`;
    }
    buildHits();
    buildCue();
    if (shown) moveLine(shown, 0);
  };

  const hitRect = (level) => {
    const topY = layout.y + (level.top / 100) * layout.height;
    const lineY = layout.y + (level.y / 100) * layout.height;
    const x0 = layout.x + (level.left / 100) * layout.width;
    const x1 = layout.x + (level.right / 100) * layout.width;
    return { lineY, topY, x0, x1 };
  };

  const buildHits = () => {
    if (!hits || !layout.width) return;
    hits.innerHTML = "";
    const pad = layout.width * 0.02;
    levels.forEach((level) => {
      const r = hitRect(level);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fx-hit";
      button.dataset.level = level.id;
      button.dataset.cursor = `Open level ${level.id}`;
      button.setAttribute("aria-label", `Level ${level.id}`);
      button.tabIndex = -1;
      button.style.left = `${r.x0 - pad}px`;
      button.style.width = `${r.x1 - r.x0 + pad * 2}px`;
      button.style.top = `${r.topY}px`;
      button.style.height = `${r.lineY - r.topY}px`;
      button.addEventListener("pointerenter", () => scheduleHover(level));
      button.addEventListener("pointerleave", () => cancelHover());
      button.addEventListener("click", () => chooseLevel(level));
      hits.appendChild(button);
    });
  };

  const moveLine = (level, duration = 0.55) => {
    if (!level || !layout.width) return;
    const r = hitRect(level);
    const scale = (r.x1 - r.x0) / layout.containerWidth;
    const d = reduced ? 0 : duration;
    gsap.to(line, { x: r.x0, y: r.lineY, scaleX: scale, duration: d, ease: "power3.out", overwrite: "auto" });
    gsap.to(tag, { x: r.x0 - 14, y: r.lineY, xPercent: -100, yPercent: -50, duration: d, ease: "power3.out", overwrite: "auto" });
    gsap.to([line, tag], { opacity: 1, duration: 0.5, ease: "power2.out", delay: duration === 0 ? 0.02 : 0 });
    const top = r.topY;
    const bottom = r.lineY;
    const band = { top: parseFloat(dim.style.getPropertyValue("--fx-band-top")) || 0, bottom: parseFloat(dim.style.getPropertyValue("--fx-band-bottom")) || 0 };
    gsap.to(band, {
      top,
      bottom,
      duration: reduced ? 0 : 0.6,
      ease: "power3.out",
      onUpdate: () => {
        dim.style.setProperty("--fx-band-top", `${band.top}px`);
        dim.style.setProperty("--fx-band-bottom", `${band.bottom}px`);
      },
    });
    gsap.to(dim, { opacity: 1, duration: 0.6, ease: "power2.out" });
    renderReadout(level);
    updateListSelection(level);
    currentLevel = level.id;
  };

  const hideLine = () => {
    gsap.to([line, tag], { opacity: 0, duration: 0.35, ease: "power2.out" });
    gsap.to(dim, { opacity: 0, duration: 0.45 });
    gsap.to(readout, { opacity: 0, y: 6, duration: 0.3 });
  };

  const renderReadout = (level) => {
    if (!readout) return;
    const availability = level.sold ? "Fully sold" : `${level.available} available`;
    readout.innerHTML = `
      <span class="fx__readout-level">Level ${level.id}</span>
      <span class="fx__readout-types">${level.types.map(pretty).join(" · ")}</span>
      <span class="fx__readout-availability"${level.sold ? " data-fully-sold" : ""}>${availability}</span>`;
    gsap.fromTo(readout, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" });
  };

  /* ---------- level list ---------- */
  const buildList = () => {
    if (!listOl) return;
    listOl.innerHTML = "";
    levels.forEach((level) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "fx-level";
      button.dataset.level = level.id;
      button.setAttribute("aria-label", `Level ${level.id} — ${level.types.map(pretty).join(", ")}${level.sold ? " — fully sold" : ""}`);
      if (level.sold) button.classList.add("is-sold");
      button.innerHTML = `<span class="fx-level__rule"></span><span class="fx-level__number">${level.id}</span>`;
      button.addEventListener("pointerenter", () => scheduleHover(level));
      button.addEventListener("pointerleave", () => cancelHover());
      button.addEventListener("focus", () => scheduleHover(level));
      button.addEventListener("blur", () => cancelHover());
      button.addEventListener("click", () => chooseLevel(level));
      li.appendChild(button);
      listOl.appendChild(li);
    });
  };

  const updateListSelection = (level) => {
    listOl?.querySelectorAll(".fx-level").forEach((el) => {
      el.classList.toggle("is-shown", el.dataset.level === level.id);
      el.classList.toggle("is-selected", el.dataset.level === selected);
    });
  };

  const scheduleHover = (level) => {
    if (hoverTimer) window.clearTimeout(hoverTimer);
    if (mode !== "selector") return;
    shown = level;
    moveLine(level);
    if (coarse) return;
    hoverTimer = window.setTimeout(() => {
      hoverTimer = null;
    }, HOVER_DELAY);
  };
  const cancelHover = () => {
    if (hoverTimer) window.clearTimeout(hoverTimer);
    hoverTimer = null;
  };

  /* ---------- reveal ---------- */
  const reveal = () => {
    if (revealed) return;
    revealed = true;
    root.setAttribute("data-revealed", "");
    cue?.setAttribute("data-paused", "");
    const d = reduced ? 0 : 1;
    gsap.killTweensOf([ui, scrim, copy, line, tag, dim, readout, ...listOl.querySelectorAll(".fx-level")]);
    gsap.to(scrim, { opacity: 1, duration: 0.75 * d || 0.01, ease: "power2.out" });
    gsap.to(ui, { opacity: 1, duration: 0.3 * d || 0.01 });
    gsap.fromTo("[data-fx-reveal]", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.85 * d || 0.01, stagger: 0.07 * d });
    gsap.fromTo(
      "[data-fx-reveal-level]",
      { opacity: 0, x: 16 },
      { opacity: 1, x: 0, duration: 0.55 * d || 0.01, stagger: 0.026 * d },
    );
  };

  const hideReveal = () => {
    if (!revealed) return;
    revealed = false;
    root.removeAttribute("data-revealed");
    if (!cueEngaged) cue?.removeAttribute("data-paused");
    gsap.to(listOl.querySelectorAll(".fx-level"), { opacity: 0, x: 10, duration: 0.28, ease: "power2.in", stagger: 0.012 });
    gsap.to("[data-fx-reveal]", { opacity: 0, y: 12, duration: 0.32, ease: "power2.in", stagger: 0.02 });
    gsap.to(ui, { opacity: 0, duration: 0.3 }, 0.14);
    gsap.to(scrim, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0.06);
  };

  /* ---------- cue ---------- */
  const buildCue = () => {
    if (!cueArt || !layout.width) return;
    const w = layout.containerWidth;
    const h = layout.containerHeight;
    cueArt.setAttribute("viewBox", `0 0 ${w} ${h}`);
    cueArt.setAttribute("width", w);
    cueArt.setAttribute("height", h);
    const y = (pct) => layout.y + (pct / 100) * layout.height;
    const xOf = (pct) => layout.x + (pct / 100) * layout.width;
    const topY = y(TOP.y);
    const baseY = y(BAND_BASE);
    const m = Math.max(1, baseY - topY);
    const highlight = levels.find((l) => l.id === "08") ?? levels[Math.floor(levels.length / 2)];
    const maxWidth = Math.max(...levels.map((l) => (l.right - l.left) * (layout.width / 100)));
    let art = `<defs>
      <linearGradient id="fx-cue-sweep" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#fff" stop-opacity="0"/><stop offset="55%" stop-color="#fff" stop-opacity=".42"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="fx-cue-wash" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#090c10" stop-opacity="0"/><stop offset="24%" stop-color="#090c10" stop-opacity=".52"/><stop offset="76%" stop-color="#090c10" stop-opacity=".52"/><stop offset="100%" stop-color="#090c10" stop-opacity="0"/>
      </linearGradient>
      <clipPath id="fx-cue-tower"><polygon points="${xOf(TOP.left)},${topY} ${xOf(TOP.right)},${topY} ${xOf(BOTTOM.right)},${y(BOTTOM.y)} ${xOf(BOTTOM.left)},${y(BOTTOM.y)}"/></clipPath>
    </defs>
    <rect class="fx-cue__wash" x="0" y="0" width="${w}" height="${h}" fill="url(#fx-cue-wash)"/>`;
    art += `<g clip-path="url(#fx-cue-tower)">`;
    levels.forEach((level) => {
      const r = hitRect(level);
      const delay = reduced ? "" : ` style="animation-delay:${(0.35 + clamp((r.lineY - topY) / m) * 2.6).toFixed(2)}s"`;
      art += `<g class="fx-cue__tick"${delay}><line class="fx-cue__tick-under" x1="${r.x0}" y1="${r.lineY}" x2="${r.x1}" y2="${r.lineY}"/><line class="fx-cue__tick-line" x1="${r.x0}" y1="${r.lineY}" x2="${r.x1}" y2="${r.lineY}"/></g>`;
    });
    if (highlight) {
      const r = hitRect(highlight);
      art += `<rect class="fx-cue__band" x="${r.x0}" y="${r.topY}" width="${Math.max(1, r.x1 - r.x0)}" height="${Math.max(1, r.lineY - r.topY)}"/>`;
    }
    if (!reduced) {
      art += `<g class="fx-cue__sweep" style="--fx-cue-travel:${m}px"><rect x="${xOf(highlight?.left ?? 40)}" y="${topY - m * 0.16}" width="${maxWidth}" height="${m * 0.16}" fill="url(#fx-cue-sweep)"/><line class="fx-cue__edge" x1="${xOf(highlight?.left ?? 40)}" y1="${baseY}" x2="${xOf(highlight?.right ?? 55)}" y2="${baseY}"/></g>`;
      const cx = xOf(centerAt(60));
      const scale = clamp(maxWidth / 150, 0.85, 2.2);
      art += `<g class="fx-cue__pointer" style="--fx-cue-from:${topY}px;--fx-cue-to:${(hitRect(highlight ?? levels[0]).topY + hitRect(highlight ?? levels[0]).lineY) / 2}px"><g transform="translate(${cx} 0) scale(${scale.toFixed(2)})"><circle class="fx-cue__ring" r="17"/>${
        coarse
          ? `<circle class="fx-cue__tap" r="8"/>`
          : `<path class="fx-cue__arrow" d="M0 -2 L0 19 L5 14.5 L8.3 21.5 L11.4 20 L8.2 13.3 L14.5 13 Z"/>`
      }</g></g>`;
    }
    art += `</g>`;
    cueArt.innerHTML = art;
  };

  /* ---------- choose level → floorplate ---------- */
  const chooseLevel = (level) => {
    if (mode !== "selector" || suspended) return;
    selected = level.id;
    setMode("opening");
    if (coarse) gsap.set(ui, { opacity: 0 });
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => enterFloorplate(level) });
    tl.to(line, { x: 0, y: hitRect(level).lineY, scaleX: 1, opacity: 1, duration: 0.95 }, 0)
      .to(tag, { opacity: 0, duration: 0.3, ease: "power2.out" }, 0)
      .to(copy, { opacity: 0, y: -10, duration: 0.55, ease: "power2.in" }, 0.05)
      .to(hits, { opacity: 0, duration: 0.3 }, 0)
      .to(dim, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0.15)
      .to(stage, { scale: 1.045, opacity: 0.16, duration: 1.5, ease: "power2.inOut" }, 0.35);
  };

  const enterFloorplate = (level) => {
    plateTitle.textContent = `Level ${level.id}`;
    plateTypes.textContent = level.types.map(pretty).join(" · ");
    plateShared.textContent = `${level.units.length} residences · ${level.sold ? "Fully sold" : `${level.available} available`}`;
    plateImage.src = `/assets/floorplates/level-${level.id}.webp`;
    buildUnits(level);
    const top = plateArea.getBoundingClientRect().top;
    const k = hitRect(level).lineY - (top - layout.y + plateArea.offsetHeight / 2);
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => setMode("floorplate") });
    const wait = Promise.race([
      new Promise((resolve) => {
        if (plateImage.complete) resolve();
        else {
          plateImage.onload = resolve;
          plateImage.onerror = resolve;
        }
      }),
      new Promise((resolve) => window.setTimeout(resolve, 2200)),
    ]);
    tl.fromTo(
      plateFigure,
      { clipPath: "inset(50% 0% 50% 0%)", y: k, scale: 0.94, opacity: 1 },
      { clipPath: "inset(0% 0% 0% 0%)", y: 0, scale: 1, duration: 1.3, ease: "expo.out", clearProps: "clipPath" },
      Math.max(0.55, tl.time()),
    )
      .to(line, { opacity: 0, duration: 0.5, ease: "power2.out" }, 0.8)
      .fromTo(plateHead, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out" }, 1);
    tl.pause(0.55);
    wait.then(() => {
      tl.resume();
    });
  };

  const closeFloorplate = () => {
    setMode("closing");
    const level = levels.find((l) => l.id === selected) ?? levels[0];
    const r = hitRect(level);
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => restoreSelector() });
    tl.to(plateHead, { opacity: 0, y: 8, duration: 0.35, ease: "power2.in" }, 0)
      .to(plateFigure, { clipPath: "inset(50% 0% 50% 0%)", y: r.lineY - plateArea.offsetHeight / 2, scale: 0.94, duration: 0.85, ease: "expo.in" }, 0.05)
      .to(line, { opacity: 1, duration: 0.3, ease: "power2.out" }, 0.6)
      .to(stage, { scale: 1, opacity: 1, duration: 1.15, ease: "power2.inOut" }, 0.55)
      .to(line, { x: r.x0, y: r.lineY, scaleX: (r.x1 - r.x0) / layout.containerWidth, duration: 0.9 }, 0.85)
      .to(dim, { opacity: 1, duration: 0.6, ease: "power2.out" }, 1.2)
      .to(copy, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 1.3)
      .to(listOl, { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }, 1.3)
      .to(hits, { opacity: 1, duration: 0.3 }, 1.3)
      .to(tag, { opacity: 1, duration: 0.4, ease: "power2.out" }, 1.5);
  };

  const restoreSelector = () => {
    setMode("selector");
    selected = null;
    updateListSelection(shown ?? levels[0]);
    resetViewport(plateArea, plateFigure);
  };

  /* ---------- units ---------- */
  const buildUnits = (level) => {
    unitsSvg.innerHTML = "";
    unitsSold.innerHTML = "";
    unitsTags.innerHTML = "";
    unitsSvg.setAttribute("data-shown", "true");
    level.units.forEach((unit) => {
      const d = unit.polygon.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ") + " Z";
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", d);
      path.setAttribute("class", `fx-unit${unit.sold ? " is-sold" : ""}`);
      path.setAttribute("vector-effect", "non-scaling-stroke");
      path.dataset.unit = unit.id;
      path.dataset.open = String(!unit.sold);
      path.dataset.sold = String(unit.sold);
      path.dataset.cursor = unit.sold ? "Sold" : "Open residence";
      path.setAttribute("role", "button");
      path.setAttribute("tabindex", unit.sold ? "-1" : "0");
      path.setAttribute("aria-label", `${unit.id.toUpperCase()} — ${pretty(unit.variant)}${unit.sold ? " — sold" : ""}`);
      path.addEventListener("pointerenter", () => hoverUnit(unit));
      path.addEventListener("pointerleave", () => hoverUnit(null));
      path.addEventListener("focus", () => hoverUnit(unit));
      path.addEventListener("blur", () => hoverUnit(null));
      path.addEventListener("click", () => chooseUnit(unit));
      path.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          chooseUnit(unit);
        }
      });
      unitsSvg.appendChild(path);

      if (unit.sold) {
        const sold = document.createElement("span");
        sold.className = "fx-sold";
        sold.style.clipPath = `polygon(${unit.polygon.map(([x, y]) => `${x}% ${y}%`).join(", ")})`;
        unitsSold.appendChild(sold);
        const pill = document.createElement("span");
        pill.className = "fx-unit-sold";
        pill.style.left = `${unit.labelAt[0]}%`;
        pill.style.top = `${unit.labelAt[1]}%`;
        pill.innerHTML = `<span class="fx-unit-sold__word">Sold</span>`;
        unitsTags.appendChild(pill);
      } else {
        const tagEl = document.createElement("span");
        tagEl.className = "fx-unit-tag";
        tagEl.style.left = `${unit.labelAt[0]}%`;
        tagEl.style.top = `${unit.labelAt[1]}%`;
        tagEl.textContent = unit.variant.split("-")[0];
        unitsTags.appendChild(tagEl);
      }
    });
  };

  const hoverUnit = (unit) => {
    focusedUnit = unit;
    unitsSvg.toggleAttribute("data-focus", !!unit);
    unitsSvg.querySelectorAll(".fx-unit").forEach((el) => {
      const isShown = unit ? el.dataset.unit === unit.id : false;
      el.classList.toggle("is-shown", isShown);
      el.classList.toggle("is-sold", el.dataset.sold === "true");
    });
    unitsTags.querySelectorAll(".fx-unit-tag").forEach((el, i) => {
      const u = levelUnits()[i];
      el.classList.toggle("is-shown", !!unit && u?.id === unit.id);
    });
    if (unit) {
      plateUnit.setAttribute("data-visible", "true");
      plateUnit.innerHTML = `<span class="fx-plate__unit-rule"></span><span class="fx-plate__unit-name">${unit.id.toUpperCase()}</span><span class="fx-plate__unit-variant">${pretty(unit.variant)}</span>`;
    } else {
      plateUnit.removeAttribute("data-visible");
    }
  };

  const levelUnits = () => levels.find((l) => l.id === selected)?.units ?? [];

  /* ---------- choose unit → residence ---------- */
  const chooseUnit = (unit) => {
    if (unit.sold || mode !== "floorplate") return;
    setMode("openingResidence");
    focusedUnit = unit;
    gsap.set(plateFigure, {
      transformOrigin: `${unit.labelAt[0]}% ${unit.labelAt[1]}%`,
    });
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => enterResidence(unit) });
    tl.to(plateHead, { opacity: 0, y: -8, duration: 0.4, ease: "power2.in" }, 0)
      .to(listOl, { opacity: 0, x: 10, duration: 0.4, ease: "power2.in" }, 0)
      .to(plateFigure, { scale: 2.3, opacity: 0, duration: 1.05, ease: "power2.inOut" }, 0.12);
    tl.pause(0.5);
    const img = new Image();
    const ready = new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    img.src = `/assets/units/${unit.variant}.webp`;
    ready.then(() => tl.resume());
  };

  const enterResidence = (unit) => {
    resEyebrow.textContent = `Level ${selected} · Residence`;
    resTitle.textContent = unit.id.toUpperCase();
    resVariant.textContent = pretty(unit.variant);
    resMeta.innerHTML = `
      <div><dt>Floorplate</dt><dd>Level ${selected}</dd></div>
      <div><dt>Position</dt><dd>${unit.labelAt[0] < 50 ? "West wing" : "East wing"}</dd></div>
      <div><dt>Area</dt><dd>${AREAS[unit.variant] ?? "On request"}</dd></div>
      <div><dt>Type</dt><dd>${pretty(unit.variant)}</dd></div>`;
    resImage.src = `/assets/units/${unit.variant}.webp`;
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => setMode("residence") });
    tl.fromTo(resFigure, { opacity: 0, scale: 0.92, y: 22 }, { opacity: 1, scale: 1, y: 0, duration: 1.1, ease: "expo.out" }, 0.5)
      .fromTo(resHead, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.85, ease: "power3.out" }, 0.65);
  };

  const closeResidence = () => {
    setMode("closingResidence");
    const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => backToFloor() });
    tl.to(resHead, { opacity: 0, y: 8, duration: 0.35, ease: "power2.in" }, 0)
      .to(resFigure, { opacity: 0, scale: 0.94, y: 12, duration: 0.6, ease: "power2.in" }, 0.05)
      .to(plateFigure, { scale: 1, opacity: 1, duration: 1, ease: "power2.inOut" }, 0.35)
      .to(plateHead, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.75)
      .to(listOl, { opacity: 1, x: 0, duration: 0.6, ease: "power2.out" }, 0.75);
  };

  const backToFloor = () => {
    setMode("floorplate");
    hoverUnit(null);
    res.removeAttribute("data-view");
    resViewLabel.textContent = "View in 3D";
    resNote.setAttribute("hidden", "");
    gsap.set(resFigure, { rotateX: 0, rotateY: 0, clearProps: "transform" });
    resetViewport(resArea, resFigure);
    gsap.set(plateFigure, { clearProps: "transformOrigin" });
  };

  /* ---------- wheel level switching ---------- */
  let wheelAcc = 0;
  let wheelDir = 0;
  let wheelStamp = 0;
  let wheelCool = 0;
  const onWheel = (e) => {
    if (mode !== "floorplate" || !isActive()) return;
    if (e.target instanceof Element && e.target.closest("[data-scroll-lock-allow]")) return;
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    const delta = e.deltaY * scale;
    const now = performance.now();
    if (now - wheelStamp > 200) wheelAcc = 0;
    if (Math.sign(delta) !== wheelDir) wheelAcc = 0;
    wheelDir = Math.sign(delta);
    wheelStamp = now;
    wheelAcc += delta;
    if (Math.abs(wheelAcc) < WHEEL_THRESHOLD || switching || now < wheelCool) return;
    wheelAcc = 0;
    wheelCool = now + WHEEL_COOLDOWN;
    const index = levels.findIndex((l) => l.id === selected);
    const next = levels[index + (wheelDir > 0 ? 1 : -1)];
    if (!next) return;
    switchFloor(next);
  };

  const switchFloor = (level) => {
    if (switching) return;
    switching = true;
    setMode("switching");
    selected = level.id;
    const tl = gsap.timeline({ defaults: { ease: "power2.in" } });
    tl.to(plateHead, { opacity: 0, y: 6, duration: 0.28 }, 0).to(plateFigure, { opacity: 0, y: 18, scale: 0.985, duration: 0.4 }, 0);
    tl.call(() => {
      plateTitle.textContent = `Level ${level.id}`;
      plateTypes.textContent = level.types.map(pretty).join(" · ");
      plateShared.textContent = `${level.units.length} residences · ${level.sold ? "Fully sold" : `${level.available} available`}`;
      plateImage.src = `/assets/floorplates/level-${level.id}.webp`;
      buildUnits(level);
      updateListSelection(level);
    });
    const ready = new Promise((resolve) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = resolve;
      img.src = `/assets/floorplates/level-${level.id}.webp`;
    });
    tl.add(() => {
      ready.then(() => {
        requestAnimationFrame(() => {
          const inTl = gsap.timeline({
            defaults: { ease: "power3.inOut" },
            onComplete: () => {
              switching = false;
              setMode("floorplate");
            },
          });
          inTl
            .fromTo(plateFigure, { opacity: 0, y: -18, scale: 0.985 }, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "expo.out" }, 0)
            .fromTo(plateHead, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.08);
        });
      });
    });
  };

  /* ---------- pan / zoom viewport ---------- */
  const viewports = [];
  function attachViewport(container, zoomEl, figureEl) {
    if (!container || !zoomEl) return;
    const state = { z: 1, x: 0, y: 0 };
    const api = {
      container,
      zoomEl,
      figureEl,
      state,
      apply() {
        const { z, x, y } = state;
        zoomEl.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${z.toFixed(4)})`;
        container.style.setProperty("--fx-zoom", z.toFixed(4));
        const zoomed = Math.abs(z - 1) > 0.001 || Math.abs(x) > 0.5 || Math.abs(y) > 0.5;
        container.toggleAttribute("data-fx-zoomed", zoomed);
        container.toggleAttribute("data-fx-pannable", z > 1.001);
        container.setAttribute("data-scroll-lock-allow", "");
        container.setAttribute("data-lenis-prevent", "");
      },
      reset(animate = false) {
        if (animate) {
          gsap.to(state, {
            z: 1,
            x: 0,
            y: 0,
            duration: 0.38,
            ease: "power3.out",
            onUpdate: api.apply,
          });
        } else {
          state.z = 1;
          state.x = 0;
          state.y = 0;
          api.apply();
        }
      },
    };
    viewports.push(api);

    const clampPan = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      const contentW = figureEl ? figureEl.offsetWidth * state.z : w * state.z;
      const contentH = figureEl ? figureEl.offsetHeight * state.z : h * state.z;
      if (contentW <= w) state.x = (w - contentW) / 2;
      else state.x = clamp(state.x, w - contentW, 0);
      if (contentH <= h) state.y = (h - contentH) / 2;
      else state.y = clamp(state.y, h - contentH, 0);
    };

    container.addEventListener(
      "wheel",
      (e) => {
        if (mode !== "floorplate" && mode !== "residence") return;
        if (!e.ctrlKey && !(e.target instanceof Element && e.target.closest("[data-fx-zoomable]"))) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        const rect = container.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.008 : 0.0016));
        const nextZ = clamp(state.z * factor, 1, 6);
        const ratio = nextZ / state.z;
        state.x = px - (px - state.x) * ratio;
        state.y = py - (py - state.y) * ratio;
        state.z = nextZ;
        clampPan();
        api.apply();
      },
      { passive: false, capture: true },
    );

    let dragging = false;
    let moved = false;
    let last = { x: 0, y: 0 };
    container.addEventListener("pointerdown", (e) => {
      if (state.z <= 1.001) return;
      dragging = true;
      moved = false;
      last = { x: e.clientX, y: e.clientY };
      container.setAttribute("data-fx-dragging", "");
      container.setPointerCapture(e.pointerId);
    });
    container.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      last = { x: e.clientX, y: e.clientY };
      state.x += dx;
      state.y += dy;
      clampPan();
      api.apply();
    });
    const endDrag = () => {
      dragging = false;
      container.removeAttribute("data-fx-dragging");
    };
    container.addEventListener("pointerup", endDrag);
    container.addEventListener("pointercancel", endDrag);
    container.addEventListener("dblclick", (e) => {
      if (mode !== "floorplate" && mode !== "residence") return;
      e.preventDefault();
      if (state.z > 1.2) {
        api.reset(true);
        return;
      }
      const rect = container.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const nextZ = 2.4;
      const ratio = nextZ / state.z;
      state.x = px - (px - state.x) * ratio;
      state.y = py - (py - state.y) * ratio;
      state.z = nextZ;
      clampPan();
      gsap.to(state, { z: nextZ, duration: 0.38, ease: "power3.out", onUpdate: api.apply });
      api.apply();
    });
    api.apply();
  }
  attachViewport(plateArea, root.querySelector("[data-fx-plate-zoom]"), plateFigure);
  attachViewport(resArea, root.querySelector("[data-fx-res-zoom]"), resFigure);

  function resetViewport(container, figureEl) {
    const vp = viewports.find((v) => v.container === container);
    vp?.reset(true);
  }

  /* ---------- events ---------- */
  tower?.addEventListener("click", () => reveal());
  tower?.addEventListener("pointerenter", () => {
    if (mode === "selector" && !revealed) reveal();
  });
  root.addEventListener("pointermove", (e) => {
    if (mode !== "selector" || !revealed || coarse) return;
    const ceiling = Math.max(layout.y + layout.height * (BAND_BASE / 100), layout.containerHeight * 0.8);
    if (e.clientY >= ceiling) return;
  });
  root.addEventListener("wheel", onWheel, { passive: true });
  gateSkip?.addEventListener("click", () => {
    gateSkipFlag = true;
    gate?.setAttribute("hidden", "");
  });
  root.querySelector("[data-fx-terrace]")?.addEventListener("click", () => onTerrace?.());
  root.querySelector("[data-fx-res-view]")?.addEventListener("click", () => {
    if (mode !== "residence") return;
    const to3d = res.getAttribute("data-view") !== "3d";
    res.toggleAttribute("data-view", to3d);
    if (to3d) res.setAttribute("data-view", "3d");
    else res.removeAttribute("data-view");
    resViewLabel.textContent = to3d ? "View in 2D" : "View in 3D";
    resNote.toggleAttribute("hidden", !to3d);
    gsap.to(resFigure, {
      rotateX: to3d ? 14 : 0,
      rotateY: to3d ? -10 : 0,
      duration: reduced ? 0.01 : 0.7,
      ease: "power3.out",
    });
  });
  root.querySelector("[data-fx-plate-back]")?.addEventListener("click", closeFloorplate);
  root.querySelector("[data-fx-res-back]")?.addEventListener("click", closeResidence);
  window.addEventListener("keydown", (e) => {
    if (!isActive()) return;
    if (e.key === "Escape") {
      if (mode === "residence" || mode === "openingResidence") closeResidence();
      else if (mode === "floorplate" || mode === "switching") closeFloorplate();
    }
  });

  /* cue lifecycle: only runs while the explorer is active and unexplored */
  let cueTimer = null;
  const restartCue = () => {
    if (!cue) return;
    cueCycle += 1;
    buildCue();
    cue.style.display = "";
    cue.style.animation = "none";
    void cue.offsetWidth;
    cue.style.animation = "";
    cue.removeAttribute("data-paused");
    cue.toggleAttribute("data-coarse", coarse);
  };
  const scheduleCue = () => {
    window.clearTimeout(cueTimer);
    cueTimer = window.setTimeout(() => {
      if (isActive() && mode === "selector" && !revealed && !cueEngaged) restartCue();
      scheduleCue();
    }, reduced ? 5000 : CUE_CYCLE);
  };
  scheduleCue();
  const engage = () => {
    if (cueEngaged) return;
    cueEngaged = true;
    cue?.setAttribute("data-paused", "");
    syncCueVisibility();
  };
  const setActive = (next) => {
    syncCueVisibility();
    if (next && mode === "selector" && !revealed && !cueEngaged) restartCue();
  };
  let pointerStart = null;
  root.addEventListener("pointermove", (e) => {
    if (cueEngaged) return;
    if (!pointerStart) {
      pointerStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      return;
    }
    if (performance.now() - pointerStart.t > 900 && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 48) {
      engage();
    }
  });

  /* suspension from the host */
  const syncSuspended = (v) => {
    suspended = v;
    root.toggleAttribute("data-suspended", v);
    root.toggleAttribute("inert", v);
  };

  /* scroll gate: hold the page at the tower base until explored.
     Mirrors the reference: attempts are counted at most once every 2s,
     and the skip appears after three of them. */
  const GATE_CEILING = (1 + 120 / 620) / (1280 / 620);
  let gateLastAttempt = 0;
  const gateCeiling = () => {
    const section = document.querySelector("[data-opening-root]");
    if (!section) return null;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    return top + span * GATE_CEILING;
  };
  let gateCheck = 0;
  const gateLoop = () => {
    requestAnimationFrame(gateLoop);
    const now = performance.now();
    if (now - gateCheck < 120) return;
    gateCheck = now;
    if (gateSkipFlag || !isActive() || mode !== "selector") {
      gate?.setAttribute("hidden", "");
      return;
    }
    const ceiling = gateCeiling();
    if (ceiling == null) return;
    if (window.scrollY > ceiling + 1) {
      const countAttempt = now - gateLastAttempt > 2000;
      if (countAttempt) {
        gateLastAttempt = now;
        gateAttempts += 1;
        if (gateAttempts >= 3) gateSkip?.removeAttribute("hidden");
      }
      window.scrollTo(0, ceiling);
    }
    gate?.removeAttribute("hidden");
  };
  requestAnimationFrame(gateLoop);

  /* boot */
  buildList();
  measure();
  ScrollTrigger.addEventListener("refresh", measure);
  ScrollTrigger.addEventListener("refreshInit", measure);
  const ro = new ResizeObserver(measure);
  ro.observe(root);

  setMode("selector");
  hideLine();
  gsap.set([line, tag, dim, readout], { opacity: 0 });

  return { measure, reveal, syncSuspended, setActive, get mode() { return mode; } };
}
