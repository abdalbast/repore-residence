/* Lifestyle chapter: interiors prologue, ten chapters, finale and closing. */

import { gsap, ScrollTrigger, clamp, reducedMotion, lockScroll, unlockScroll, offsetTop, scrollToY, getLenis } from "./core.js";

const ROOMS = [
  { id: "living-room", index: "01", name: "Living room", cue: "Watch", title: "Living room", line: "Morning light, long views, and room to stay in.", meta: "Interior film · 0:42" },
  { id: "kitchen", index: "02", name: "Kitchen", cue: "Watch", title: "Kitchen", line: "Italian joinery and a bench made for gathering.", meta: "Interior film · 0:38" },
  { id: "bedroom", index: "03", name: "Bedroom", cue: "Watch", title: "Bedroom", line: "Quiet materials, softer light, deeper rest.", meta: "Interior film · 0:35" },
  { id: "bathroom", index: "04", name: "Bathroom", cue: "Watch", title: "Bathroom", line: "Stone, water, and a slower start to the day.", meta: "Interior film · 0:31" },
];

const AMENITIES = [
  { id: "zen-garden", name: "Zen garden", group: "Stillness", note: "A planted court for the middle of the day." },
  { id: "yoga-studio", name: "Yoga studio", group: "Stillness", note: "Timber floor, soft light, space to breathe." },
  { id: "gym", name: "The gym", group: "Movement", note: "Technogym equipment and a view to the podium." },
  { id: "walking-track", name: "Walking track", group: "Movement", note: "A shaded loop around the entire podium." },
  { id: "adults-pool", name: "Adults' pool", group: "Water", note: "All-weather, temperature controlled." },
  { id: "steam-room", name: "Steam room", group: "Water", note: "Warm stone and eucalyptus steam." },
  { id: "open-terrace", name: "Open terrace", group: "Together", note: "Skyline views with planted edges." },
  { id: "jacuzzi", name: "Jacuzzi", group: "Water", note: "A warm corner of the pool deck." },
  { id: "adults-outdoor-gym", name: "Outdoor gym", group: "Movement", note: "Rig, free weights, and open air." },
  { id: "kids-play", name: "Kids' play", group: "Together", note: "Shaded, soft-fall, and in full view." },
  { id: "pickleball-court", name: "Pickleball court", group: "Together", note: "The fastest-growing game in Dubai." },
  { id: "cricket-simulator", name: "Cricket simulator", group: "Together", note: "Indoor nets, all year round." },
];

const PANELS = [
  { key: "pause", title: "Pause", scene: "The art of pause", copy: "A garden that asks nothing of you. Sit, read, or simply let the afternoon pass." },
  { key: "balance", title: "Balance", scene: "Yoga & zen", copy: "Two rooms and a garden for the practice of slowing down." },
  { key: "move", title: "Move", scene: "The gym", copy: "Everything you need for a proper session, and nothing you don't." },
  { key: "exhale", title: "Exhale", scene: "The steam room", copy: "Warm stone, low light, and twenty minutes that reset the day." },
  { key: "be", title: "Be", scene: "Zen garden", copy: "The quietest address on the podium." },
];

const FACTS = [
  { index: "01", label: "Floor-to-ceiling height", value: "3.65", unit: "m", copy: "Full-height glazing that keeps the skyline in the room." },
  { index: "02", label: "Kitchens", value: "Italian", unit: "", copy: "Modular joinery, stone counters, integrated appliances." },
  { index: "03", label: "Smart home", value: "Intuitive", unit: "", copy: "Lighting, climate, and access from a single panel." },
  { index: "04", label: "Balconies", value: "Open", unit: "", copy: "Deep, shaded, and designed to be used every day." },
];

const CONNECTIONS = [
  { time: "05", unit: "min", place: "Al Furjan Metro", cat: "Transport", note: "Walk" },
  { time: "05", unit: "min", place: "Dubai Marina", cat: "Attractions", note: "Drive" },
  { time: "12", unit: "min", place: "Ibn Battuta Mall", cat: "Shopping", note: "Drive" },
  { time: "25", unit: "min", place: "Al Maktoum International", cat: "Transport", note: "Drive" },
];

const WALKTHROUGHS = [
  { id: "one-bedroom", index: "01 / 02", title: "One bedroom", subtitle: "0:59 · Interior film", src: "/assets/walkthrough/one-bedroom-walkthrough.mp4", poster: "/assets/walkthrough/one-bedroom-walkthrough-poster.webp" },
  { id: "two-bedroom", index: "02 / 02", title: "Two bedroom", subtitle: "1:24 · Interior film", src: "/assets/walkthrough/two-bedroom-walkthrough.mp4", poster: "/assets/walkthrough/two-bedroom-walkthrough-poster.webp" },
];

let cinema = null;

export function initLifestyle() {
  const root = document.querySelector("[data-repose-root]");
  if (!root || root.dataset.ready) return;
  root.dataset.ready = "true";
  const reduced = reducedMotion();
  const coarse = window.matchMedia("(max-width: 900px)").matches;

  buildPrologue();
  buildChapters();
  buildChrome();
  buildClosing();
  phaseGate(root);

  /* ---------- prologue ---------- */
  function buildPrologue() {
    const list = root.querySelector("[data-ri-cards]");
    if (!list) return;
    list.innerHTML = ROOMS.map(
      (room) => `
      <li class="ri-card">
        <button class="ri-card__button" type="button" data-room="${room.id}" data-cursor="Play" aria-label="Play the ${room.name} film">
          <span class="ri-card__frame">
            <span class="ri-card__reveal">
              <img src="/assets/interiors/${room.id}-card.webp" alt="${room.name}" loading="lazy" />
            </span>
            <span class="ri-card__wash"></span>
            <span class="ri-card__play"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 1 L11 6 L2 11 Z" fill="currentColor"/></svg></span>
          </span>
          <span class="ri-card__foot">
            <span class="ri-card__index rp-micro">${room.index}</span>
            <span class="ri-card__name t-display">${room.name}</span>
            <span class="ri-card__cue t-ui">${room.cue} <i>→</i></span>
          </span>
        </button>
      </li>`,
    ).join("");

    const titleLines = root.querySelectorAll(".ri__title .rp-clip > span");
    const headBits = root.querySelectorAll(".ri__eyebrow, .ri__lead, .ri__place, .ri__select");
    if (reduced) {
      gsap.set([titleLines, headBits], { opacity: 1, yPercent: 0, y: 0 });
    } else {
      gsap.fromTo(titleLines, { yPercent: 112 }, { yPercent: 0, duration: 1.15, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".ri", start: "top 68%", once: true } });
      gsap.fromTo(headBits, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: ".ri", start: "top 68%", once: true } });
    }
    gsap.fromTo(".ri-botanical--top-left", { yPercent: -4, scale: 1.02 }, { yPercent: 3, scale: 1, ease: "none", scrollTrigger: { trigger: ".ri", start: "top bottom", end: "bottom top", scrub: 0.9 } });
    gsap.fromTo(".ri-botanical--bottom-right", { yPercent: 5, scale: 1 }, { yPercent: -3, scale: 1.03, ease: "none", scrollTrigger: { trigger: ".ri", start: "top bottom", end: "bottom top", scrub: 0.9 } });

    const cards = root.querySelectorAll(".ri-card");
    if (!coarse) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".ri",
          start: "top top",
          end: () => `+=${window.innerHeight * (cards.length + 1) * 0.62}`,
          pin: ".ri__page",
          scrub: 0.72,
          anticipatePin: 1,
        },
      });
      cards.forEach((card, i) => {
        const reveal = card.querySelector(".ri-card__reveal");
        const img = card.querySelector("img");
        const text = card.querySelectorAll(".ri-card__index, .ri-card__name, .ri-card__cue");
        tl.fromTo(card, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out" }, i);
        tl.fromTo(reveal, { clipPath: "inset(-2px -2px 100% -2px)" }, { clipPath: "inset(-2px -2px 0% -2px)", duration: 0.85, ease: "power3.inOut" }, i);
        tl.fromTo(img, { scale: 1.24, yPercent: -5 }, { scale: 1, yPercent: 0, duration: 1.05, ease: "power2.out" }, i);
        tl.fromTo(text, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" }, i + 0.45);
        if (i < cards.length - 1) tl.to(card, { y: -10, duration: 0.4, ease: "none" }, i + 1);
      });
    } else {
      cards.forEach((card) => {
        const reveal = card.querySelector(".ri-card__reveal");
        const img = card.querySelector("img");
        const text = card.querySelectorAll(".ri-card__index, .ri-card__name, .ri-card__cue");
        gsap.fromTo(card, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
        gsap.fromTo(reveal, { clipPath: "inset(-2px -2px 100% -2px)" }, { clipPath: "inset(-2px -2px 0% -2px)", duration: 1.1, ease: "power3.inOut", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
        gsap.fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1.3, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
        gsap.fromTo(text, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.1, delay: 0.35, ease: "power2.out", scrollTrigger: { trigger: card, start: "top 88%", once: true } });
      });
    }

    root.querySelectorAll("[data-room]").forEach((button) => {
      button.addEventListener("click", () => openCinema(button.dataset.room));
    });
  }

  /* ---------- cinema ---------- */
  function openCinema(id) {
    const room = ROOMS.find((r) => r.id === id);
    if (!room) return;
    const card = root.querySelector(`[data-room="${id}"] .ri-card__frame`);
    if (!card) return;
    if (!cinema) cinema = buildCinema();
    const from = card.getBoundingClientRect();
    const { frame, films } = cinema;
    cinema.root.hidden = false;
    cinema.root.setAttribute("data-open", "");
    films.forEach((film) => film.toggleAttribute("data-shown", film.dataset.room === id));
    const active = films.find((f) => f.dataset.room === id);
    active?.play?.().catch(() => {});
    cinema.index.textContent = room.index;
    cinema.title.textContent = room.title;
    cinema.line.textContent = room.line;
    cinema.meta.textContent = room.meta;
    const nudge = cinema.root.querySelector("[data-cinema-nudge]");
    nudge?.setAttribute("hidden", "");
    window.clearTimeout(cinema.nudgeTimer);
    cinema.nudgeTimer = window.setTimeout(() => nudge?.removeAttribute("hidden"), 4500);
    lockScroll();
    if (reduced) {
      gsap.set(frame, { left: 0, top: 0, width: "100%", height: "100%", borderRadius: 0 });
      return;
    }
    gsap.fromTo(
      frame,
      { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: "50% 50% 0 0 / 37.5% 37.5% 0 0" },
      { left: 0, top: 0, width: "100%", height: "100%", borderRadius: 0, duration: 1.05, ease: "power4.inOut" },
    );
    gsap.fromTo(active, { scale: 1.16, filter: "blur(14px)" }, { scale: 1, filter: "blur(0px)", duration: 1.2, ease: "power2.out" }, 0.15);
    gsap.to(".ri__page", { scale: 0.965, opacity: 0.28, filter: "blur(5px)", duration: 0.9, ease: "power2.inOut" }, 0);
  }

  function closeCinema() {
    if (!cinema || cinema.root.hidden) return;
    const films = cinema.films;
    films.forEach((film) => {
      film.pause?.();
      film.removeAttribute("data-shown");
    });
    gsap.to(".ri__page", { scale: 1, opacity: 1, filter: "blur(0px)", duration: 0.6, ease: "power2.out" });
    if (reduced) {
      cinema.root.hidden = true;
      unlockScroll();
      return;
    }
    gsap.to(cinema.frame, {
      opacity: 0,
      scale: 0.98,
      duration: 0.45,
      ease: "power2.in",
      onComplete: () => {
        cinema.root.hidden = true;
        gsap.set(cinema.frame, { opacity: 1, scale: 1 });
      },
    });
    unlockScroll();
  }

  function buildCinema() {
    const el = document.createElement("div");
    el.className = "ri-cinema";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.innerHTML = `
      <div class="ri-cinema__veil"></div>
      <div class="ri-cinema__frame" data-cinema-frame>
        ${ROOMS.map((room) => `<video class="ri-cinema__film" data-room="${room.id}" src="/assets/interiors/${room.id}.mp4" poster="/assets/interiors/${room.id}-still.webp" muted loop playsinline preload="none"></video>`).join("")}
        <div class="ri-cinema__wash"></div>
      </div>
      <div class="ri-cinema__type">
        <span class="ri-cinema__index t-micro" data-cinema-index></span>
        <h2 class="ri-cinema__title t-display" data-cinema-title></h2>
        <p class="ri-cinema__line" data-cinema-line></p>
      </div>
      <span class="ri-cinema__meta t-micro" data-cinema-meta></span>
      <button class="ri-cinema__back t-ui" data-cinema-back type="button">
        <span class="attn" data-cinema-nudge hidden aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        ← Interiors
      </button>
      <div class="ri-cinema__progress"><i data-cinema-progress></i></div>`;
    document.body.appendChild(el);
    const films = [...el.querySelectorAll(".ri-cinema__film")];
    const progress = el.querySelector("[data-cinema-progress]");
    films.forEach((film) => {
      film.addEventListener("timeupdate", () => {
        if (!film.hasAttribute("data-shown")) return;
        const d = film.duration || 1;
        progress.style.transform = `scaleX(${clamp(film.currentTime / d)})`;
      });
    });
    el.querySelector("[data-cinema-back]").addEventListener("click", closeCinema);
    el.querySelector(".ri-cinema__veil").addEventListener("click", closeCinema);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCinema();
    });
    return {
      root: el,
      frame: el.querySelector("[data-cinema-frame]"),
      films,
      index: el.querySelector("[data-cinema-index]"),
      title: el.querySelector("[data-cinema-title]"),
      line: el.querySelector("[data-cinema-line]"),
      meta: el.querySelector("[data-cinema-meta]"),
    };
  }

  /* ---------- chapters ---------- */
  function buildChapters() {
    const main = root.querySelector("[data-rp-main]");
    const stage = root.querySelector("[data-rp-index-stage]");
    const list = root.querySelector("[data-rp-index-list]");
    if (stage) {
      stage.innerHTML = AMENITIES.map(
        (a) => `<span class="rp-index-plate" data-plate="${a.id}"><img src="/assets/repose-experience/${a.id}.webp" alt="${a.name}" loading="lazy" /></span>`,
      ).join("");
    }
    if (list) {
      list.innerHTML = AMENITIES.map(
        (a, i) => `
        <li class="rp-index-row" data-row="${a.id}">
          <span class="rp-index-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="rp-index-name">${a.name}</span>
          <span class="rp-index-group rp-micro">${a.group}</span>
          <span class="rp-index-note">${a.note}</span>
        </li>`,
      ).join("");
    }

    const panels = root.querySelector("[data-rp-panels]");
    if (panels) {
      panels.innerHTML = PANELS.map(
        (p, i) => `
        <article class="rp-panel rp-panel-${i + 1}" data-scene="${i}">
          <span class="rp-panel-number">${String(i + 1).padStart(2, "0")} — 05</span>
          <h2 class="rp-layer-title">${p.title}</h2>
          ${
            p.key === "pause"
              ? `<figure class="rp-panel-photo rp-pause-photo"><img src="/assets/repose-experience/zen-garden-01.webp" alt="Zen garden" loading="lazy" /></figure>`
              : p.key === "balance"
                ? `<figure class="rp-yoga-photo"><img src="/assets/repose-experience/yoga-01.webp" alt="Yoga studio" loading="lazy" /></figure><figure class="rp-zen-inset"><img src="/assets/repose-experience/zen-garden-01.webp" alt="Zen garden" loading="lazy" /></figure>`
                : p.key === "move"
                  ? `<figure class="rp-gym-photo"><video src="/assets/amenity-videos/gym.mp4" poster="/assets/amenity-videos/gym-poster.webp" muted loop playsinline preload="metadata"></video></figure><figure class="rp-gym-inset"><img src="/assets/repose-experience/gym-02.webp" alt="Gym" loading="lazy" /></figure>`
                  : p.key === "exhale"
                    ? `<figure class="rp-steam-photo"><video src="/assets/amenity-videos/steam-room.mp4" poster="/assets/amenity-videos/steam-room-poster.webp" muted loop playsinline preload="metadata"></video></figure>`
                    : `<span class="rp-be-note">05 / Zen garden</span><figure class="rp-be-photo"><img src="/assets/repose-experience/zen-garden-01.webp" alt="Zen garden" loading="lazy" /></figure>`
          }
          <div class="rp-panel-copy"><span class="rp-micro">${String(i + 1).padStart(2, "0")} / ${p.scene}</span><p>${p.copy}</p></div>
          ${i === 0 ? `<span class="rp-horizontal-invite">Scroll to wander <b>⟶</b></span>` : ""}
        </article>`,
      ).join("");
    }

    const nav = root.querySelector("[data-rp-scene-nav]");
    if (nav) {
      nav.innerHTML = PANELS.map(
        (p, i) => `<button type="button" data-scene-button="${i}"><span>${String(i + 1).padStart(2, "0")}</span><span class="rp-scene-name">${p.title}</span></button>`,
      ).join("");
    }

    const facts = root.querySelector("[data-rp-facts]");
    if (facts) {
      facts.innerHTML = FACTS.map(
        (f) => `
        <article class="rp-essential-fact">
          <span class="rp-fact-index">${f.index} / ${f.label}</span>
          <h3>${f.value}${f.unit ? ` <span>${f.unit}</span>` : ""}</h3>
          <p>${f.copy}</p>
        </article>`,
      ).join("");
    }

    const connections = root.querySelector("[data-rp-connections]");
    if (connections) {
      connections.innerHTML = CONNECTIONS.map(
        (c) => `
        <article>
          <span class="rp-time">${c.time}<small>${c.unit}</small></span>
          <h3>${c.place}</h3>
          <span class="rp-micro">${c.cat} · ${c.note}</span>
        </article>`,
      ).join("");
    }

  }

  /* Chapter triggers are created only once the chapter is actually mounted:
     creating them while `.rp-main` is hidden collapses every pin spacer. */
  let activated = false;
  function activateChapters() {
    if (activated) return;
    activated = true;
    const main = root.querySelector("[data-rp-main]");
    if (!main) return;

    ScrollTrigger.create({
      trigger: main,
      start: "top top",
      end: "bottom bottom",
      refreshPriority: -20,
      onUpdate: (self) => {
        const count = root.querySelector("[data-progress-count]");
        const lineEl = root.querySelector("[data-progress-line]");
        if (count) count.textContent = String(Math.round(self.progress * 100)).padStart(2, "0");
        if (lineEl) lineEl.style.transform = `scaleY(${self.progress})`;
      },
    });
    root.querySelectorAll("[data-chapter]").forEach((section) => {
      const id = section.dataset.chapter;
      ScrollTrigger.create({
        trigger: section,
        start: "top 45%",
        end: "bottom 45%",
        refreshPriority: -10,
        onToggle: (self) => {
          if (!self.isActive) return;
          const count = root.querySelector("[data-chapter-count]");
          if (count) count.textContent = id;
          const paper = ["03", "04", "06", "08", "10"].includes(id);
          root.setAttribute("data-ui-tone", paper ? "paper" : "ink");
        },
      });
    });

    chapterIndex(main);
    chapterHorizontal(main);
    chapterWater(main);
    chapterParallax(main);
    chapterFamily(main);
    chapterInteriors(main);
    chapterEssentials(main);
    chapterConnected(main);
    chapterMap(main);
    chapterFinale(main, root);
    ScrollTrigger.sort();
    ScrollTrigger.refresh(true);
  }

  function phaseGate(rootEl) {
    const tail = rootEl.querySelector("[data-residence-tail]");
    const main = rootEl.querySelector("[data-rp-main]");
    ScrollTrigger.create({
      trigger: tail,
      start: "top 62%",
      once: true,
      onEnter: () => {
        main?.removeAttribute("hidden");
        rootEl.setAttribute("data-phase", "exploring");
        ScrollTrigger.refresh(true);
        activateChapters();
      },
    });
    ScrollTrigger.create({
      trigger: ".arrival",
      start: "top 80%",
      onEnter: () => rootEl.setAttribute("data-arrived", ""),
      onLeaveBack: () => rootEl.removeAttribute("data-arrived"),
    });
    ScrollTrigger.create({
      trigger: main,
      start: "top top",
      end: "bottom bottom",
      onToggle: (self) => rootEl.toggleAttribute("data-journey", self.isActive),
    });
  }

  function chapterIndex(main) {
    const head = main.querySelector(".rp-index-head");
    const titleLines = main.querySelectorAll(".rp-index-title .rp-clip > span");
    if (!reduced) {
      gsap.fromTo(titleLines, { yPercent: 112 }, { yPercent: 0, duration: 1.25, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: head, start: "top 78%", once: true } });
      gsap.fromTo(main.querySelectorAll(".rp-index-lead, .rp-index-foot"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: head, start: "top 80%", once: true } });
    }
    main.querySelectorAll(".rp-index-row").forEach((row) => {
      ScrollTrigger.create({
        trigger: row,
        start: "top 62%",
        end: "bottom 62%",
        onToggle: (self) => {
          row.toggleAttribute("data-active", self.isActive);
          if (!self.isActive) return;
          main.querySelectorAll(".rp-index-plate").forEach((plate) => {
            plate.toggleAttribute("data-shown", plate.dataset.plate === row.dataset.row);
          });
        },
      });
    });
  }

  function chapterHorizontal(main) {
    const section = main.querySelector(".rp-horizontal");
    if (!section) return;
    const panels = [...section.querySelectorAll(".rp-panel")];
    if (coarse) {
      panels.forEach((panel) => {
        gsap.fromTo(panel.querySelectorAll("img, video"), { scale: 1.08, yPercent: -3 }, { scale: 1, yPercent: 3, ease: "none", scrollTrigger: { trigger: panel, start: "top bottom", end: "bottom top", scrub: 0.4 } });
      });
      return;
    }
    const buttons = [...section.querySelectorAll("[data-scene-button]")];
    const lineEl = section.querySelector("[data-rp-scene-line]");
    const st = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => `+=${window.innerWidth * 4.2}`,
      pin: ".rp-horizontal-stage",
      scrub: 0.65,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const active = Math.round(self.progress * 4);
        panels.forEach((panel, i) => {
          panel.toggleAttribute("inert", i !== active);
          panel.setAttribute("aria-hidden", String(i !== active));
        });
        buttons.forEach((b, i) => b.toggleAttribute("aria-current", i === active));
        if (lineEl) lineEl.style.transform = `scaleX(${self.progress})`;
      },
    });
    panels.forEach((panel, i) => {
      gsap.fromTo(panel, { xPercent: i * 100 }, { xPercent: (i - 4) * 100, duration: 4, ease: "none", scrollTrigger: { trigger: section, start: "top top", end: () => `+=${window.innerWidth * 4.2}`, scrub: 0.65, invalidateOnRefresh: true } });
      gsap.fromTo(panel.querySelector(".rp-layer-title"), { x: 90 }, { x: -90, duration: 1, ease: "none", scrollTrigger: { trigger: section, start: () => `top+=${(i / 5) * window.innerWidth * 4.2} top`, end: () => `+=${window.innerWidth * 4.2 / 5}`, scrub: 0.65, invalidateOnRefresh: true } });
      panel.querySelectorAll("img, video").forEach((media) => {
        gsap.fromTo(media, { xPercent: i % 2 ? -7 : 7, scale: 1.18 }, { xPercent: i % 2 ? 7 : -7, scale: 1.06, ease: "none", scrollTrigger: { trigger: section, start: "top top", end: () => `+=${window.innerWidth * 4.2}`, scrub: 0.65, invalidateOnRefresh: true } });
      });
      gsap.fromTo(panel.querySelector(".rp-panel-copy"), { x: 30, y: 30 }, { x: -15, y: -20, ease: "none", scrollTrigger: { trigger: section, start: "top top", end: () => `+=${window.innerWidth * 4.2}`, scrub: 0.65, invalidateOnRefresh: true } });
    });
    buttons.forEach((button, i) => {
      button.addEventListener("click", () => {
        const start = st.start;
        const end = st.end;
        scrollToY(start + ((end - start) * i) / 4, 1.1);
      });
    });
  }

  function chapterWater(main) {
    const section = main.querySelector(".rp-water");
    if (!section) return;
    const visual = section.querySelector(".rp-water-visual");
    const film = section.querySelector(".rp-water-film");
    const title = section.querySelector(".rp-water-title");
    const sheet = section.querySelector(".rp-curve-sheet");
    const sheetTitle = section.querySelector(".rp-curve-title");
    const bottom = section.querySelector(".rp-curve-bottom");
    if (reduced) {
      gsap.set(visual, { clipPath: "none" });
      gsap.set(sheet, { clipPath: "ellipse(140% 160% at 50% 110%)" });
      return;
    }
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${window.innerHeight * 2.8}`,
        pin: ".rp-water-stage",
        scrub: 0.7,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(visual, { clipPath: "inset(8% 6% 8% 6%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "power2.inOut" }, 0)
      .fromTo(film, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: "none" }, 0)
      .fromTo(title, { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power2.out" }, 0.3)
      .to(title, { y: -60, duration: 0.7, ease: "power2.in" }, 1.5)
      .fromTo(sheet, { clipPath: "ellipse(0% 0% at 50% 110%)" }, { clipPath: "ellipse(110% 140% at 50% 110%)", duration: 1.55, ease: "power1.inOut" }, 1.8)
      .fromTo(sheetTitle, { y: 130 }, { y: 0, duration: 1, ease: "power2.out" }, 2.4)
      .fromTo(bottom, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }, 2.6)
      .to({}, { duration: 0.4 }, 3.1);
    section.querySelector("[data-rp-hotspot]")?.addEventListener("click", () => openDialog("pool"));
  }

  function chapterParallax(main) {
    main.querySelectorAll(".rp-parallax").forEach((wrap) => {
      const img = wrap.querySelector("img");
      if (!img || reduced) return;
      gsap.fromTo(img, { yPercent: -5, scale: 1.12 }, { yPercent: 5, scale: 1.03, ease: "none", scrollTrigger: { trigger: wrap.closest("section") ?? wrap, start: "top bottom", end: "bottom top", scrub: 0.65 } });
    });
    main.querySelectorAll(".rp-reveal").forEach((el) => {
      if (reduced) return;
      gsap.fromTo(el, { clipPath: "inset(0 0 100% 0)", y: 45 }, { clipPath: "inset(0 0 0% 0)", y: 0, duration: 1.35, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
    });
  }

  function chapterFamily(main) {
    const section = main.querySelector(".rp-family");
    if (!section || reduced) return;
    gsap.fromTo(section.querySelector(".rp-family-main"), { y: 100 }, { y: -40, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.8 } });
    gsap.fromTo(section.querySelector(".rp-family-inset__image"), { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.65 } });
    gsap.fromTo(section.querySelector(".rp-family-word"), { xPercent: 0 }, { xPercent: -12, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: 0.7 } });
    section.querySelectorAll(".rp-mask-reveal").forEach((el) => {
      gsap.fromTo(el, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 1.4, ease: "power3.inOut", scrollTrigger: { trigger: el, start: "top 85%", once: true } });
    });
  }

  function chapterInteriors(main) {
    const section = main.querySelector(".rp-interiors");
    if (!section) return;
    if (reduced) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${window.innerHeight * 1.5}`,
        pin: ".rp-interior-stage",
        scrub: 0.75,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });
    tl.fromTo(section.querySelector(".rp-interior-wide"), { y: 90, scale: 1.07 }, { y: -70, scale: 1, duration: 1, ease: "none" }, 0)
      .fromTo(section.querySelector(".rp-interior-stage h2"), { x: 50, y: 60 }, { x: -30, y: -15, duration: 1, ease: "none" }, 0)
      .fromTo(section.querySelector(".rp-interior-tall"), { yPercent: 65 }, { yPercent: -10, duration: 1, ease: "none" }, 0)
      .fromTo(section.querySelector(".rp-interior-bedroom"), { yPercent: 100 }, { yPercent: 0, duration: 0.5, ease: "none" }, 0.5)
      .fromTo(section.querySelector(".rp-interior-caption"), { y: 70 }, { y: -20, duration: 1, ease: "none" }, 0);
  }

  function chapterEssentials(main) {
    if (reduced) return;
    main.querySelectorAll(".rp-essential-fact").forEach((fact) => {
      gsap.fromTo(fact, { y: 45, clipPath: "inset(0 0 100% 0)" }, { y: 0, clipPath: "inset(0 0 0% 0)", ease: "none", scrollTrigger: { trigger: fact, start: "top 92%", end: "top 55%", scrub: 0.5 } });
    });
  }

  function chapterConnected(main) {
    const section = main.querySelector(".rp-connected");
    if (!section || reduced) return;
    gsap.fromTo(section.querySelectorAll(".rp-place-line i"), { scaleX: 0 }, { scaleX: 1, duration: 1.3, stagger: 0.2, ease: "power2.out", scrollTrigger: { trigger: section.querySelector(".rp-place-line"), start: "top 85%", once: true } });
    gsap.fromTo(section.querySelectorAll(".rp-connections article"), { y: 70, clipPath: "inset(0 0 100% 0)" }, { y: 0, clipPath: "inset(0 0 0% 0)", duration: 1.1, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: section.querySelector(".rp-connections"), start: "top 85%", once: true } });
  }

  function chapterMap(main) {
    const section = main.querySelector(".rp-map");
    if (!section || reduced) return;
    const plate = section.querySelector(".rp-map-plate");
    const img = section.querySelector(".rp-map-plate img");
    const marks = section.querySelectorAll(".rp-map-mark");
    gsap.fromTo(plate, { clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)", duration: 1.5, ease: "power3.inOut", scrollTrigger: { trigger: section.querySelector(".rp-map-figure"), start: "top 82%", once: true } });
    gsap.fromTo(img, { scale: 1.06 }, { scale: 1, ease: "none", scrollTrigger: { trigger: section.querySelector(".rp-map-figure"), start: "top bottom", end: "bottom top", scrub: 0.8 } });
    gsap.fromTo(marks, { autoAlpha: 0, scale: 0.72 }, { autoAlpha: 1, scale: 1, duration: 0.8, stagger: 0.11, ease: "power2.out", scrollTrigger: { trigger: section.querySelector(".rp-map-figure"), start: "top 58%", once: true } });
  }

  function chapterFinale(main, rootEl) {
    const section = main.querySelector(".rp-finale");
    if (!section) return;
    const image = section.querySelector(".rp-final-image");
    const word = section.querySelector(".rp-final-word");
    const portal = section.querySelector("[data-rp-portal]");
    const mask = section.querySelector("[data-rp-mask]");
    const content = section.querySelector("[data-rp-content]");
    const still = section.querySelector("[data-rp-b]");
    const capture = section.querySelector("[data-rp-a]");
    if (reduced) {
      gsap.set(image, { clipPath: "none" });
      gsap.set(portal, { display: "none" });
      return;
    }
    gsap.fromTo(image, { clipPath: "inset(15% 0 15% 0 round 50% 50% 0 0)" }, { clipPath: "inset(0% 0 0% 0 round 50% 50% 0 0)", ease: "none", scrollTrigger: { trigger: section, start: "top 90%", end: "top 20%", scrub: 0.7 } });
    gsap.fromTo(word, { yPercent: 15 }, { yPercent: -10, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom bottom", scrub: 0.7 } });
    const span = window.innerHeight * (coarse ? 0.9 : 1.5);
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "bottom bottom",
        end: () => `+=${span}`,
        pin: true,
        pinSpacing: true,
        anticipatePin: 0,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          rootEl.toggleAttribute("data-arch-pinned", self.isActive && self.progress < 0.99);
          if (self.progress >= 0.999 && !rootEl.hasAttribute("data-arrived")) {
            rootEl.setAttribute("data-arrived", "");
          }
        },
      },
    });
    const setMask = () => {
      const r = section.getBoundingClientRect();
      mask.style.clipPath = `inset(${Math.max(0, r.top)}px 0px 0px 0px)`;
    };
    setMask();
    ScrollTrigger.addEventListener("refresh", setMask);
    const cap = { c: 0, p1: 0, p2: 0 };
    const apply = () => {
      const s = 1 + 0.08 * cap.c;
      content.style.transform = `scale(${s.toFixed(4)})`;
      still.style.opacity = String(cap.p1);
      capture.style.opacity = String(1 - cap.p1 * 0.9);
      portal.style.opacity = String(1 - cap.p2);
      portal.style.transform = `scale(${(1 + cap.p2 * 0.04).toFixed(4)})`;
    };
    tl.to({}, { duration: 1 }, 0);
    tl.to(cap, { c: 1, p1: 1, duration: 0.5, ease: "power2.inOut", onUpdate: apply }, 0.2);
    tl.to(cap, { p2: 0.25, duration: 0.2, ease: "power1.in", onUpdate: apply }, 0.7);
    tl.to(cap, { p2: 1, duration: 0.1, onUpdate: apply }, 0.9);
    tl.fromTo(section.querySelector(".rp-final-intro"), { opacity: 0 }, { opacity: 1, duration: 0.16 }, 0.2);
    tl.fromTo(section.querySelector(".rp-final-call"), { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.16 }, 0.24);
    tl.fromTo(section.querySelector(".rp-final-base"), { opacity: 0 }, { opacity: 1, duration: 0.14 }, 0.26);
    section.querySelector("[data-rp-restart]")?.addEventListener("click", () => {
      const trigger = tl.scrollTrigger;
      if (trigger) scrollToY(trigger.end, 1.4);
    });
  }

  /* ---------- dialogs ---------- */
  function buildChrome() {
    const dialog = document.querySelector("[data-repose-modal]");
    const body = document.querySelector("[data-dialog-body]");
    const open = (html) => {
      if (!dialog || !body) return;
      body.innerHTML = html;
      dialog.hidden = false;
      document.body.classList.add("rp-modal-open");
      lockScroll();
    };
    const close = () => {
      if (!dialog) return;
      dialog.hidden = true;
      document.body.classList.remove("rp-modal-open");
      unlockScroll();
    };
    dialog?.querySelector("[data-dialog-close]")?.addEventListener("click", close);
    dialog?.querySelector("[data-dialog-overlay]")?.addEventListener("click", close);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !dialog?.hidden) close();
    });
    window.__reposeOpenDialog = open;

    const menu = root.querySelector("[data-rp-menu]");
    menu?.addEventListener("click", () => {
      open(`<h3>The chapters</h3><ol>${[...root.querySelectorAll("[data-chapter]")]
        .map((s) => {
          const title = s.querySelector("h1, h2")?.textContent?.trim() ?? "";
          return `<li><button type="button" data-goto="${s.id}"><span class="rp-dialog__num">${s.dataset.chapter}</span><span class="rp-dialog__name">${title}</span></button></li>`;
        })
        .join("")}</ol>`);
      body?.querySelectorAll("[data-goto]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = document.getElementById(btn.dataset.goto);
          close();
          if (target) window.setTimeout(() => scrollToY(offsetTop(target), 1.2), 60);
        });
      });
    });
    root.querySelector("[data-rp-enquire]")?.addEventListener("click", () => open(enquireHtml()));
    root.querySelector("[data-rp-brand]")?.addEventListener("click", () => {
      const life = document.getElementById("life");
      if (life) scrollToY(offsetTop(life), 1.2);
    });
    root.querySelector("[data-rp-rhythm-link]")?.addEventListener("click", () => {
      const rhythm = document.getElementById("rhythm");
      if (rhythm) scrollToY(offsetTop(rhythm), 1.2);
    });
    window.__reposeDialogClose = close;
  }

  function openDialog(kind) {
    const html =
      kind === "pool"
        ? `<h3>The pool</h3><p>All-weather, temperature controlled, and open from early until late. The pool deck sits at the centre of the podium, ringed by planting and shade.</p><p class="rp-micro">Podium level · Open 06:00 – 22:00</p>`
        : enquireHtml();
    window.__reposeOpenDialog?.(html);
  }

  const enquireHtml = () => `
    <h3>Enquire about Reposé</h3>
    <p>Our sales team will walk you through availability, floorplates, and payment plans.</p>
    <p><a href="mailto:sales@example.com">sales@example.com</a><br /><a href="tel:+971500000000">+971 50 000 0000</a></p>
    <p><a href="https://wa.me/971500000000" target="_blank" rel="noopener noreferrer">Talk to us on WhatsApp ↗</a></p>`;

  /* ---------- closing + walkthrough ---------- */
  function buildClosing() {
    const closing = root.querySelector("[data-closing]");
    if (closing) {
      ScrollTrigger.create({
        trigger: ".arrival",
        start: "top 60%",
        onEnter: () => closing.setAttribute("data-shown", ""),
        onLeaveBack: () => closing.removeAttribute("data-shown"),
      });
    }
    const ws = document.querySelector("[data-ws-root]");
    let index = 0;
    let activeVideo = null;
    const show = (i) => {
      const item = WALKTHROUGHS[(i + WALKTHROUGHS.length) % WALKTHROUGHS.length];
      index = (i + WALKTHROUGHS.length) % WALKTHROUGHS.length;
      if (!ws) return;
      const picture = ws.querySelector("[data-ws-picture]");
      activeVideo?.pause?.();
      picture.innerHTML = `<video src="${item.src}" poster="${item.poster}" controls playsinline preload="metadata"></video>`;
      activeVideo = picture.querySelector("video");
      ws.querySelector("[data-ws-index]").textContent = item.index;
      ws.querySelector("[data-ws-title]").textContent = item.title;
      ws.querySelector("[data-ws-subtitle]").textContent = item.subtitle;
      ws.querySelectorAll("[data-ws-dots] i").forEach((dot, di) => dot.toggleAttribute("data-active", di === index));
    };
    const openWs = () => {
      if (!ws) return;
      ws.hidden = false;
      ws.querySelector("[data-ws-dots]").innerHTML = WALKTHROUGHS.map(() => "<i></i>").join("");
      show(0);
      lockScroll();
      if (!reduced) {
        gsap.fromTo("[data-ws-frame]", { scale: 1.045, filter: "blur(6px)" }, { scale: 1, filter: "blur(0px)", duration: 0.8, ease: "power3.out" });
        gsap.fromTo(".ws__foot, .ws__top", { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.08, ease: "power3.out" });
      }
    };
    const closeWs = () => {
      if (!ws) return;
      activeVideo?.pause?.();
      ws.hidden = true;
      unlockScroll();
    };
    root.querySelector("[data-closing-watch]")?.addEventListener("click", openWs);
    ws?.querySelector("[data-ws-close]")?.addEventListener("click", closeWs);
    ws?.querySelector("[data-ws-prev]")?.addEventListener("click", () => show(index - 1));
    ws?.querySelector("[data-ws-next]")?.addEventListener("click", () => show(index + 1));
    window.addEventListener("keydown", (e) => {
      if (ws?.hidden) return;
      if (e.key === "Escape") closeWs();
      if (e.key === "ArrowLeft") show(index - 1);
      if (e.key === "ArrowRight") show(index + 1);
    });
    root.querySelector("[data-closing-restart]")?.addEventListener("click", () => {
      scrollToY(0, 1.6);
    });
  }

  ScrollTrigger.sort();
  ScrollTrigger.refresh(true);
  if (document.fonts?.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());

  return { root };
}
