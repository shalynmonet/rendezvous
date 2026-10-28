import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { WorkspaceSchema, withoutCapabilities } from "@/lib/account-workspace-schemas";
import { DEMO_A, DEMO_B, switchAccountStore, useStore, setState } from "@/lib/store";
import { mergeWorkspace } from "@/lib/merge-workspace";

const room = { id: "12345678-1234-4234-8234-123456789abc", token: "a".repeat(64), invite: "b".repeat(64) };
const state = { me: DEMO_A, connections: [{ id: room.id, label: "live", profile: DEMO_B, room }], activeId: room.id, pendingRoom: room, pendingInvite: room.invite, memories: [{ id: "memory", connectionId: room.id, activity: "Dinner", milestone: "First meal", rating: 5, notes: "Lovely", commentary: "Bravo", at: "2026-10-28" }], plans: { [room.id]: { title: "Our date" } }, reveals: { [room.id]: { headline: "Together" } }, ruelette: { [room.id]: { mode: "photo_booth", photos: ["data:image/png;base64,aA==", null], score: 3 } } };
describe("Account workspace", () => {
  it("keeps account plans and photos when importing unrelated browser data", () => {
    const saved = { me: DEMO_A, connections: [], activeId: null, plans: { saved: { title: "Keep me" } }, ruelette: { saved: { photos: ["private photo"] } } };
    const merged = mergeWorkspace(saved, { me: null, connections: [], activeId: null, plans: { local: { title: "New plan" } } });
    expect(merged.me).toEqual(DEMO_A);
    expect(merged.plans).toEqual({ saved: { title: "Keep me" }, local: { title: "New plan" } });
    expect(merged.ruelette).toEqual(saved.ruelette);
  });
  it("retains profile, people, plans, reveals, Ru-lette photos and memories", () => {
    const restored = WorkspaceSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(restored.memories?.[0]?.rating).toBe(5);
    expect(restored.plans).toEqual(state.plans);
    expect(restored.reveals).toEqual(state.reveals);
    expect(restored.ruelette).toEqual(state.ruelette);
    expect(restored.connections[0]?.profile.name).toBe("Theo");
  });
  it("keeps room credentials out of ordinary account workspace data", () => {
    const safe = withoutCapabilities(WorkspaceSchema.parse(state));
    expect(JSON.stringify(safe)).not.toContain(room.token);
    expect(JSON.stringify(safe)).not.toContain(room.invite);
    expect(safe.connections[0]).not.toHaveProperty("room");
  });
  it("isolates signed-in account caches and restores guest data on sign-out", () => {
    const { result, unmount } = renderHook(useStore);
    act(() => switchAccountStore(null, { me: DEMO_A, connections: [], activeId: null }));
    act(() => switchAccountStore("account-one", { me: DEMO_B, connections: [], activeId: null }));
    act(() => setState((s) => ({ ...s, activeId: "one" })));
    act(() => switchAccountStore("account-two", { me: null, connections: [], activeId: null }));
    expect(result.current.s.me).toBeNull();
    act(() => switchAccountStore("account-one"));
    expect(result.current.s.activeId).toBe("one");
    act(() => switchAccountStore(null));
    expect(result.current.s.me?.name).toBe("Noor");
    unmount();
  });
});