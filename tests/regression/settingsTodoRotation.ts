import { act } from "react";

export async function checkTodoRotation(panel: Element, check: (value: unknown, message: string) => void) {
  const group = () => [...panel.querySelectorAll(".settings-group")].find(node => node.querySelector("h2")?.textContent === "Collapsed island")!;
  // The group's switches: the todo count first, then the rotation switch whose options follow it.
  const switches = () => [...group().querySelectorAll<HTMLInputElement>("input[role=switch]")];
  const toggle = () => switches()[1];
  const saved = () => JSON.parse(localStorage.getItem("skerry-settings")!);
  check(!toggle().checked && !group().querySelector("input[role=spinbutton]"), "todo: rotation options start hidden");
  check(switches()[0].checked, "todo: the todo count shows on the island by default");
  await act(async () => switches()[0].click());
  check(saved().showIdleTodoCount === false && !switches()[0].checked, "todo: the todo count can be hidden from the island");
  await act(async () => switches()[0].click());
  check(saved().showIdleTodoCount === true, "todo: the todo count can be shown again");
  await act(async () => toggle().click());
  const fields = [...group().querySelectorAll<HTMLInputElement>("input[role=spinbutton]")];
  check(fields.map(field => field.value).join() === "5", "todo: switch mode exposes only the interval, with no count setting");
  await act(async () => fields[0].parentElement!.querySelector<HTMLButtonElement>("button:last-child")!.click());
  const scroll = () => [...group().querySelectorAll<HTMLButtonElement>("button")].find(button => button.textContent === "Scroll")!;
  await act(async () => scroll().click());
  check(!Object.prototype.hasOwnProperty.call(saved(), "todoRotationCount") && saved().todoRotationSeconds === 6 && saved().todoRotationMode === "scroll"
    && group().querySelectorAll("input[role=spinbutton]").length === 0 && group().querySelector("input[type=range]"),
    "todo: interval and mode save, and scroll shows speed in place of duration");
  await act(async () => toggle().click());
  check(!group().querySelector("input[type=range]"), "todo: disabling rotation hides its options");
  await act(async () => toggle().click());
  check(saved().todoRotationSeconds === 6 && scroll().getAttribute("aria-pressed") === "true", "todo: re-enabling keeps interval and mode");
  check(panel.scrollWidth <= panel.clientWidth, "todo: expanded rotation settings fit the narrow window");
  await act(async () => toggle().click());
}
