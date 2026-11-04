/** Unique plurality. A tie, or no votes, returns null (流局). */
export function uniqueLeader(targets: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const target of targets) {
    if (!target) continue;
    counts.set(target, (counts.get(target) ?? 0) + 1);
  }
  let leader: string | null = null;
  let best = 0;
  let tie = false;
  for (const [id, count] of counts) {
    if (count > best) {
      leader = id;
      best = count;
      tie = false;
    } else if (count === best) {
      tie = true;
    }
  }
  if (tie || leader == null) return null;
  return leader;
}
