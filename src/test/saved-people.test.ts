import { describe, expect, it } from "vitest";
import { savedPeople } from "@/lib/saved-people";
import { AccountChatSchema } from "@/lib/saved-chat-schemas";
import { DEMO_A, DEMO_B } from "@/lib/store";

const snapshot = AccountChatSchema.parse({ sourceId: "live:room-1", kind: "live", a: DEMO_A, b: { ...DEMO_B, name: "Partner" }, mood: null, messages: [{ sender: "a", content: "Hi" }], game: null, scores: { a: 0, b: 0 } });
const chat = { id: "saved-1", updatedAt: "2026-10-28T21:00:00Z", snapshot };
describe("People from account-saved chats", () => {
  it("returns the real partner in a fresh browser without room credentials", () => {
    const people = savedPeople([chat], DEMO_A, []);
    expect(people).toHaveLength(1);
    expect(people[0]?.profile.name).toBe("Partner");
    expect(people[0]?.chatId).toBe("saved-1");
    expect(people[0]).not.toHaveProperty("room");
  });
  it("uses the saving participant's side even when both names match", () => {
    const people = savedPeople([{ ...chat, snapshot: { ...snapshot, ownerSide: "b", b: { ...DEMO_B, name: DEMO_A.name } } }], null, []);
    expect(people[0]?.profile.tastes).toEqual(DEMO_A.tastes);
  });
  it("recognizes the second participant in older saved chats using their saved profile", () => {
    expect(savedPeople([chat], snapshot.b, [])[0]?.profile.name).toBe("Noor");
  });
  it("excludes demo partners from saved real people", () => {
    expect(savedPeople([{ ...chat, snapshot: { ...snapshot, kind: "demo" } }], DEMO_A, [])).toEqual([]);
  });
  it("does not duplicate a live connection already available in this browser", () => {
    expect(savedPeople([chat], DEMO_A, [{ id: "room-1", label: "live", profile: DEMO_B, room: { id: "room-1", token: "secret" } }])).toEqual([]);
  });
  it("uses the latest saved thread for the same room", () => {
    const people = savedPeople([chat, { ...chat, id: "saved-2", updatedAt: "2026-10-28T22:00:00Z" }], DEMO_A, []);
    expect(people).toHaveLength(1);
    expect(people[0]?.chatId).toBe("saved-2");
  });
  it("reports the day the person first appeared in the account", () => {
    const people = savedPeople([chat, { ...chat, id: "saved-0", updatedAt: "2026-10-20T10:00:00Z" }], DEMO_A, []);
    expect(people[0]?.addedAt).toBe("2026-10-20T10:00:00Z");
  });
});