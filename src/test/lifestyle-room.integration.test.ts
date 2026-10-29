import { describe, expect, it } from "vitest";
import { newGuestKey } from "@/lib/chat-schemas";
const url = process.env["SUPABASE_URL"], key = process.env["SUPABASE_PUBLISHABLE_KEY"];
const profile = { name: "Privacy test", city: "Chicago", tastes: [{ category: "artist", label: "Frank Ocean" }, { category: "film", label: "Spirited Away" }, { category: "tv", label: "The Bear" }], lifestyle: { alcohol: "Sober / in recovery", tobacco: "Trying to quit", cannabis: "Never", openToPartner: false } };
async function rpc(input: Record<string, unknown>) {
  if (!url || !key) throw new Error("Test connection unavailable");
  const response = await fetch(`${url}/rest/v1/rpc/guest_chat_access`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message);
  return result;
}
describe.skipIf(!url || !key)("Lifestyle room authorization", () => {
  it("sanitizes preview, partner read and host claim including legacy profiles without consent", async () => {
    const a = newGuestKey(), b = newGuestKey(), invite = newGuestKey();
    const { id } = await rpc({ p_action: "create", p_token: a, p_invite: invite, p_profile: profile });
    const preview = await rpc({ p_action: "preview", p_token: newGuestKey(), p_invite: invite });
    expect(preview.profile.lifestyle).toBeUndefined();
    await rpc({ p_action: "join", p_token: b, p_invite: invite, p_profile: profile });
    const read = await rpc({ p_action: "read", p_room: id, p_token: b });
    expect(read.a.lifestyle).toBeUndefined();
    expect(read.b.lifestyle).toBeUndefined();
    const claim = await rpc({ p_action: "claim", p_room: id, p_token: a });
    expect(claim.claimed).toBe(true);
    expect(claim.a.lifestyle).toBeUndefined();
    expect(claim.b.lifestyle).toBeUndefined();
  });
  it("allows field-specific consent, permits revocation and denies a partner changing the owner's consent", async () => {
    const a = newGuestKey(), b = newGuestKey(), invite = newGuestKey();
    const { id } = await rpc({ p_action: "create", p_token: a, p_invite: invite, p_profile: { ...profile, lifestyle: { ...profile.lifestyle, shared: ["alcohol"] } } });
    await rpc({ p_action: "join", p_token: b, p_invite: invite, p_profile: profile });
    expect((await rpc({ p_action: "read", p_room: id, p_token: b })).a.lifestyle).toEqual({ alcohol: "Sober / in recovery" });
    await rpc({ p_action: "profile", p_room: id, p_token: b, p_profile: { ...profile, lifestyle: { ...profile.lifestyle, shared: ["tobacco"] } } });
    expect((await rpc({ p_action: "read", p_room: id, p_token: a })).a.lifestyle).toEqual({ alcohol: "Sober / in recovery" });
    await rpc({ p_action: "profile", p_room: id, p_token: a, p_profile: profile });
    expect((await rpc({ p_action: "read", p_room: id, p_token: b })).a.lifestyle).toBeUndefined();
    await expect(rpc({ p_action: "profile", p_room: id, p_token: newGuestKey(), p_profile: profile })).rejects.toThrow("denied");
  });
});