import { describe, expect, it } from "vitest";
import { TasteProfileSchema } from "@/lib/chat-schemas";
import { sharedTasteProfile } from "@/lib/lifestyle";
import { CATEGORY_TYPE, resolveItems, searchEntities } from "@/lib/qloo.server";
import { DEMO_A, HOBBY_SUGGESTIONS, CATEGORIES } from "@/lib/store";

const profile = {
  name: "Shai",
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Frank Ocean" },
    { category: "film", label: "Spirited Away" },
    { category: "hobby", label: "Skating" },
    { category: "hobby", label: "Sewing" },
  ],
} as const;

describe("hobbies in the taste profile", () => {
  it("saves hobbies as tastes and shares them with invited people", () => {
    const parsed = TasteProfileSchema.parse(profile);
    expect(parsed.tastes.filter((t) => t.category === "hobby").map((t) => t.label)).toEqual(["Skating", "Sewing"]);
    expect(sharedTasteProfile(parsed).tastes.map((t) => t.label)).toContain("Skating");
  });

  it("offers Hobbies as a picker category with one-tap suggestions", () => {
    expect(CATEGORIES).toContainEqual({ id: "hobby", label: "Hobbies" });
    expect(HOBBY_SUGGESTIONS).toEqual(expect.arrayContaining(["Gym", "Skating", "Painting", "Sewing"]));
  });

  it("never invents a Qloo entity for a hobby", async () => {
    expect(CATEGORY_TYPE["hobby"]).toBeUndefined();
    expect(await searchEntities("skating", "hobby")).toEqual([]);
    const [kept] = await resolveItems([{ category: "hobby", label: "Skating" }]);
    expect(kept).toEqual({ category: "hobby", label: "Skating" });
    expect(kept?.entity_id).toBeUndefined();
  });

  it("keeps hobbies out of the private lifestyle strip", () => {
    const withLifestyle = { ...profile, lifestyle: { alcohol: "Never", shared: ["alcohol"] } };
    const shared = sharedTasteProfile(TasteProfileSchema.parse(withLifestyle));
    expect(shared.tastes.some((t) => t.category === "hobby")).toBe(true);
    expect(shared.lifestyle).toEqual({ alcohol: "Never" });
  });

  it("shows hobbies in the demo profiles", () => {
    expect(DEMO_A.tastes.filter((t) => t.category === "hobby").length).toBeGreaterThan(0);
  });
});
