import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { DEMO_A, DEMO_B, saveChat, selectedChat, setState, startDemo, useStore, type SavedChat, type State } from "@/lib/store";

const state: State = { me: DEMO_A, connections: [{ id: "demo-theo", label: "partner", profile: DEMO_B, demo: true }], activeId: "demo-theo" };
const chat: SavedChat = { id: "chat-1", mood: "date_night_in", messages: [{ sender: "a", content: "I pick Spirited Away" }, { sender: "rue", content: "A lovely choice." }], game: { type: "this_or_that", prompt: "Pick a film", options: ["Spirited Away", "Chungking Express"] }, scores: { a: 2, b: 1 }, updatedAt: "2026-10-28T13:50:00Z" };

describe("Local chat history", () => {
  it("lets a person play solo without replacing their own tastes", () => {
    const personal = { ...DEMO_A, name: "Judge" };
    const { result, unmount } = renderHook(() => useStore());
    act(() => setState(() => ({ me: personal, connections: [], activeId: null })));
    act(() => startDemo());
    expect(result.current.s.me).toEqual(personal);
    expect(result.current.active?.demo).toBe(true);
    expect(result.current.active?.room).toBeUndefined();
    unmount();
  });
  it("restores the entire selected conversation after browser storage serialization", () => {
    const restored = JSON.parse(JSON.stringify(saveChat(state, "demo-theo", chat)));
    expect(selectedChat(restored, "demo-theo")).toEqual(chat);
  });
  it("keeps earlier chats when starting another mood", () => {
    const next = saveChat(saveChat(state, "demo-theo", chat), "demo-theo", { ...chat, id: "chat-2", mood: "road_trip" });
    expect(next.chats?.["demo-theo"]).toHaveLength(2);
    expect(selectedChat(next, "demo-theo")?.id).toBe("chat-2");
  });
  it("does not show another connection's chat in the recap", () => {
    expect(selectedChat(saveChat(state, "demo-theo", chat), "real-person")).toBeUndefined();
  });
  it("updates a conversation without duplicating it", () => {
    const next = saveChat(saveChat(state, "demo-theo", chat), "demo-theo", { ...chat, scores: { a: 3, b: 2 } });
    expect(next.chats?.["demo-theo"]).toHaveLength(1);
    expect(selectedChat(next, "demo-theo")?.scores).toEqual({ a: 3, b: 2 });
  });
});