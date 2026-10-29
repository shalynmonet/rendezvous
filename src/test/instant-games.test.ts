import { describe, expect, it } from "vitest";
import { buildInstantDeck, INSTANT_GAMES, selectInstantGame } from "@/lib/instant-games";
import { DEMO_A, DEMO_B } from "@/lib/store";

describe("instant and free game rules", () => {
  it("randomly selects all four games from spin IDs and keeps shared selections identical", () => {
    const selections = Array.from({ length: 1000 }, (_, i) => selectInstantGame(`spin-${i}`));
    expect(new Set(selections)).toEqual(new Set(["taste", "rather", "truths", "tune"]));
    expect(selectInstantGame("shared-spin")).toBe(selectInstantGame("shared-spin"));
  });
  it.each(INSTANT_GAMES)("builds %s entirely synchronously from saved tastes", (kind) => {
    const deck = buildInstantDeck(kind, "spin", DEMO_A, DEMO_B);
    expect(deck.length).toBeGreaterThan(0);
    expect(deck).toEqual(buildInstantDeck(kind, "spin", DEMO_A, DEMO_B));
    expect(deck).not.toBeInstanceOf(Promise);
  });
  it("two truths are saved favorites and the lie is not in that person's profile", () => {
    for (const card of buildInstantDeck("truths", "spin", DEMO_A, DEMO_B)) {
      const person = card.prompt.includes(DEMO_A.name) ? DEMO_A : DEMO_B;
      const labels = person.tastes.map((t) => t.label);
      expect(card.options.filter((o) => labels.includes(o))).toHaveLength(2);
      expect(labels).not.toContain(card.options[card.answer ?? -1]);
    }
  });
  it("counts a shared favorite as Both rather than guessing its owner", () => {
    const shared = { ...DEMO_B, tastes: DEMO_A.tastes };
    expect(buildInstantDeck("taste", "spin", DEMO_A, shared).every((c) => c.answer === 2)).toBe(true);
  });
  it("name that tune draws only from saved artists", () => {
    const artists = [...DEMO_A.tastes, ...DEMO_B.tastes].filter((t) => t.category === "artist").map((t) => t.label);
    expect(buildInstantDeck("tune", "spin", DEMO_A, DEMO_B).every((c) => artists.some((artist) => c.prompt.endsWith(artist)))).toBe(true);
  });
  it("ignores lifestyle answers when selecting every game's cards", () => {
    const privateProfile = { ...DEMO_A, lifestyle: { alcohol: "SECRET" } };
    for (const kind of INSTANT_GAMES) expect(buildInstantDeck(kind, "spin", privateProfile, DEMO_B)).toEqual(buildInstantDeck(kind, "spin", DEMO_A, DEMO_B));
  });
});