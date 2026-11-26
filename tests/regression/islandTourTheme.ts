// island-tour.html: the colour scheme and material checks (?theme=, ?bg=, ?material=).
/**
 * The island's tone follows what it is drawn on: a light scheme, or a light background the user
 * picked in any scheme (the original report: a white island in the dark scheme). Its text stays readable.
 */
export function checkTone(check: (condition: unknown, message: string) => void, light: boolean) {
  const luminance = (color: string) => {
    // color-mix() values come back as color(srgb r g b) on a 0-1 scale.
    const scale = color.startsWith("color(") ? 1 : 255;
    const [r, g, b] = (color.match(/[\d.]+/g) ?? []).map(Number).map((channel) => {
      const value = channel / scale;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const stage = document.querySelector<HTMLElement>(".stage")!;
  const island = document.querySelector<HTMLElement>(".island")!;
  check(stage.dataset.tone === (light ? "light" : "dark"), `Island tone follows background (data-tone=${stage.dataset.tone})`);
  const background = luminance(getComputedStyle(island).backgroundColor);
  const probe = document.createElement("span");
  probe.style.color = "var(--text-3)";
  island.append(probe);
  const text = luminance(getComputedStyle(probe).color);
  probe.remove();
  const contrast = (Math.max(background, text) + 0.05) / (Math.min(background, text) + 0.05);
  check(contrast >= 4.5, `Tertiary text on island remains legible (${contrast.toFixed(1)}:1)`);
}

/**
 * The glass materials (?material=): drawn in CSS without any blur, liquid glass and prism nearly
 * clear with a lit rim, frosted glass and aurora mostly opaque. <html> carries the material for the
 * other windows.
 */
export function checkMaterial(check: (condition: unknown, message: string) => void, material: string) {
  const island = document.querySelector<HTMLElement>(".island")!;
  const style = getComputedStyle(island);
  check(island.classList.contains(`island--material-${material}`) && document.documentElement.dataset.material === material,
    `Island and page are both marked with the material (${material})`);
  check(document.querySelector(".island__glass") && style.backdropFilter === "none", "Glass drawn with CSS only without blurring desktop");
  const alpha = Number((style.backgroundColor.match(/[\d.]+/g) ?? [])[3] ?? 1);
  const clear = material === "liquidGlass" || material === "prism";
  check(clear ? alpha < 0.5 : alpha >= 0.6, `Glass background opacity is appropriate (${alpha.toFixed(2)})`);
  // Inner panels (translation, the file shelf) swap their deep base (0.88) for a faint white mist.
  const probe = document.createElement("div");
  probe.style.background = "var(--inner-panel-fill)";
  island.append(probe);
  const probeStyle = getComputedStyle(probe);
  const layers = [...`${probeStyle.backgroundColor} ${probeStyle.backgroundImage}`.matchAll(/rgba?\(([^)]+)\)/g)]
    .map(([, channels]) => channels.split(",").map(Number)).filter((channels) => (channels[3] ?? 1) > 0);
  probe.remove();
  const veil = Math.max(0, ...layers.map((channels) => channels[3] ?? 1));
  check(layers.length > 0 && veil < 0.4 && layers.every(([red, green, blue]) => Math.min(red, green, blue) >= 200),
    `Inner glass panels are translucent white haze, not dark boxes (${veil.toFixed(2)})`);
  if (clear || material === "aurora") {
    const rim = document.querySelector(".island__glass-refraction");
    check(rim && getComputedStyle(rim).boxShadow.includes("inset"), `${material} has a lit rim`);
  }
  if (material === "aurora" || material === "prism") {
    // The gradient rim is a masked ring (a box-shadow cannot be a gradient).
    const ring = getComputedStyle(document.querySelector(".island__glass-refraction")!, "::after");
    check(ring.backgroundImage.includes("linear-gradient") && ring.maskComposite.includes("exclude"), `${material} draws its gradient rim as a masked ring`);
    const colour = Number(getComputedStyle(island).getPropertyValue("--glass-colour-alpha"));
    check(colour > 0.1, `${material} has its colour switched on (${colour.toFixed(2)})`);
  }
}
