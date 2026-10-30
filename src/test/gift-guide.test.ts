import { describe, expect, it } from "vitest";
import { GiftGuideSchema } from "@/lib/gift-schemas";

const idea = { name: "x", category: "book", price_range: "$20", why: "y", where_to_find: "z" };
const guide = (n: number) => ({ headline: "h", rue_line: "r", gifts: Array.from({ length: n }, () => idea) });

describe("gift guides have 4–5 ideas", () => {
  it("accepts 4 and 5", () => {
    expect(GiftGuideSchema.safeParse(guide(4)).success).toBe(true);
    expect(GiftGuideSchema.safeParse(guide(5)).success).toBe(true);
  });
  it("rejects 3 and 6", () => {
    expect(GiftGuideSchema.safeParse(guide(3)).success).toBe(false);
    expect(GiftGuideSchema.safeParse(guide(6)).success).toBe(false);
  });
});
