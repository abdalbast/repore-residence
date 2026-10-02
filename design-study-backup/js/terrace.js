/* Open terrace: an interactive isometric podium (canvas 2D stand-in for WebGL). */

import { gsap, clamp, reducedMotion, lockScroll, unlockScroll } from "./core.js";

const ZONES = [
  { id: "pool", name: "Pool", x: 0.5, y: 0.52, w: 0.34, h: 0.24, color: "#2f7f96" },
  { id: "sports-court", name: "Sports court", x: 0.26, y: 0.3, w: 0.2, h: 0.14, color: "#3d6b52" },
  { id: "garden", name: "Garden", x: 0.76, y: 0.34, w: 0.2, h: 0.16, color: "#41663f" },
  { id: "play-area", name: "Play area", x: 0.76, y: 0.68, w: 0.16, h: 0.12, color: "#8a6b3f" },
  { id: "fitness", name: "Fitness area", x: 0.24, y: 0.66, w: 0.16, h: 0.12, color: "#5b5f6b" },
  { id: "walking-track", name: "Walking track", x: 0.5, y: 0.24, w: 0.5, h: 0.06, color: "#7a6a52" },
];

const POSTERS = {
  pool: "/assets/repose-experience/pool-01.webp",
  "sports-court": "/assets/terrace/plate-sports-court.webp",
  garden: "/assets/terrace/plate-garden.webp",
  "play-area": "/assets/repose-experience/kids-play-01.webp",
  fitness: "/assets/terrace/plate-fitness.webp",
  "walking-track": "/assets/repose-experience/walking-track-01.webp",
};

export function initTerrace({ onReturn } = {}) {
  if (document.querySelector("[data-tr-root]")) return;
  const reduced = reducedMotion();
  const root = document.createElement("div");
  root.className = "tr";
  root.dataset.trRoot = "";
  root.tabIndex = -1;
  root.dataset.phase = "rising";
  root.setAttribute("aria-label", "Open terrace");
  root.innerHTML = `
    <canvas class="tr__canvas" data-tr-canvas></canvas>
    <div class="tr__rise" aria-hidden="true">
      <div class="tr__still"><img src="/assets/opening/building/final-frame.webp" alt="" /></div>
      <div class="tr__veil" data-tr-veil></div>
    </div>
    <div class="tr__mark" data-tr-mark><span class="tr__mark-ring"></span></div>
    <div class="tr__ui" data-tr-ui>
      <header class="tr__head">
        <p class="tr__eyebrow">Reposé Residence</p>
        <h2 class="tr__title">Open terrace</h2>
        <p class="tr__lead">Select an amenity.</p>
        <div class="tr__readout" data-tr-readout aria-live="polite"></div>
      </header>
      <nav class="tr__index" aria-label="Amenities"><ol data-tr-index></ol></nav>
      <div class="tr__foot">
        <button class="tr__back" data-tr-back type="button"><span class="fx-plate__back-rule"></span>Back to the building</button>
        <p class="tr__hint">Drag to look · scroll to zoom · select an amenity</p>
      </div>
    </div>
    <div class="tr__portal" data-tr-portal>
      <img class="tr__detail-media" data-tr-detail-media alt="" />
      <div class="tr__detail-scrim"></div>
      <button class="tr__back tr__back--detail" data-tr-detail-back type="button"><span class="fx-plate__back-rule"></span>Terrace overview</button>
      <div class="tr__detail-copy">
        <span class="tr__eyebrow" data-tr-detail-index>01 / 06</span>
        <h3 data-tr-detail-title></h3>
        <p data-tr-detail-note></p>
      </div>
    </div>
    <p class="tr__waiting" data-tr-waiting>Open terrace</p>`;
  document.body.appendChild(root);
  lockScroll();
  document.querySelector(".cursor-label")?.removeAttribute("data-shown");
  const wa = document.querySelector(".wa");
  wa?.removeAttribute("data-shown");

  const canvas = root.querySelector("[data-tr-canvas]");
  const ctx = canvas.getContext("2d");
  const veil = root.querySelector("[data-tr-veil]");
  const still = root.querySelector(".tr__still");
  const ui = root.querySelector("[data-tr-ui]");
  const mark = root.querySelector("[data-tr-mark]");
  const portal = root.querySelector("[data-tr-portal]");
  const detailMedia = root.querySelector("[data-tr-detail-media]");
  const detailIndex = root.querySelector("[data-tr-detail-index]");
  const detailTitle = root.querySelector("[data-tr-detail-title]");
  const detailNote = root.querySelector("[data-tr-detail-note]");
  const waiting = root.querySelector("[data-tr-waiting]");
  const indexList = root.querySelector("[data-tr-index]");

  let view = { azimuth: 0, polar: 0.235, zoom: 1, x: 0, y: 0 };
  const goal = { ...view };
  let hovered = null;
  let selected = null;
  let phase = "rising";
  let dpr = 1;
  let raf = 0;
  let pointer = { x: 0, y: 0 };
  let dragging = false;
  let moved = 0;

  const setPhase = (next) => {
    phase = next;
    root.dataset.phase = next;
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(root.clientWidth * dpr);
    canvas.height = Math.round(root.clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const project = (nx, ny) => {
    const w = root.clientWidth;
    const h = root.clientHeight;
    const cx = w / 2 + view.x;
    const cy = h * 0.58 + view.y;
    const tilt = 0.52 + view.polar * 0.7;
    const scale = Math.min(w, h) * 0.95 * view.zoom;
    const x = cx + (nx - 0.5) * scale;
    const y = cy + (ny - 0.5) * scale * tilt;
    return { x, y };
  };

  const zonePath = (zone) => {
    const p = [
      project(zone.x - zone.w / 2, zone.y - zone.h / 2),
      project(zone.x + zone.w / 2, zone.y - zone.h / 2),
      project(zone.x + zone.w / 2, zone.y + zone.h / 2),
      project(zone.x - zone.w / 2, zone.y + zone.h / 2),
    ];
    return p;
  };

  const draw = () => {
    raf = requestAnimationFrame(draw);
    if (root.dataset.phase === "leaving") return;
    const w = root.clientWidth;
    const h = root.clientHeight;
    ctx.clearRect(0, 0, w, h);
    // podium base
    const base = [
      project(0.02, 0.08),
      project(0.98, 0.08),
      project(0.98, 0.94),
      project(0.02, 0.94),
    ];
    ctx.beginPath();
    ctx.moveTo(base[0].x, base[0].y);
    base.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = "#10151b";
    ctx.fill();
    ctx.strokeStyle = "rgba(246,244,241,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // track ring
    ctx.beginPath();
    const ring = project(0.5, 0.24);
    ctx.ellipse(ring.x, ring.y, Math.min(w, h) * 0.46 * view.zoom, Math.min(w, h) * 0.2 * view.zoom, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(246,244,241,0.12)";
    ctx.lineWidth = 6;
    ctx.stroke();
    ZONES.forEach((zone) => {
      const path = zonePath(zone);
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      path.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.closePath();
      const active = hovered?.id === zone.id || selected?.id === zone.id;
      ctx.fillStyle = zone.color;
      ctx.globalAlpha = active ? 0.95 : 0.6;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = active ? "#f6f4f1" : "rgba(246,244,241,0.35)";
      ctx.lineWidth = active ? 1.6 : 1;
      ctx.stroke();
    });
  };

  const tick = () => {
    const ease = 1 - Math.pow(0.83, gsap.ticker.deltaRatio());
    view.x += (goal.x - view.x) * ease;
    view.y += (goal.y - view.y) * ease;
    view.azimuth += (goal.azimuth - view.azimuth) * ease;
    view.polar += (goal.polar - view.polar) * ease;
    view.zoom += (goal.zoom - view.zoom) * ease;
  };
  gsap.ticker.add(tick);
  requestAnimationFrame(draw);
  resize();
  window.addEventListener("resize", resize);

  /* hover / select */
  const pick = (px, py) => {
    for (const zone of ZONES) {
      const path = zonePath(zone);
      const minX = Math.min(...path.map((p) => p.x));
      const maxX = Math.max(...path.map((p) => p.x));
      const minY = Math.min(...path.map((p) => p.y));
      const maxY = Math.max(...path.map((p) => p.y));
      if (px >= minX && px <= maxX && py >= minY && py <= maxY) return zone;
    }
    return null;
  };

  const onMove = (e) => {
    if (phase === "detail" || phase === "entering") return;
    const rect = root.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (dragging) {
      const dx = e.clientX - pointer.x;
      const dy = e.clientY - pointer.y;
      moved += Math.abs(dx) + Math.abs(dy);
      goal.azimuth = clamp(goal.azimuth + dx * 0.0016, -0.17, 0.17);
      goal.polar = clamp(goal.polar + dy * 0.0011, 0.075, 0.345);
      goal.x = clamp(goal.x + dx * 0.4, -120, 120);
      pointer = { x: e.clientX, y: e.clientY };
      return;
    }
    const zone = pick(px, py);
    if (zone?.id !== hovered?.id) {
      hovered = zone;
      canvas.style.cursor = zone ? "pointer" : "default";
      mark.toggleAttribute("data-shown", !!zone);
      if (zone) {
        const p = project(zone.x, zone.y - zone.h / 2);
        mark.style.left = `${p.x}px`;
        mark.style.top = `${p.y}px`;
      }
      renderReadout(zone);
      updateIndex();
    }
  };
  const onDown = (e) => {
    dragging = true;
    moved = 0;
    pointer = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e) => {
    dragging = false;
    if (moved < 6) {
      const rect = root.getBoundingClientRect();
      const zone = pick(e.clientX - rect.left, e.clientY - rect.top);
      if (zone) selectZone(zone);
    }
  };
  const onWheel = (e) => {
    if (phase === "detail") return;
    e.preventDefault();
    goal.zoom = clamp(goal.zoom * (1 + clamp(e.deltaY, -120, 120) * 0.0012), 0.66, 1.6);
  };
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("pointerup", onUp);
  root.addEventListener("pointerleave", () => {
    dragging = false;
    hovered = null;
    mark.removeAttribute("data-shown");
    renderReadout(null);
  });
  root.addEventListener("wheel", onWheel, { passive: false });

  const renderReadout = (zone) => {
    const readout = root.querySelector("[data-tr-readout]");
    if (!readout) return;
    if (!zone) {
      readout.innerHTML = "";
      return;
    }
    readout.innerHTML = `<span class="tr__readout-label">${zone.name}</span>`;
  };

  const buildIndex = () => {
    indexList.innerHTML = ZONES.map(
      (z, i) => `<li><button class="tr-amenity" type="button" data-zone="${z.id}"><span class="tr-amenity__index">${String(i + 1).padStart(2, "0")}</span><span class="tr-amenity__rule"></span><span class="tr-amenity__label">${z.name}</span></button></li>`,
    ).join("");
    indexList.querySelectorAll("[data-zone]").forEach((btn) => {
      const zone = ZONES.find((z) => z.id === btn.dataset.zone);
      btn.addEventListener("pointerenter", () => {
        hovered = zone;
        mark.toggleAttribute("data-shown", true);
        const p = project(zone.x, zone.y - zone.h / 2);
        mark.style.left = `${p.x}px`;
        mark.style.top = `${p.y}px`;
        renderReadout(zone);
        updateIndex();
      });
      btn.addEventListener("click", () => selectZone(zone));
    });
  };
  const updateIndex = () => {
    indexList.querySelectorAll("[data-zone]").forEach((btn) => {
      btn.toggleAttribute("data-shown", btn.dataset.zone === (hovered?.id ?? selected?.id));
    });
  };

  /* rising */
  const rise = () => {
    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("overview");
        root.removeAttribute("tabindex");
        waiting.removeAttribute("data-shown");
      },
    });
    if (reduced) {
      tl.set(still, { opacity: 0 }).to(ui, { opacity: 1, duration: 0.3 }, 0);
      return;
    }
    tl.fromTo(ui, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.4);
    tl.to(still, { scale: 1.35, opacity: 0, filter: "blur(6px)", duration: 1.4, ease: "power2.in" }, 0.1);
    tl.to(veil, { opacity: 0, duration: 1 }, 0.2);
    tl.set(still, { display: "none" });
  };
  waiting.setAttribute("data-shown", "");
  const stillImg = still.querySelector("img");
  const ready = stillImg?.complete
    ? Promise.resolve()
    : new Promise((resolve) => {
        stillImg.onload = resolve;
        stillImg.onerror = resolve;
      });
  Promise.race([ready, new Promise((r) => window.setTimeout(r, 1200))]).then(rise);

  /* detail */
  const selectZone = (zone) => {
    if (!zone || phase !== "overview") return;
    selected = zone;
    setPhase("entering");
    renderReadout(zone);
    updateIndex();
    const p = project(zone.x, zone.y);
    const radius = Math.hypot(root.clientWidth, root.clientHeight) * 1.02;
    const idx = ZONES.findIndex((z) => z.id === zone.id);
    detailIndex.textContent = `${String(idx + 1).padStart(2, "0")} / ${String(ZONES.length).padStart(2, "0")}`;
    detailTitle.textContent = zone.name;
    detailNote.textContent = "Open daily · Podium level";
    detailMedia.src = POSTERS[zone.id] ?? POSTERS.garden;
    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("detail");
        goal.zoom = 1.35;
        goal.x = (0.5 - zone.x) * Math.min(root.clientWidth, root.clientHeight) * 0.9;
        goal.y = (0.5 - zone.y) * Math.min(root.clientWidth, root.clientHeight) * 0.5;
      },
    });
    tl.to(ui, { opacity: 0, y: 10, duration: 0.45, ease: "power2.in" }, 0)
      .fromTo(
        portal,
        { clipPath: `circle(0% at ${p.x}px ${p.y}px)` },
        { clipPath: `circle(${radius}px at ${p.x}px ${p.y}px)`, duration: reduced ? 0.01 : 1.05, ease: "power3.inOut" },
        0.2,
      );
  };

  const backToOverview = () => {
    setPhase("leaving");
    const p = selected ? project(selected.x, selected.y) : project(0.5, 0.5);
    const tl = gsap.timeline({
      onComplete: () => {
        setPhase("overview");
        selected = null;
        goal.zoom = 1;
        goal.x = 0;
        goal.y = 0;
      },
    });
    tl.to(portal, { clipPath: `circle(0% at ${p.x}px ${p.y}px)`, duration: reduced ? 0.01 : 0.85, ease: "power3.inOut" }, 0)
      .to(ui, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 0.2);
  };

  const descend = () => {
    if (phase === "descending") return;
    setPhase("descending");
    const tl = gsap.timeline({
      onComplete: () => {
        cleanup();
        onReturn?.();
      },
    });
    if (reduced) {
      tl.to(root, { opacity: 0, duration: 0.3 });
      return;
    }
    tl.to(ui, { opacity: 0, y: 10, duration: 0.4 }, 0)
      .to(portal, { opacity: 0, duration: 0.5 }, 0)
      .to(root, { opacity: 0, duration: 0.8, ease: "power2.inOut" }, 0.5);
  };

  const cleanup = () => {
    cancelAnimationFrame(raf);
    gsap.ticker.remove(tick);
    window.removeEventListener("resize", resize);
    root.remove();
    unlockScroll();
    document.querySelector(".wa")?.setAttribute("data-shown", "");
  };

  root.querySelector("[data-tr-back]")?.addEventListener("click", descend);
  root.querySelector("[data-tr-detail-back]")?.addEventListener("click", backToOverview);
  window.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (phase === "detail") backToOverview();
    else if (phase === "overview") descend();
  });

  buildIndex();
  return { descend };
}
