import('/assets/vendor-gsap-CeZ-nkAJ.js').then(({ n: ScrollTrigger }) => {
  const label = (element) => element instanceof Element
    ? (element.id ? `#${element.id}` : `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`)
    : null;
  const scalarTarget = (target) => target && Object.getPrototypeOf(target) === Object.prototype
    ? Object.fromEntries(Object.entries(target).filter(([key, value]) =>
      !key.startsWith('_') && ['number', 'string', 'boolean'].includes(typeof value)))
    : null;
  const properties = [
    'transform', 'transformOrigin', 'translate', 'rotate', 'scale',
    'opacity', 'visibility', 'clipPath', 'filter', 'backdropFilter',
    'width', 'height', 'overflow', 'objectFit', 'objectPosition', 'borderRadius',
    'color', 'backgroundColor', 'boxShadow', 'fill', 'stroke', 'strokeDashoffset',
  ];
  const elements = new Set(document.querySelectorAll(
    '.rp-portal, .rp-portal-mask, .rp-portal-content, .rp-portal-capture, .rp-portal-still',
  ));
  const triggers = ScrollTrigger.getAll().map((trigger) => {
    const animations = trigger.animation
      ? [trigger.animation, ...(trigger.animation.getChildren?.(true, true, false) ?? [])]
      : [];
    return {
      trigger: label(trigger.trigger),
      start: trigger.start,
      end: trigger.end,
      progress: trigger.progress,
      animations: animations.map((animation) => ({
        progress: animation.totalProgress(),
        targets: (animation.targets?.() ?? []).map((target) => {
          if (target instanceof Element) elements.add(target);
          return label(target) ?? scalarTarget(target);
        }).filter((target) => target !== null),
      })),
    };
  });
  for (const media of document.querySelectorAll('img, video')) {
    const rect = media.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < innerHeight) elements.add(media);
  }
  const cssAnimations = document.getAnimations().map((animation) => {
    const target = animation.effect?.target;
    if (target instanceof Element) elements.add(target);
    return {
      name: animation.animationName ?? animation.id,
      target: label(target),
      pseudoElement: animation.effect?.pseudoElement ?? null,
      currentTime: animation.currentTime,
      playbackRate: animation.playbackRate,
      playState: animation.playState,
      timing: animation.effect?.getComputedTiming() ?? null,
    };
  });
  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, y: scrollY },
    triggers,
    cssAnimations,
    elements: [...elements].map((element) => {
      const computed = getComputedStyle(element);
      return {
        element: label(element),
        style: element.getAttribute('style'),
        source: element instanceof HTMLImageElement && element.currentSrc
          ? new URL(element.currentSrc).pathname : null,
        image: element instanceof HTMLImageElement ? {
          complete: element.complete,
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          loading: element.loading,
          decoding: element.decoding,
        } : null,
        video: element instanceof HTMLVideoElement ? {
          source: element.currentSrc ? new URL(element.currentSrc).pathname : null,
          currentTime: element.currentTime,
          paused: element.paused,
          readyState: element.readyState,
          error: element.error?.code ?? null,
        } : null,
        rect: element.getBoundingClientRect().toJSON(),
        computed: Object.fromEntries(properties.map((property) => [property, computed[property]])),
      };
    }),
  };
});
