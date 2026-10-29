// Two different people can share a name, so a card must never merge on a name alone.
import type { Connection, Profile, State } from "./store";

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

type PersonRef = { id?: string; profile: Profile; demo?: boolean; room?: { id: string }; differentFrom?: string[] };

export function personKey(person: PersonRef): string | undefined {
  return person.room ? `live:${person.room.id}` : person.id;
}

export function sameConnectionPerson(a: PersonRef, b: PersonRef): boolean {
  const ka = personKey(a), kb = personKey(b);
  if (ka && kb && ka === kb) return true;
  if ((kb && a.differentFrom?.includes(kb)) || (ka && b.differentFrom?.includes(ka))) return false;
  return !!a.demo === !!b.demo && samePerson(a.profile, b.profile);
}

/** Owner-only identity overrides never move or delete either contact's history. */
export function setDifferentPeople(state: State, a: Connection, b: Connection, separate: boolean): State {
  const ka = personKey(a), kb = personKey(b);
  if (!ka || !kb || ka === kb) return state;
  return { ...state, connections: state.connections.map((c) => {
    const key = personKey(c);
    const other = key === ka ? kb : key === kb ? ka : undefined;
    if (!other) return c;
    const rest = (c.differentFrom ?? []).filter((id) => id !== other);
    return { ...c, differentFrom: separate ? [...rest, other] : rest };
  }) };
}

/** Collect connections into one entry per person; same-named strangers stay apart. */
export function groupPeople<T extends PersonRef>(items: T[]): PersonGroup<T>[] {
  const groups: PersonGroup<T>[] = [];
  for (const item of items) {
    const key = nameKey(item.profile.name);
    const group = groups.find(
      (g) =>
        g.key === key &&
        !!item.demo === !!g.members[0]?.demo &&
        g.members.every((m) => sameConnectionPerson(m, item)),
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

/** "added Oct 29" — the day a person joined your list, when that is known. */
export function addedLabel(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return `added ${d.toLocaleDateString(undefined, sameYear ? { month: "short", day: "numeric" } : { month: "short", day: "numeric", year: "numeric" })}`;
}

/** The detail that tells two same-named people apart: city and the day they joined. */
export function personQualifier(p: Profile, opts: { label?: string | undefined; addedAt?: string | undefined } = {}): string {
  const parts = [p.city.trim(), addedLabel(opts.addedAt)].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  if (opts.label?.trim()) return opts.label.trim();
  return `${p.tastes.length} tastes`;
}
