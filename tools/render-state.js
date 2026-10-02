(() => {
  const path = (element) => {
    if (element.id) return `#${element.id}`;
    const parts = [];
    for (let node = element; node; node = node.parentElement) {
      if (node.id) { parts.unshift(`#${node.id}`); break; }
      const siblings = node.parentElement?.children;
      const index = siblings ? [...siblings].indexOf(node) + 1 : 1;
      parts.unshift(`${node.localName}:nth-child(${index})`);
    }
    return parts.join('>');
  };
  const normalize = (value) => value.replaceAll(location.origin, '');
  const styles = (element, pseudo) => {
    const computed = getComputedStyle(element, pseudo);
    return Object.fromEntries([...computed].map((name) => [name, normalize(computed.getPropertyValue(name))]));
  };
  const elements = new Set();
  for (const element of document.querySelectorAll('body *')) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth) {
      for (let node = element; node; node = node.parentElement) elements.add(node);
    }
  }
  return {
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio, y: scrollY, clientWidth: document.documentElement.clientWidth },
    fonts: { status: document.fonts.status, faces: [...document.fonts].map((font) => ({ family: font.family, style: font.style, weight: font.weight, status: font.status })) },
    elements: [...elements].map((element) => {
      const pseudo = {};
      for (const name of ['::before', '::after']) {
        const content = getComputedStyle(element, name).content;
        if (content !== 'none' && content !== 'normal') pseudo[name] = styles(element, name);
      }
      return {
        path: path(element),
        text: [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join(''),
        inlineStyle: normalize(element.getAttribute('style') ?? ''),
        rect: element.getBoundingClientRect().toJSON(),
        computed: styles(element),
        pseudo,
      };
    }),
  };
})()
