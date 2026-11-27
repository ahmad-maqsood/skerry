// pnpm dev, then open /tests/regression/island-tour.html. The whole island with believable data
// behind a fake desktop, for looking at every page by eye: ?media=playing|paused|nocover|long|
// nolyrics|none picks what the player reports (?lyrics=0 turns online lyrics off), ?empty=1 empties every list, ?lang=en switches the
// interface, ?detached=1 floats the island below the top edge, ?capsule=1 picks the capsule shape. With ?test=1 it opens each page and
// checks that nothing sticks out of the island's rounded shape.
import { checkClockWeatherIsland, clockWeatherMock } from "./clockWeatherIsland";
import { act, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import "../../src/styles/tokens.css";
import "../../src/styles/base.css";
import { I18nProvider, LOCALE_STORAGE_KEY } from "../../src/i18n";
import { trackIslandTopEdge } from "../../src/windows/island/topEdge";
import { checkTuckMorph } from "./islandTourTuck";
import { checkCollapsedShape } from "./islandTourShape";
import { checkMaterial, checkTone } from "./islandTourTheme";
import { TOUR_CLIPBOARD, TOUR_LRC, TOUR_SHELF, TOUR_TODOS, tourMediaState, type TourMedia } from "./islandTourMocks";

const query = new URLSearchParams(location.search);
const automated = query.has("test");
const empty = query.has("empty");
const media = (query.get("media") ?? "playing") as TourMedia;
const customNotch = query.has("notch");
const fontPercent = Number(query.get("font")) || 100;
// ?theme=dark|light|system picks the colour scheme, ?bg=FFFFFF a background colour of the user's own,
// ?material=liquidGlass|frostedGlass|aurora|prism the material.
// ?tuck=line|hidden picks the tucked look (default edge).
const tuckStyle = query.get("tuck") ?? "edge";
Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: automated });

// The tour writes the island's own keys; whatever the browser profile had comes back on leaving.
const original = new Map(Object.entries(localStorage).filter(([key]) => key.startsWith("skerry-")));
const restore = () => {
  for (const key of Object.keys(localStorage).filter((key) => key.startsWith("skerry-"))) localStorage.removeItem(key);
  for (const [key, value] of original) localStorage.setItem(key, value);
};
window.addEventListener("beforeunload", restore);
for (const key of original.keys()) localStorage.removeItem(key);

const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
localStorage.setItem(LOCALE_STORAGE_KEY, "en");
localStorage.setItem("skerry-current-date", date);
// The clock is on by default and adds width; the exact 240px notch check needs it off (the clockWeather run turns it on itself).
if (customNotch && !query.has("clockWeather")) localStorage.setItem("skerry-clock-weather", JSON.stringify({ showClock: false }));
// This tour exercises the embedded settings page even though new users get a separate window.
localStorage.setItem("skerry-detached-settings", "false");
// Exercise the explicitly selected style after the one-time default migration.
localStorage.setItem("skerry-todos", JSON.stringify(empty ? [] : TOUR_TODOS));
localStorage.setItem("skerry-qq-notification-access-requested", "true");
// Lyrics are looked up online unless ?lyrics=0; the mock answers for Sunny only.
// ?cover=1 shows the song's cover on the collapsed island; ?priority=lyrics,todo reorders it,
// ?layout=music,text,mail,shelf,clock,weather,system arranges it; ?scale=0.85…1.2 sets the expanded size.
localStorage.setItem("skerry-settings", JSON.stringify({
  ...(query.get("scale") ? { expandedScale: Number(query.get("scale")) } : {}),
  ...(customNotch ? { collapsedAutoWidth: false, collapsedWidth: 240, collapsedHeight: 32 } : {}),
  islandFontPercent: fontPercent,
  ...(query.get("theme") ? { colorScheme: query.get("theme") } : {}),
  ...(query.get("bg") ? { islandBackgroundColor: `#${query.get("bg")}` } : {}),
  ...(query.get("material") ? { material: query.get("material") } : {}),
  topEdgeShoulders: query.has("shoulders"), topEdgeShoulderSize: 20,
  ...(query.has("capsule") ? { islandShape: "capsule" } : {}),
  tuckStyle,
  // Capsules are what this tour's geometry checks look at; the default (icons) is covered below.
  pageButtonStyle: "capsule",
  lyricsOnline: query.get("lyrics") !== "0",
  lyricsOnMusicPage: query.get("lyrics") !== "0",
  collapsedShowCover: query.get("cover") === "1",
  ...(query.get("priority") ? { collapsedPriority: query.get("priority")!.split(",") } : {}),
  ...(query.get("layout") ? { collapsedLayout: query.get("layout")!.split(",") } : {}),
}));
// A colour of the user's own survives the one-time colour refresh (storage.ts) as it would for a real user.
if (query.has("bg")) localStorage.setItem("skerry-color-refresh-v1", "1");
if (query.has("detached")) localStorage.setItem("skerry-position", JSON.stringify({ x: 300, y: 60 }));

let revision = 0;
let windowDrags = 0;
let interaction: Record<string, unknown> = {};
mockIPC((command, payload) => {
  const args = (payload ?? {}) as Record<string, unknown>;
  switch (command) {
    case "get_current_weather": return clockWeatherMock.current();
    case "plugin:app|version": return "0.1.0";
    case "get_media_diagnostics": return { players: [] };
    case "get_launch_at_startup": return false;
    case "get_default_todo_save_directory": return "D:\\Notes";
    case "get_clipboard_history": return empty ? { ...TOUR_CLIPBOARD, items: [] } : TOUR_CLIPBOARD;
    case "delete_clipboard_history_items": return { ...TOUR_CLIPBOARD, items: TOUR_CLIPBOARD.items.filter((item) => !(args.ids as string[]).includes(item.id)) };
    case "read_clipboard_history_image": return TOUR_CLIPBOARD.items.find((item) => item.id === args.id)?.image?.thumbnailDataUrl ?? "";
    case "get_file_shelf": return { items: empty ? [] : TOUR_SHELF };
    case "list_plugin_views": return { views: [], status: [] };
    case "get_media_state":
    case "media_play_pause":
    case "media_next":
    case "media_previous": return tourMediaState(empty ? "none" : media);
    case "get_audio_level": return { active: media !== "paused" && media !== "none" && !empty, peak: 0.4 + Math.random() * 0.4, updatedAt: Date.now() };
    case "get_lyrics": return (args.query as { title?: string } | undefined)?.title === "Yesterday" ? { source: "lrclib", lrc: TOUR_LRC } : null;
    case "get_foreground_fullscreen": return { active: false, onIslandMonitor: false };
    case "set_island_interaction": interaction = args; return "disabled";
    case "start_island_drag": windowDrags++; return null;
    case "get_island_top_attachment": return !query.has("detached");
    case "get_system_notifications_state":
    case "set_system_notifications_enabled":
      return { revision: ++revision, enabled: true, status: "listening", hideText: false, mutedApps: [], knownApps: [{ appId: "tour.app", appDisplayName: "Demo App" }], items: empty ? [] : [{ id: 1, appId: "tour.app", appDisplayName: "Demo App", title: "Project Notice", bodyLines: ["Meeting at 3pm"], timestamp: Date.now() - 60000, appLogo: null }] };
    case "has_translation_secret": return false;
    case "set_translation_shortcut": return args.shortcut;
    case "read_translation_clipboard": return "";
    case "updater_configured": return query.has("update") && !empty;
    case "updater_check": return { version: "0.1.1", body: null };
    case "updater_download": return null;
    case "plugin:window|is_visible": return true;
    default: return null;
  }
}, { shouldMockEvents: true });
mockWindows("main");
// Initialize the updater after IPC mocks exist, so ?update=1 exercises its real startup path.
const { IslandApp } = await import("../../src/windows/island/IslandApp");
// As main.tsx does: the attached / detached look follows the (mocked) native answer.
trackIslandTopEdge();

const root = createRoot(document.getElementById("root")!);
const mount = () => root.render(<StrictMode><I18nProvider><IslandApp /></I18nProvider></StrictMode>);

const results = document.getElementById("results")!;
const messages: string[] = [];
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
  messages.push(`PASS ${message}`);
};
const settle = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
const click = async (selector: string) => {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  await act(async () => { element.click(); });
  // The island's height and radius animate for 560ms; measure once they have settled.
  await settle(700);
};

// Product decision (2026-11-13): the island's opening/closing is an exception to reduced motion.
function checkShapeMotion(expectedSeconds: number) {
  const style = getComputedStyle(document.querySelector<HTMLElement>(".island")!);
  const properties = style.transitionProperty.split(",").map((value) => value.trim());
  const durations = style.transitionDuration.split(",").map(Number.parseFloat);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  check(["width", "height", "border-radius"].every((property) => {
    const index = properties.indexOf(property);
    return index >= 0 && durations[index % durations.length] > 0 && durations[index % durations.length] === expectedSeconds;
  }), `Island shape transitions fully (reduce=${reduce}; property=${style.transitionProperty}; duration=${style.transitionDuration})`);
  check(interaction.animatePosition === true, `Edge tuck and slide-out always request position animation (reduce=${reduce})`);
}

/** Elements of the open page that reach outside the island's box, or past its rounded bottom corners. */
function strays() {
  const island = document.querySelector<HTMLElement>(".island")!;
  const box = island.getBoundingClientRect();
  const radius = Number.parseFloat(getComputedStyle(island).borderBottomLeftRadius) || 0;
  // The page panel is scaled (the expanded size); the island's own box and radius are not.
  const panel = document.querySelector<HTMLElement>(".island__expanded")!;
  const scale = panel.getBoundingClientRect().width / panel.offsetWidth || 1;
  const out: string[] = [];
  for (const element of document.querySelectorAll<HTMLElement>(".island__content > *, .island__content > * > *")) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const name = element.className.toString().split(" ")[0] || element.tagName;
    if (rect.left < box.left - 0.5 || rect.right > box.right + 0.5 || rect.bottom > box.bottom + 0.5) out.push(`${name} outside`);
    // A box whose bottom corner sits inside the island's corner square must itself be rounded enough.
    const inCornerX = Math.min(rect.left - box.left, box.right - rect.right);
    const inCornerY = box.bottom - rect.bottom;
    if (inCornerX < radius && inCornerY < radius) {
      // The island's corner, |x|^n + |y|^n <= r^n with n = 2^1.6 (about 3), from the corner's centre.
      const dx = radius - inCornerX;
      const dy = radius - inCornerY;
      const own = (Number.parseFloat(getComputedStyle(element).borderBottomLeftRadius) || 0) * scale;
      // The element's own corner pulls its outermost point in by about 0.16 of its radius on each axis.
      const pull = own * 0.16;
      if ((dx - pull) ** 3 + (dy - pull) ** 3 > radius ** 3 && getComputedStyle(element).backgroundColor !== "rgba(0, 0, 0, 0)") out.push(`${name} past the corner`);
    }
  }
  return out;
}

if (!automated) {
  mount();
  results.remove();
} else {
  try {
    await act(async () => { mount(); });
    await settle(300);
    const island = () => document.querySelector<HTMLElement>(".island")!;
    const panel = () => document.querySelector<HTMLElement>(".island__expanded")!;
    if (query.has("clockWeather")) await checkClockWeatherIsland(check, settle);
    const collapsed = island().getBoundingClientRect();
    const collapsedRadius = Number.parseFloat(getComputedStyle(island()).borderBottomLeftRadius);
    const expectedHeight = customNotch ? 32 : 38;
    checkShapeMotion(0.38);
    checkCollapsedShape(query.has("capsule"), { island: island(), expectedHeight, interaction, check });
    const bar = document.querySelector<HTMLElement>(".island__collapsed")!;
    if (customNotch) {
      const title = bar.querySelector<HTMLElement>(".island__active-task, .island__todo-count, .collapsed-lyric")!;
      check((collapsed.width === 240 || query.has("clockWeather") && collapsed.width <= 480) && interaction.collapsedWidth === collapsed.width && interaction.collapsedHeight === expectedHeight &&
        Math.abs(parseFloat(getComputedStyle(title).fontSize) - 13 * fontPercent / 100) < 0.01,
      "Custom notch size is also sent to the native window, and text uses its own font size");
    }
    const barItems = [...bar.querySelectorAll<HTMLElement>("button, .island__pulse")].map((item) => item.getBoundingClientRect()).filter((rect) => rect.width > 0);
    check(barItems.every((rect) => rect.left >= collapsed.left + 10 && rect.right <= collapsed.right - 10), "Collapsed island content maintains clearance from corner curves");

    if (query.has("update")) {
      check(document.querySelector(".dot-button--todo .island-update-dot") && document.querySelector(".island__collapsed .island-update-dot"),
        "A new update shows a red dot on the todo entry and on the collapsed island");
    }
    await click(".island__open-button");
    check(island().classList.contains("island--expanded"), "Expands after click");
    if (query.has("update")) {
      await click(".dot-button--todo");
      check(document.querySelector(".dot-button--todo .island-update-dot") && document.querySelector(".todo-update-dot"),
        "After entering todos, the entry dot and the update button dot both stay until installed");
    }
    checkShapeMotion(0.56);
    if (query.has("theme") || query.has("bg")) checkTone(check, query.get("theme") === "light" || (query.get("bg") ?? "").toUpperCase() === "FFFFFF");
    if (query.get("material")) checkMaterial(check, query.get("material")!);
    const panelMotion = getComputedStyle(panel());
    check(panelMotion.transitionProperty === "opacity, transform" && panelMotion.transitionDuration === "0.24s, 0.42s"
      && panelMotion.transitionDelay === "0.12s, 0.08s", "Expanded panel fades in fully, keeping its original duration and delay");
    check(Number.parseFloat(getComputedStyle(island()).borderBottomLeftRadius) > collapsedRadius, "Expanded corner radius is larger than collapsed");
    await checkTuckMorph({ tuckStyle, island, check, settle, interaction: () => interaction, click, checkShapeMotion });
    check(interaction.isTucked === false && interaction.animatePosition === true, "Sliding out from edge requests position animation");
    // The page dots can be dragged into another order, which is saved; the drag opens no page.
    const dotOrder = () => [...document.querySelectorAll<HTMLElement>(".editor-dots .dot-button[data-reorder-id]")].map((dot) => dot.dataset.reorderId);
    const pageBefore = island().className;
    const drag = async (from: string, to: string) => {
      const source = document.querySelector<HTMLElement>(from)!;
      const target = document.querySelector<HTMLElement>(to)!.getBoundingClientRect();
      const start = source.getBoundingClientRect();
      const fire = (type: string, x: number) => source.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, button: 0, clientX: x, clientY: start.top + start.height / 2 }));
      await act(async () => { fire("pointerdown", start.left + 2); });
      await act(async () => { fire("pointermove", start.left + 10); });
      await act(async () => { fire("pointermove", target.left + target.width / 2); });
      await act(async () => { fire("pointerup", target.left + target.width / 2); source.click(); });
    };
    await drag(".dot-button--todo", ".dot-button--clipboard");
    const savedOrder = JSON.parse(localStorage.getItem("skerry-settings") ?? "{}").pageOrder as string[] | undefined;
    check(dotOrder().join() === "music,clipboard,todo,shelf,translation,system" && savedOrder?.join() === "music,clipboard,todo,shelf,translation,system" && island().className === pageBefore,
      `Dragging a page dot reorders and saves the pages without opening one (${dotOrder().join()})`);
    await drag(".dot-button--todo", ".dot-button--music");
    check(dotOrder()[0] === "todo", "Dot can be dragged back to original position");
    // Translation is one of the page capsules on the left; the header's old button is gone.
    await click(".dot-button--translation");
    check(!document.querySelector(".island-translate-button")
      && document.querySelector(".dot-button--translation")?.getAttribute("aria-current") === "page"
      && document.querySelector(".island__expanded .translation-panel") !== null,
      "Translation is a page capsule on the left that opens the in-island translation page, and the top bar has no translation button on the right");
    // Focusing the source box while the shape is still short must not scroll the clipped panel:
    // that scroll ran back to 0 as the island grew and read as the page rushing downwards.
    await act(async () => { await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
    check([".island__surface", ".island__expanded", ".island__content"].every((selector) => document.querySelector(selector)!.scrollTop === 0),
      "Opening the translation page and focusing the input does not scroll the island or push it down");

    // The shelf's three files make one row of tiles with an open slot, and the page is only as
    // tall as that row (getShelfExpandedHeight).
    await act(async () => { document.querySelector<HTMLElement>(".dot-button--shelf")!.click(); });
    check(document.querySelector<HTMLElement>(".island__content")!.getAnimations().some((animation) =>
      animation.effect?.getTiming().duration === 220), "Page change keeps the 220ms panel fade-in animation");
    await settle(700);
    // Short capsules have a stable hit area; only the coloured shape rises and grows.
    const dots = [...document.querySelectorAll<HTMLElement>(".dot-button")];
    check(dots.every((dot) => dot.offsetWidth === 24 && dot.offsetHeight === 34 && !dot.textContent && dot.dataset.tip
      && getComputedStyle(dot, "::before").width === "18px" && getComputedStyle(dot, "::before").height === "12px"
      && getComputedStyle(dot, "::after").content.includes(dot.dataset.tip)
      && getComputedStyle(dot, "::after").transitionDelay === "0s"),
      "Page entries are short capsules with a fixed click area, and the page name above shows no delay");
    const dotBox = dots[1].getBoundingClientRect();
    await act(async () => { dots[1].focus(); });
    await settle(240);
    const dock = new DOMMatrixReadOnly(getComputedStyle(dots[1], "::before").transform);
    const tip = getComputedStyle(dots[1], "::after");
    const tipHeight = [tip.height, tip.paddingTop, tip.paddingBottom, tip.borderTopWidth, tip.borderBottomWidth]
      .reduce((sum, value) => sum + parseFloat(value), 0);
    const panelScale = panel().getBoundingClientRect().width / panel().offsetWidth;
    const tipTop = dotBox.bottom - (parseFloat(tip.bottom) + tipHeight) * panelScale;
    check(dock.a > 1.3 && dock.f < -2 && getComputedStyle(dots[1]).transform === "none"
      && dots[1].getBoundingClientRect().width === dotBox.width && tip.opacity === "1"
      && tipTop >= island().getBoundingClientRect().top,
      `Keyboard focus also enlarges and lifts the entry and shows its name, the hit area stays put, and the name is not clipped by the top of the screen (${dock.a}, ${dock.f}, ${tipTop.toFixed(1)}px)`);
    dots[1].blur();
    const tiles = [...document.querySelectorAll<HTMLElement>(".shelf-item")].map((tile) => tile.getBoundingClientRect());
    const list = document.querySelector<HTMLElement>(".shelf-list")!;
    check(tiles.length === 3 && tiles.every((tile) => Math.abs(tile.top - tiles[0].top) < 1) && document.querySelector(".shelf-slot")
      && panel().offsetHeight === 226 && list.scrollHeight <= list.clientHeight,
      `File shelf is a row of tiles and the page height fits exactly that row (${panel().offsetHeight}px)`);

    const pages: Array<[string, string]> = [
      [".dot-button--todo", "Todo"],
      [".dot-button--music", "Music"],
      [".dot-button--clipboard", "Clipboard"],
      [".dot-button--shelf", "File shelf"],
      [".dot-button--messages", "Messages"],
      [".dot-button--translation", "Translation"],
      [".island-settings-button", "Settings"],
    ];
    for (const [selector, name] of pages) {
      await click(selector);
      const found = strays();
      check(found.length === 0, `${name} page: content stays inside the island's rounded shape${found.length ? ` (${found.join(", ")})` : ""}`);
      // Pages may reach a little into the island's 20px side padding, never closer than 8px to the island's edge.
      const edge = island().getBoundingClientRect();
      const tight = [...document.querySelectorAll<HTMLElement>(".island__content *")].filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden" &&
          (rect.left < edge.left + 8 || rect.right > edge.right - 8) && !element.closest("[aria-hidden='true']");
      });
      check(tight.length === 0, `${name} page: no content crowds the island edge${tight.length ? ` (${tight[0].className})` : ""}`);
    }
    // Settings is open last: the island's height follows the settings page shown, within its cap.
    await click(".settings-sidebar__item[data-category='todos']");
    // The page panel's own height (it is scaled, the shape around it is not), so the check holds
    // at every expanded size.
    const short = panel().offsetHeight;
    await click(".settings-sidebar__item[data-category='messages']");
    const tall = panel().offsetHeight;
    check(short >= 340 && short <= tall && tall <= 560 && (short < tall || short === 560),
      `Settings page height follows its content and scrolls past the 560px cap (todos ${short}px, messages ${tall}px)`);
    // Appearance → Collapsed island: items in order, moved with the arrow keys on a handle.
    await click(".settings-sidebar__item[data-category='appearance']");
    const capsule = document.querySelector<HTMLButtonElement>('[aria-label="Page buttons"] button:first-child')!;
    check(capsule.getAttribute("aria-pressed") === "true" && document.querySelectorAll(".dot-button--capsule").length >= 6, `Saved pill page buttons remain pills (including messages) (${document.querySelectorAll(".dot-button--capsule").length} pills, pressed=${capsule.getAttribute("aria-pressed")})`);
    await click('[aria-label="Page buttons"] button:last-child');
    const savedStyle = JSON.parse(localStorage.getItem("skerry-settings") ?? "{}").pageButtonStyle;
    check(document.querySelectorAll(".dot-button--icon svg").length >= 6 && savedStyle === "icon", `Page buttons switch to icons, and the preview and saved setting follow (${document.querySelectorAll(".dot-button--icon svg").length} icons, ${savedStyle})`);
    await click('[aria-label="Page buttons"] button:first-child');
    const priority = () => [...document.querySelectorAll<HTMLElement>(".reorder-list__item")].map((item) => item.dataset.reorderId);
    check(priority().join() === "lyrics,todo", "Appearance page lists collapsed display order: lyrics, todos");
    await act(async () => {
      document.querySelector<HTMLElement>(".reorder-list__handle")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    });
    const savedPriority = JSON.parse(localStorage.getItem("skerry-settings") ?? "{}").collapsedPriority as string[] | undefined;
    check(priority().join() === "todo,lyrics" && savedPriority?.join() === "todo,lyrics", "Adjusts order with arrow keys and persists");
    // Appearance → On the island: the music waveform moved left of the pulse and the text sits on
    // the collapsed island's left.
    const barOrder = () => [...document.querySelectorAll<HTMLElement>(".island__collapsed > *")].map((element) => element.classList[0]).join();
    for (let step = 0; step < 4; step++) {
      await act(async () => {
        document.querySelector<HTMLElement>(".collapsed-layout__slot--music")!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      });
    }
    const savedLayout = JSON.parse(localStorage.getItem("skerry-settings") ?? "{}").collapsedLayout as string[] | undefined;
    check(savedLayout?.join() === "music,pulse,text,shelf,clock,weather,system" && barOrder().startsWith("music-wave-button,island__light,island__text-slot"),
      `Island arrangement: the music waveform moves left of the text and the collapsed island follows (${barOrder()})`);
    await click(".settings-sidebar__item[data-category='general']");
    const lockSwitch = () => [...document.querySelectorAll<HTMLElement>(".settings-row")]
      .find((row) => row.querySelector(".settings-row__title")?.textContent === "Lock island position")!.querySelector<HTMLInputElement>("[role='switch']")!;
    await act(async () => { lockSwitch().click(); });
    check(interaction.positionLocked === true, "Position lock syncs to native window");
    await click(".island__collapse-target");
    checkShapeMotion(0.38);
    const dragIsland = async (ctrlKey = false) => {
      const button = document.querySelector<HTMLElement>(".island__open-button")!;
      // Synthetic pointers do not have OS capture; the real hook still handles the events.
      button.setPointerCapture = () => {};
      button.hasPointerCapture = () => false;
      await act(async () => {
        button.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 9, button: 0, buttons: 1, clientX: 20, ctrlKey }));
        button.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 9, button: 0, buttons: 1, clientX: 40, ctrlKey }));
        button.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 9, button: 0 }));
      });
    };
    await dragIsland();
    await dragIsland(true);
    check(windowDrags === 0 && (query.has("capsule") || !island().classList.contains("island--detached")), "When locked, normal and Ctrl dragging do not move or alter island top docking");
    await click(".island__open-button");
    check(island().classList.contains("island--expanded"), "Locked position can still be clicked to expand island");
    await click(".island-settings-button");
    await click(".settings-sidebar__item[data-category='general']");
    await act(async () => { lockSwitch().click(); });
    check(interaction.positionLocked === false, "Unlocking syncs to native window");
    await click(".island__collapse-target");
    await dragIsland();
    check(windowDrags === 1, "Island can be dragged again after unlocking");
    results.textContent = `${messages.join("\n")}\n\nAll ${messages.length} checks passed.`;
    results.dataset.result = "passed";
  } catch (error) {
    results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
    results.dataset.result = "failed";
  } finally {
    restore();
  }
}
