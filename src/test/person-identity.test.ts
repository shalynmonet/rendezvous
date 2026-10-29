import { describe, expect, it } from "vitest";
import { addedLabel, clashingNames, groupPeople, personQualifier, samePerson, sameConnectionPerson, setDifferentPeople } from "@/lib/person-identity";
import type { Profile } from "@/lib/store";

const larryChicago: Profile = {
  name: "Larry",
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Arctic Monkeys" },
    { category: "film", label: "Spirited Away" },
    { category: "tv", label: "The Bear" },
  ],
};
const larryChicagoAgain: Profile = { ...larryChicago, tastes: [...larryChicago.tastes, { category: "book", label: "Dune" }] };
const larryAustin: Profile = { ...larryChicago, city: "Austin" };
const larryNoCity: Profile = { ...larryChicago, city: "", tastes: [{ category: "artist", label: "Arctic Monkeys" }] };
const conn = (profile: Profile, extra: Record<string, unknown> = {}) => ({ id: `${profile.city}:${profile.tastes.map((t) => t.label).join(",")}`, label: "saved", profile, ...extra });

describe("Same-named people", () => {
  it("keeps two Larrys apart when their cities differ", () => {
    expect(samePerson(larryChicago, larryAustin)).toBe(false);
    expect(groupPeople([conn(larryChicago), conn(larryAustin)])).toHaveLength(2);
  });
  it("keeps two Larrys apart when their tastes barely overlap", () => {
    const other: Profile = {
      ...larryChicago,
      tastes: [
        { category: "cuisine", label: "Ethiopian" },
        { category: "film", label: "Dune" },
        { category: "artist", label: "Sade" },
      ],
    };
    expect(samePerson(larryChicago, other)).toBe(false);
    expect(groupPeople([conn(larryChicago), conn(other)])).toHaveLength(2);
  });
  it("merges a re-invited Larry whose profile still matches", () => {
    expect(samePerson(larryChicago, larryChicagoAgain)).toBe(true);
    expect(groupPeople([conn(larryChicago), conn(larryChicagoAgain)])).toHaveLength(1);
  });
  it("honors an explicit different-people choice for identical names, cities and tastes", () => {
    const a = { id: "larry-a", label: "saved", profile: larryChicago };
    const b = { id: "larry-b", label: "saved", profile: larryChicago };
    const original = { me: null, activeId: a.id, connections: [a, b], chats: { [a.id]: [], [b.id]: [] } };
    const separate = setDifferentPeople(original, a, b, true);
    expect(groupPeople(separate.connections)).toHaveLength(2);
    expect(separate.connections[0]?.differentFrom).toEqual([b.id]);
    expect(separate.connections[1]?.differentFrom).toEqual([a.id]);
    expect(separate.chats).toEqual(original.chats);
    expect(groupPeople(setDifferentPeople(separate, a, b, false).connections)).toHaveLength(1);
  });
  it("keeps restored snapshot contacts separate using their canonical room keys", () => {
    const a = { id: "room-a", room: { id: "room-a" }, profile: larryChicago, differentFrom: ["live:room-b"] };
    const b = { id: "live:room-b", profile: larryChicago };
    expect(sameConnectionPerson(a, b)).toBe(false);
    expect(sameConnectionPerson(a, { id: "live:room-a", profile: larryChicago })).toBe(true);
  });
  it("flags shared names so cards can be qualified", () => {
    expect(clashingNames([conn(larryChicago), conn(larryAustin)])).toEqual(new Set(["larry"]));
    expect(clashingNames([conn(larryChicago), conn(larryChicagoAgain)])).toEqual(new Set());
  });
  it("qualifies a shared name with the city, falling back to tastes", () => {
    expect(personQualifier(larryAustin)).toBe("Austin");
    expect(personQualifier(larryNoCity)).toBe("1 tastes");
  });
  it("keeps the demo partner separate from a real person with the same name", () => {
    expect(
      groupPeople([
        conn(larryChicago, { demo: true }),
        conn(larryChicagoAgain),
      ]),
    ).toHaveLength(2);
  });
  it("adds the day each person joined, even when the city already matches", () => {
    expect(personQualifier(larryChicago, { addedAt: "2026-10-12T15:00:00Z" })).toBe("Chicago · added Oct 12");
    expect(personQualifier(larryAustin, { addedAt: "2026-09-03T15:00:00Z" })).toBe("Austin · added Sep 3");
    expect(addedLabel("not-a-date")).toBe("");
    expect(addedLabel(undefined)).toBe("");
  });
});
