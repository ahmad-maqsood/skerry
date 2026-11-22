// pnpm dev, then open /tests/regression/tucked-hover.html?test=1.
// Drives the island's real navigation hooks with the native hover event mocked:
// what resting the cursor on a tucked island does, per the expand trigger (tuckedHover.ts).
import { act, StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { mockIPC } from "@tauri-apps/api/mocks";
import { emit } from "@tauri-apps/api/event";
import { ISLAND_HOVER_CHANGED_EVENT } from "../../src/windows/island/api";
import { useIslandNavigation } from "../../src/windows/island/useIslandNavigation";
import { useRevealOnMessage } from "../../src/windows/island/useIslandAutomation";
import { useTuckPeek } from "../../src/windows/island/useTuckPeek";
import { useTuckMorph } from "../../src/windows/island/useTuckMorph";
import { useTuckedHoverOpen } from "../../src/windows/island/useTuckedHoverOpen";
import { tuckedHoverOpensPanel } from "../../src/windows/island/tuckedHover";

Object.assign(globalThis, { isTauri: true, IS_REACT_ACT_ENVIRONMENT: true });
mockIPC(() => null, { shouldMockEvents: true });

const RETRACT_MS = 120;
const HOVER_DELAY_MS = 0; // The user's setting; opening still waits for the 320 ms slide-out.

type Island = ReturnType<typeof useIslandNavigation>;
let island: Island;
let enter: () => void;
let setOpensPanel: (value: boolean) => void;
let setPreview: (value: boolean) => void;

function Harness() {
  const [opensPanel, changeOpensPanel] = useState(false);
  const [preview, changePreview] = useState(false);
  const navigation = useIslandNavigation();
  island = navigation;
  const tuckClass = useTuckMorph(navigation.isTucked, "line");
  setOpensPanel = changeOpensPanel;
  setPreview = changePreview;
  // As useIslandTucking wires them: a message preview reveals the island and holds the peek.
  useRevealOnMessage(preview, navigation.isTucked, navigation.revealForMessage);
  useTuckPeek(navigation.isPeeking && !preview, navigation.endPeek, navigation.peekRetractDelayMs ?? RETRACT_MS);
  enter = useTuckedHoverOpen({
    opensPanel: tuckedHoverOpensPanel(opensPanel ? "hover" : "click", false),
    delayMs: HOVER_DELAY_MS,
    isPeeking: navigation.isPeeking && navigation.mode === "collapsed",
    onPeek: navigation.peekIsland,
    onOpen: () => navigation.openIslandPage("todo"),
    blocked: false,
    retractsAfterPeek: navigation.retractsAfterPeek,
    resumePeek: navigation.resumePeek,
  });
  return (
    <p className={tuckClass}>
      mode {navigation.mode} · tucked {String(navigation.isTucked)} · peeking {String(navigation.isPeeking)}{" "}
      <input id="draft" aria-label="draft" />
    </p>
  );
}

createRoot(document.getElementById("fixture")!).render(<StrictMode><Harness /></StrictMode>);

const results = document.getElementById("results")!;
const messages: string[] = [];
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
  messages.push(`PASS ${message}`);
};
const wait = (ms: number) => act(async () => { await new Promise((resolve) => setTimeout(resolve, ms)); });
const hover = async (inside: boolean) => {
  await act(async () => { await emit(ISLAND_HOVER_CHANGED_EVENT, inside); });
};
/** The cursor arrives on the tucked island: the page's mouseenter, then the native hover event. */
const arrive = async () => {
  await act(async () => enter());
  await hover(true);
};
const state = () => `${island.mode}/${island.isTucked ? "tucked" : "out"}`;

async function runChecks() {
  try {
    await wait(50);

    // Click mode: a minimized island only slides out, and back once the cursor leaves.
    await act(async () => island.minimizeToEdge());
    await arrive();
    await wait(400);
    check(state() === "collapsed/out" && island.isPeeking, "Click to expand: hovering reveals island only, without opening panel");
    await hover(false);
    await wait(450);
    check(state() === "collapsed/tucked", "Click to expand: island retracts to edge after mouse leaves");

    // Hover mode: slides out at once and opens the panel once the cursor stays, one step.
    await act(async () => setOpensPanel(true));
    await arrive();
    check(state() === "collapsed/out", "Hover to expand: immediately reveals island first");
    await wait(200);
    check(state() === "collapsed/out", "Hover to expand: does not open panel before reveal animation finishes");
    await wait(400);
    check(state() === "expanded/out" && island.isPeeking, "Hover to expand: expands panel directly after dwell without clicking, remembering to retract");
    await hover(false);
    await wait(450);
    check(state() === "collapsed/tucked", "Hover to expand: panel closes and island retracts after mouse leaves");

    // Passing over the edge on the way to a browser tab does not open the panel.
    await arrive();
    await wait(40);
    await hover(false);
    await wait(500);
    check(state() === "collapsed/tucked", "Does not open panel when mouse merely sweeps edge; island retracts");

    // Out and straight back in, before the island slid away: no tucked mouse-enter
    // comes, and the panel still opens.
    await arrive();
    await wait(40);
    await hover(false);
    await wait(50);
    check(state() === "collapsed/out", "Island not yet retracted during quick mouseout");
    await hover(true);
    await wait(400);
    check(state() === "expanded/out", "Moving out quickly and re-entering expands panel as expected when resting on island");
    await hover(false);
    await wait(450);
    check(state() === "collapsed/tucked", "Moving away afterwards closes panel and retracts island");

    // A draft in the panel keeps it open after the cursor leaves.
    await arrive();
    await wait(400);
    await act(async () => document.querySelector<HTMLInputElement>("#draft")!.focus());
    await hover(false);
    await wait(500);
    check(state() === "expanded/out", "Does not retract when mouse leaves while typing in panel");
    await act(async () => document.querySelector<HTMLInputElement>("#draft")!.blur());
    await wait(600);
    check(state() === "collapsed/tucked", "Retracts after input loses focus");

    // Idle-tucked without "tuck again after the mouse leaves": the panel opens and the island stays out.
    await act(async () => island.idleTuck(null));
    await arrive();
    await wait(400);
    await hover(false);
    await wait(450);
    check(state() === "expanded/out", "Does not auto-retract after expanding when 'retuck after mouse leaves' is off");

    // A message on a tucked island: it slides out for the preview and back once it has gone.
    await act(async () => island.tuckIsland());
    await act(async () => setPreview(true));
    await wait(450);
    check(state() === "collapsed/out", "Island emerges from edge on new message; does not retract during preview");
    await act(async () => setPreview(false));
    await wait(450);
    check(state() === "collapsed/tucked", "Island retracts to edge after message preview ends");
    check(document.querySelector(".island--tuck-line"), "Messages, hover, and manual tuck share thin line deformation state");

    results.textContent = `${messages.join("\n")}\n\nAll ${messages.length} checks passed.`;
    results.dataset.result = "passed";
  } catch (error) {
    results.textContent = `${messages.join("\n")}\nFAIL ${String(error)}`;
    results.dataset.result = "failed";
  }
}

void runChecks();
