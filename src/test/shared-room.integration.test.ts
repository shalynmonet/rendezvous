import { beforeAll, describe, expect, it } from "vitest";
import { newGuestKey } from "@/lib/chat-schemas";

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
const profile = { name: "Consent test", city: "Chicago", tastes: [{ category: "artist", label: "Frank Ocean" }, { category: "film", label: "Spirited Away" }, { category: "tv", label: "The Bear" }] };
const a = newGuestKey(), b = newGuestKey(), invite = newGuestKey();
let room: string;
async function rpc(fn: string, input: Record<string, unknown>) {
  if (!url || !key) throw new Error("Test connection is unavailable");
  const response = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message);
  return data;
}
describe.skipIf(!url || !key)("Shared room controls", () => {
  beforeAll(async () => {
    room = (await rpc("guest_chat_access", { p_action: "create", p_token: a, p_invite: invite, p_profile: profile })).id;
    await rpc("guest_chat_access", { p_action: "join", p_token: b, p_invite: invite, p_profile: profile });
  });
  it("defaults to unmuted, shares mute with the partner, and refuses muted host claims", async () => {
    expect((await rpc("guest_chat_access", { p_action: "read", p_room: room, p_token: a })).muted).toBe(false);
    await rpc("guest_chat_access", { p_action: "mute", p_room: room, p_token: a });
    expect((await rpc("guest_chat_access", { p_action: "read", p_room: room, p_token: b })).muted).toBe(true);
    expect((await rpc("guest_chat_access", { p_action: "claim", p_room: room, p_token: b })).claimed).toBe(false);
    expect((await rpc("guest_chat_access", { p_action: "unmute", p_room: room, p_token: b })).muted).toBe(false);
  });
  it("keeps the current spin until the other participant approves, and rejects duplicate approval", async () => {
    const spin = (token: string, action: string, payload: Record<string, unknown>) => rpc("guest_ruelette", { p_room: room, p_token: token, p_action: action, p_payload: payload });
    const first = (await spin(a, "spin", { mode: "game", rot: 330, expected_spin: null })).ruelette;
    const requested = (await spin(a, "spin", { mode: "game", rot: 690, expected_spin: first.spin_id })).ruelette;
    expect(requested.spin_id).toBe(first.spin_id);
    expect(requested.rot).toBe(330);
    const approval = { expected_spin: first.spin_id, proposal_id: requested.next_spin.id };
    await expect(spin(a, "approve_spin", approval)).rejects.toThrow("other person");
    const next = (await spin(b, "approve_spin", approval)).ruelette;
    expect(next.spin_id).not.toBe(first.spin_id);
    expect(next.rot).toBe(690);
    await expect(spin(b, "approve_spin", approval)).rejects.toThrow("activity has changed");
  });
  it("rejects private controls without a participant key", async () => {
    await expect(rpc("guest_chat_access", { p_action: "mute", p_room: room, p_token: newGuestKey() })).rejects.toThrow("denied");
  });
});