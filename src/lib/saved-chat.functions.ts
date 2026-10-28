import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AccountChatSchema } from "./saved-chat-schemas";
import { GuestKeySchema, LiveStateSchema } from "./chat-schemas";

export const saveAccountChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.union([
    z.object({ snapshot: AccountChatSchema.refine((chat) => chat.kind !== "live") }),
    z.object({ room: z.string().uuid(), token: GuestKeySchema }),
  ]).parse(input))
  .handler(async ({ data, context }) => {
    let snapshot;
    if ("room" in data) {
      const { data: result, error } = await context.supabase.rpc("guest_chat_access", { p_action: "read", p_room: data.room, p_token: data.token });
      if (error) throw new Error("Could not open this private chat.");
      const live = LiveStateSchema.parse(result);
      snapshot = AccountChatSchema.parse({ sourceId: `live:${live.id}`, kind: "live", ownerSide: live.side, a: live.a, b: live.b, mood: live.mood, messages: live.messages.map(({ sender, content }) => ({ sender, content })), game: live.game, scores: live.scores });
    } else snapshot = data.snapshot;
    const { error } = await context.supabase.from("saved_chats").upsert({ user_id: context.userId, source_id: snapshot.sourceId, snapshot, updated_at: new Date().toISOString() }, { onConflict: "user_id,source_id" });
    if (error) throw new Error("Could not save this chat to your account.");
    return { saved: true };
  });

export const listAccountChats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("saved_chats").select("id,snapshot,updated_at").eq("user_id", context.userId).order("updated_at", { ascending: false });
    if (error) throw new Error("Could not load your saved chats.");
    return (data ?? []).map((row) => ({ id: row.id, updatedAt: row.updated_at, snapshot: AccountChatSchema.parse(row.snapshot) }));
  });