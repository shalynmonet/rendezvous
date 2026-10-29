import { describe, expect, it } from "vitest";
import { canVoicePartner } from "@/lib/store";
import { ChatTurnInput } from "@/lib/rue.functions";

const person = (name: string) => ({
  name,
  city: "Chicago",
  tastes: [
    { category: "artist", label: "Frank Ocean" },
    { category: "film", label: "Spirited Away" },
    { category: "tv", label: "The Bear" },
  ],
});

const turn = (partnerIsDemo: boolean) => ({
  a: person("Noor"),
  b: person("Larry"),
  mood: "date_night_in",
  history: [],
  scores: { a: 0, b: 0 },
  partnerIsDemo,
});

describe("Ru waits instead of answering for a real person", () => {
  it("only ever voices a demo partner", () => {
    expect(canVoicePartner({ demo: true })).toBe(true);
    expect(canVoicePartner({})).toBe(false);
    expect(canVoicePartner({ demo: false })).toBe(false);
  });
  it("refuses a turn that would invent a real partner's replies", () => {
    const blocked = ChatTurnInput.safeParse(turn(false));
    expect(blocked.success).toBe(false);
    expect(blocked.error?.issues[0]?.message).toBe("Ru never speaks for a real person.");
  });
  it("still lets Ru play the demo partner", () => {
    expect(ChatTurnInput.safeParse(turn(true)).success).toBe(true);
  });
});
