import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WorkspaceSchema, withoutCapabilities } from "./account-workspace-schemas";
import { TasteProfileSchema } from "./chat-schemas";
import { AccountChatSchema } from "./saved-chat-schemas";
import type { Json } from "@/integrations/supabase/types";

export const readAccountWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("account_workspaces").select("data,revision").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error("Could not restore your account data.");
  const { data: profile } = await context.supabase.from("profiles").select("taste_profile").eq("id", context.userId).maybeSingle();
  const raw = (data?.data ?? {}) as Record<string, unknown>;
  const state = WorkspaceSchema.parse({ me: profile?.taste_profile ? TasteProfileSchema.parse(profile.taste_profile) : null, connections: [], activeId: null, ...raw });
  if (data) {
    // This owner-scoped workspace read authorizes fetching only this user's private room backups.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: links } = await supabaseAdmin.from("account_room_links").select("room_id,participant_key,invitation_key").eq("user_id", context.userId);
    for (const link of links ?? []) {
      const { error: accessError } = await context.supabase.rpc("guest_chat_access", { p_action: "read", p_room: link.room_id, p_token: link.participant_key });
      if (accessError) continue;
      // Saved partners carry a "live:<room>" id, so match both forms or the restored room never attaches.
      const connection = state.connections.find((c) => c.id === link.room_id || c.id === `live:${link.room_id}`);
      if (connection) connection.room = { id: link.room_id, token: link.participant_key };
      if (raw["pendingRoomId"] === link.room_id) state.pendingRoom = { id: link.room_id, token: link.participant_key, ...(link.invitation_key ? { invite: link.invitation_key } : {}) };
    }
  }
  return { stateJson: JSON.stringify(state), revision: data?.revision ?? 0, exists: !!data };
});

export const saveAccountWorkspace = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ state: WorkspaceSchema, revision: z.number().int().nonnegative() }).parse(input))
  .handler(async ({ data, context }) => {
    const rooms = [...data.state.connections.flatMap((c) => c.room ? [c.room] : []), ...(data.state.pendingRoom ? [data.state.pendingRoom] : [])];
    for (const room of rooms) {
      const { error } = await context.supabase.rpc("guest_chat_access", { p_action: "read", p_room: room.id, p_token: room.token });
      if (error) continue;
      // Authenticate the account and prove room access before backing up its capability.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: backupError } = await supabaseAdmin.from("account_room_links").upsert({ user_id: context.userId, room_id: room.id, participant_key: room.token, ...(room.invite ? { invitation_key: room.invite } : {}) });
      if (backupError) throw new Error("Could not save your live connection.");
    }
    const { data: result, error } = await context.supabase.rpc("save_account_workspace", { p_data: withoutCapabilities(data.state) as Json, p_revision: data.revision });
    if (error) throw new Error("Could not save your account data.");
    const status = result as { conflict: boolean; revision?: number };
    if (status.conflict) return { conflict: true, revision: data.revision };
    if (data.state.me) {
      const { error: profileError } = await context.supabase.from("profiles").upsert({ id: context.userId, taste_profile: data.state.me, updated_at: new Date().toISOString() });
      if (profileError) throw new Error("Could not save your tastes.");
    }
    // Live chat snapshots are always read through the proven capability, not supplied by the browser.
    for (const room of rooms) {
      const { data: live, error: liveError } = await context.supabase.rpc("guest_chat_access", { p_action: "read", p_room: room.id, p_token: room.token });
      if (liveError || !live) continue;
      const { LiveStateSchema } = await import("./chat-schemas");
      const state = LiveStateSchema.parse(live);
      if (!state.messages.length) continue;
      const snapshot = AccountChatSchema.parse({ sourceId: `live:${state.id}`, kind: "live", ownerSide: state.side, a: state.a, b: state.b, mood: state.mood, messages: state.messages, game: state.game, scores: state.scores });
      const { error: saveError } = await context.supabase.from("saved_chats").upsert({ user_id: context.userId, source_id: snapshot.sourceId, snapshot, updated_at: new Date().toISOString() }, { onConflict: "user_id,source_id" });
      if (saveError) throw new Error("Could not save your live conversation.");
    }
    for (const connection of data.state.connections.filter((c) => !c.room)) {
      for (const chat of data.state.chats?.[connection.id] ?? []) {
        if (!chat.messages.length) continue;
        const snapshot = AccountChatSchema.parse({ sourceId: `local:${chat.id}`, kind: connection.demo ? "demo" : "local", a: data.state.me, b: connection.profile, ...chat });
        const { error: chatError } = await context.supabase.from("saved_chats").upsert({ user_id: context.userId, source_id: snapshot.sourceId, snapshot, updated_at: chat.updatedAt }, { onConflict: "user_id,source_id" });
        if (chatError) throw new Error("Could not save your conversations.");
      }
    }
    return { conflict: false, revision: status.revision ?? data.revision + 1 };
  });