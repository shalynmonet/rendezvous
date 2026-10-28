import { describe, it, expect } from "vitest";
import {
  TasteProfileSchema,
  GuestKeySchema,
  LiveTurnSchema,
  needsProfileChoice,
  newGuestKey,
} from "@/lib/chat-schemas";
const profile = {
  name: "Judge",
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Frank Ocean" },
    { category: "film", label: "Spirited Away" },
    { category: "tv", label: "The Bear" },
  ],
};
describe("Guest profile and real-person chat rules", () => {
  it("accepts a taste profile with no account or email", () => {
    expect(TasteProfileSchema.parse(profile).name).toBe("Judge");
  });
  it("never accepts a simulated partner message in a live Ru turn", () => {
    expect(
      LiveTurnSchema.safeParse({
        messages: [{ sender: "b", content: "An invented answer" }],
        game: null,
        points: { a: 0, b: 0 },
      }).success,
    ).toBe(false);
  });
  it("requires a choice before replacing different local and account tastes", () => {
    expect(needsProfileChoice(profile, { ...profile, name: "Other person" })).toBe(true);
    expect(needsProfileChoice(profile, profile)).toBe(false);
  });
  it("uses separate high-entropy keys suitable for private guest access", () => {
    const a = newGuestKey(),
      b = newGuestKey();
    expect(a).not.toBe(b);
    expect(GuestKeySchema.safeParse(a).success).toBe(true);
    expect(GuestKeySchema.safeParse("judge").success).toBe(false);
  });
});
