/** True when exactly one tab is on: that one has to stay, or the expanded island would have no page. */
export function onlyOneTabOn(states: readonly boolean[]): boolean {
  return states.filter(Boolean).length === 1;
}
