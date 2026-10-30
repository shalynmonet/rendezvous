import { describe, expect, it } from "vitest";
import { assertGiftDiscretion, describeGiftConstraints } from "./lifestyle";

describe("gift discretion", () => {
  it("allows product names like a whiskey decanter or cigar humidor", () => {
    expect(() => assertGiftDiscretion({ ideas: [{ name: "Whiskey decanter" }, { name: "Cigar humidor" }] })).not.toThrow();
  });
  it("blocks explaining someone's habits", () => {
    expect(() => assertGiftDiscretion({ why: "Since they don't drink, a tea set" })).toThrow();
  });
  it("adds a silent no-alcohol constraint for a shared sober answer", () => {
    expect(describeGiftConstraints({ alcohol: "Sober / in recovery" })).toContain("no alcohol");
  });
});
