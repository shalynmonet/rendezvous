import { describe, expect, it } from "vitest";
import { clashingNames, groupPeople, personQualifier, samePerson } from "@/lib/person-identity";
import type { Profile } from "@/lib/store";

const larryChicago: Profile = {
  name: "Larry",
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Arctic Monkeys" },
    { category: "film", label: "Spirited Away" },
    { category: "tv", label: "The Bear" },
  ],
  lifestyle: undefined,
};
const larryChicagoAgain: Profile = { ...larryChicago, tastes: [...larryChicago.tastes, { category: "book", label: "Dune" }] };
const larryAustin: Profile = { ...larryChicago, city: "Austin" };
const larryNoCity: Profile = { ...larryChicago, city: "", tastes: [{ category: "artist", label: "Arctic Monkeys" }] };

describe("Same-named people", () => {
  it("keeps two Larrys apart when their cities differ", () => {
    expect(samePerson(larryChicago, larryAustin)).toBe(false);
    expect(groupPeople([larryChicago, larryAustin])).toHaveLength(2);
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
    expect(groupPeople([larryChicago, other])).toHaveLength(2);
  });
  it("merges a re-invited Larry whose profile still matches", () => {
    expect(samePerson(larryChicago, larryChicagoAgain)).toBe(true);
    expect(groupPeople([larryChicago, larryChicagoAgain])).toHaveLength(1);
  });
  it("flags shared names so cards can be qualified", () => {
    expect(clashingNames([larryChicago, larryAustin])).toEqual(new Set(["larry"]));
    expect(clashingNames([larryChicago, larryChicagoAgain])).toEqual(new Set());
  });
  it("qualifies a shared name with the city, falling back to tastes", () => {
    expect(personQualifier(larryAustin)).toBe("Austin");
    expect(personQualifier(larryNoCity)).toBe("1 tastes");
  });
  it("keeps the demo partner separate from a real person with the same name", () => {
    expect(
      groupPeople([
        { profile: larryChicago, demo: true },
        { profile: larryChicagoAgain },
      ]),
    ).toHaveLength(2);
  });
});
