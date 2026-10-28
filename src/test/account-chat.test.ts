import { describe, expect, it } from "vitest";
import { AccountChatSchema } from "@/lib/saved-chat-schemas";
import { DEMO_A, DEMO_B } from "@/lib/store";

const snapshot = { sourceId: "local:demo-chat", kind: "demo", a: DEMO_A, b: DEMO_B, mood: "date_night_in", messages: [{ sender: "a", content: "Spirited Away" }, { sender: "b", content: "Me too" }, { sender: "rue", content: "A perfect pair." }], game: null, scores: { a: 1, b: 1 } };
describe("Account chat snapshots", () => {
  it("accepts demo chat messages and scores for account saving", () => {
    expect(AccountChatSchema.parse(snapshot).messages).toHaveLength(3);
    expect(AccountChatSchema.parse(snapshot).kind).toBe("demo");
  });
  it("accepts live chat snapshots too", () => {
    expect(AccountChatSchema.parse({ ...snapshot, kind: "live", sourceId: "live:room" }).kind).toBe("live");
  });
  it("never persists invitation or participant credentials", () => {
    const parsed = AccountChatSchema.parse({ ...snapshot, token: "private", room: { token: "private" }, invite: "private" });
    expect(parsed).not.toHaveProperty("token");
    expect(parsed).not.toHaveProperty("room");
    expect(parsed).not.toHaveProperty("invite");
  });
});