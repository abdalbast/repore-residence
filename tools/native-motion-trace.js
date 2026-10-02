import('/assets/vendor-gsap-CeZ-nkAJ.js').then(({ n: ScrollTrigger, t: gsap }) => {
  if (window.__reposeNativeMotionProbe) throw new Error('A native motion probe is already active');
  const label = (element) => element instanceof Element
    ? (element.id ? `#${element.id}` : `${element.localName}.${[...element.classList].join('.')}`)
    : 'scalar';
  const scalar = (target) => target && Object.getPrototypeOf(target) === Object.prototype
    ? Object.fromEntries(Object.entries(target).filter(([key, value]) =>
      !key.startsWith('_') && ['number', 'string', 'boolean'].includes(typeof value)))
    : null;
  const result = {
    method: 'Normal GSAP ticker and native wheel delivery; no forced scrub, animation, video or CSS state',
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, clientWidth: document.documentElement.clientWidth },
    startedAt: performance.now(),
    wheelEvents: [],
    frames: [],
  };
  const wheel = (event) => result.wheelEvents.push({ t: performance.now(), deltaY: event.deltaY, y: scrollY });
  const record = () => {
    const occurrences = new Map();
    result.frames.push({
      t: performance.now(),
      y: scrollY,
      triggers: ScrollTrigger.getAll().map((trigger) => {
        const identity = `${label(trigger.trigger)}|${trigger.start}|${trigger.end}`;
        const ordinal = occurrences.get(identity) ?? 0;
        occurrences.set(identity, ordinal + 1);
        const animations = trigger.animation
          ? [trigger.animation, ...(trigger.animation.getChildren?.(true, true, false) ?? [])]
          : [];
        return {
          id: `${identity}|${ordinal}`,
          start: trigger.start,
          end: trigger.end,
          progress: trigger.progress,
          animationProgress: trigger.animation?.totalProgress() ?? null,
          scalars: animations.flatMap((animation) => (animation.targets?.() ?? []).map(scalar).filter(Boolean)),
        };
      }),
    });
    if (result.frames.length >= 420) stop();
  };
  const stop = () => {
    gsap.ticker.remove(record);
    window.removeEventListener('wheel', wheel, true);
    result.stoppedAt = performance.now();
    return result;
  };
  window.__reposeNativeMotionProbe = { stop, result };
  window.addEventListener('wheel', wheel, { capture: true, passive: true });
  gsap.ticker.add(record);
  return { started: true, viewport: result.viewport };
});
