import('/assets/vendor-gsap-CeZ-nkAJ.js').then(({ n: ScrollTrigger }) => {
  const label = (element) => {
    if (!(element instanceof Element)) return null;
    if (element.id) return `#${element.id}`;
    return `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`;
  };
  const scalarVars = (vars) => Object.fromEntries(
    Object.entries(vars).filter(([key, value]) =>
      !['onUpdate', 'onComplete', 'onStart', 'scrollTrigger'].includes(key)
      && ['string', 'number', 'boolean'].includes(typeof value)),
  );
  const describeAnimation = (animation) => animation ? {
    duration: animation.duration(),
    delay: animation.delay(),
    vars: scalarVars(animation.vars),
    children: animation.getChildren?.(true, true, false).map((child) => ({
      start: child.startTime(),
      duration: child.duration(),
      delay: child.delay(),
      targets: child.targets().map(label).filter(Boolean),
      vars: scalarVars(child.vars),
    })) ?? [],
  } : null;
  return {
    viewport: {
      width: innerWidth,
      height: innerHeight,
      dpr: devicePixelRatio,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      fonts: document.fonts.status,
    },
    triggers: ScrollTrigger.getAll().map((trigger) => ({
      trigger: label(trigger.trigger),
      start: trigger.start,
      end: trigger.end,
      scrub: trigger.vars.scrub ?? null,
      once: trigger.vars.once ?? false,
      pin: label(trigger.pin),
      refreshPriority: trigger.vars.refreshPriority ?? 0,
      animation: describeAnimation(trigger.animation),
    })),
    sections: [...document.querySelectorAll('section[id]')].map((section) => ({
      id: section.id,
      top: section.getBoundingClientRect().top + scrollY,
      height: section.getBoundingClientRect().height,
    })),
    cssAnimations: [...document.getAnimations()].map((animation) => ({
      name: animation.animationName ?? null,
      target: label(animation.effect?.target),
      timing: animation.effect?.getTiming(),
    })),
  };
})
