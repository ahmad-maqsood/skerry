/** Other rows stay in layout order; source position is also the insertion point when the midpoint is not crossed. */
export function reorderIndex(midpoints: readonly number[], pointerY: number, sourceIndex: number): number {
  if (!midpoints.length) return Math.max(0, sourceIndex);
  const index = midpoints.findIndex((middle) => pointerY < middle);
  return index < 0 ? midpoints.length : index;
}
