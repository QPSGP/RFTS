/** True when two goal-id lists are the same goals in the same priority order. */
export function goalIdsSequenceEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id, i) => id === b[i]);
}
