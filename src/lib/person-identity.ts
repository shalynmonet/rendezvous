// Two different people can share a name, so a card must never merge on a name alone.
import type { Profile } from "./store";

export const nameKey = (n: string) => n.trim().toLowerCase();

const tasteKeys = (p: Profile) =>
  new Set(
    p.tastes.map((t) =>
      t.entity_id ? `id:${t.entity_id}` : `label:${t.category}:${t.label.trim().toLowerCase()}`,
    ),
  );

/**
 * Do two profiles describe the same person? City and taste graph decide; lifestyle is
 * private and never compared. Sparse profiles fall back to the name.
 */
export function samePerson(a: Profile, b: Profile): boolean {
  if (nameKey(a.name) !== nameKey(b.name)) return false;
  const cityA = a.city.trim().toLowerCase();
  const cityB = b.city.trim().toLowerCase();
  if (cityA && cityB && cityA !== cityB) return false;
  const ta = tasteKeys(a);
  const tb = tasteKeys(b);
  if (ta.size >= 3 && tb.size >= 3) {
    const shared = [...ta].filter((k) => tb.has(k)).length;
    if (shared / Math.min(ta.size, tb.size) < 0.25) return false;
  }
  return true;
}

export type PersonGroup<T> = { key: string; members: T[]; clash: boolean };

/** Collect connections into one entry per person; same-named strangers stay apart. */
export function groupPeople<T extends { profile: Profile; demo?: boolean }>(items: T[]): PersonGroup<T>[] {
  const groups: PersonGroup<T>[] = [];
  for (const item of items) {
    const key = nameKey(item.profile.name);
    const group = groups.find(
      (g) =>
        g.key === key &&
        !!item.demo === !!g.members[0]?.demo &&
        g.members.every((m) => samePerson(m.profile, item.profile)),
    );
    if (group) group.members.push(item);
    else groups.push({ key, members: [item], clash: false });
  }
  for (const g of groups) g.clash = groups.some((o) => o !== g && o.key === g.key);
  return groups;
}

/** Name keys used by more than one distinct person, so labels need a qualifier. */
export function clashingNames<T extends { profile: Profile; demo?: boolean }>(items: T[]): Set<string> {
  return new Set(groupPeople(items).filter((g) => g.clash).map((g) => g.key));
}

/** The detail that tells two same-named people apart in a list. */
export function personQualifier(p: Profile, fallback = ""): string {
  const city = p.city.trim();
  if (city) return city;
  if (fallback.trim()) return fallback.trim();
  return `${p.tastes.length} tastes`;
}
