import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GuestKeySchema, TasteProfileSchema, LiveStateSchema } from "./chat-schemas";

const AccessSchema = z.object({
  action: z.enum(["create", "preview", "join", "read", "send", "mute", "unmute", "profile"]),
  room: z.string().uuid().optional(),
  token: GuestKeySchema,
  invite: GuestKeySchema.optional(),
  profile: TasteProfileSchema.optional(),
  text: z.string().trim().min(1).max(2000).optional(),
  messageId: z.string().uuid().optional(),
});
export const chatAccess = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AccessSchema.parse(d))
  .handler(async ({ data }) => {
    const { guestClient } = await import("./guest-chat.server");
    const { data: result, error } = await guestClient().rpc("guest_chat_access", {
      p_action: data.action,
      p_token: data.token,
      ...(data.room ? { p_room: data.room } : {}),
      ...(data.invite ? { p_invite: data.invite } : {}),
      ...(data.profile ? { p_profile: JSON.parse(JSON.stringify(data.profile)) } : {}),
      ...(data.text ? { p_text: data.text } : {}),
      ...(data.messageId ? { p_message_id: data.messageId } : {}),
    });
    if (error) throw new Error(error.message);
    if (["read", "send", "mute", "unmute", "profile"].includes(data.action))
      return { state: LiveStateSchema.parse(result), id: null, profile: null, joined: false };
    const parsed = z
      .object({
        id: z.string().uuid(),
        profile: TasteProfileSchema.optional(),
        joined: z.boolean().optional(),
      })
      .parse(result);
    return {
      state: null,
      id: parsed.id,
      profile: parsed.profile ?? null,
      joined: parsed.joined ?? false,
    };
  });

/** Marks you as present in a room and reports whether the other person is waiting there. */
export const roomPresence = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ room: z.string().uuid(), token: GuestKeySchema, here: z.boolean() }).parse(d))
  .handler(async ({ data }) => {
    const { guestClient } = await import("./guest-chat.server");
    const { data: r, error } = await guestClient().rpc("guest_room_presence", { p_room: data.room, p_token: data.token, p_here: data.here });
    if (error) throw new Error(error.message);
    return { otherWaiting: z.object({ other_waiting: z.boolean() }).parse(r).other_waiting };
  });
