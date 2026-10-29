import { describe, expect, it } from "vitest";
import { addedLabel, clashingNames, groupPeople, personQualifier, samePerson } from "@/lib/person-identity";
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
const conn = (profile: Profile, extra: Record<string, unknown> = {}) => ({ id: profile.city || "x", label: "saved", profile, ...extra });

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
