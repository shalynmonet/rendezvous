import { describe, expect, it } from "vitest";
import { LiveStateSchema } from "@/lib/chat-schemas";
import { shouldHost } from "@/lib/live-host-policy";

const person = { name: "Test", city: "Chicago", tastes: [{ category: "artist", label: "Frank Ocean" }, { category: "film", label: "Spirited Away" }, { category: "tv", label: "The Bear" }] };
const state = () => LiveStateSchema.parse({ id: "12345678-1234-4234-8234-123456789abc", side: "a", a: person, b: person, messages: [], game: null, scores: { a: 0, b: 0 }, mood: null, tools: [], busy: false, error: null });
describe("Ru live hosting", () => {
  it("is unmuted and starts hosting by default", () => {
    expect(state().muted).toBe(false);
    expect(shouldHost(state())).toBe(true);
  });
  it("does not host while muted", () => {
    expect(shouldHost({ ...state(), muted: true })).toBe(false);
  });
  it("automatically advances after both real participants answer", () => {
    const s = state(); s.game = { type: "this_or_that", prompt: "Pick", options: [] };
    s.messages = [{ id: "1", sender: "a", content: "First", at: "now" }];
    expect(shouldHost(s)).toBe(false);
    s.messages.push({ id: "2", sender: "b", content: "Second", at: "now" });
    expect(shouldHost(s)).toBe(true);
  });
});