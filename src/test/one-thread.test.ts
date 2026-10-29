import { describe, expect, it } from "vitest";
import { selectedChat, type State } from "@/lib/store";

const chat = (id: string, updatedAt: string) => ({ id, mood: "road_trip", messages: [], game: null, scores: { a: 0, b: 0 }, updatedAt });
describe("one thread per person", () => {
  it("always resumes the most recently updated thread, even if another was selected", () => {
    const s = { me: null, connections: [], activeId: null, chats: { larry: [chat("new", "2026-10-29"), chat("old", "2026-10-01")] }, selectedChats: { larry: "old" } } as State;
    expect(selectedChat(s, "larry")?.id).toBe("new");
  });
});
