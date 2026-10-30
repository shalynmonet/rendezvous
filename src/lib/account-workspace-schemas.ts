import { z } from "zod";
import { TasteProfileSchema, GuestKeySchema } from "./chat-schemas";
import { conversationProfile } from "./lifestyle";

const Room = z.object({ id: z.string().uuid(), token: GuestKeySchema, invite: GuestKeySchema.optional() });
const Message = z.object({ sender: z.enum(["a", "b", "rue"]), content: z.string().max(20000) });
const JsonValue: z.ZodType<unknown> = z.lazy(() => z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(JsonValue), z.record(z.string(), JsonValue)]));
export const WorkspaceSchema = z.object({
  me: TasteProfileSchema.nullable(),
  connections: z.array(z.object({ id: z.string().max(160), label: z.string().max(100), profile: TasteProfileSchema.transform(conversationProfile), demo: z.boolean().optional(), room: Room.optional(), addedAt: z.string().optional(), differentFrom: z.array(z.string().max(160)).max(200).optional() })).max(200),
  activeId: z.string().nullable(),
  pendingRoom: Room.optional(), pendingInvite: GuestKeySchema.optional(),
  lastPlan: JsonValue.optional(), lastChat: z.object({ mood: z.string(), scores: z.object({ a: z.number(), b: z.number() }), highlight: z.string() }).optional(),
  chats: z.record(z.string(), z.array(z.object({ id: z.string(), muted: z.boolean().optional(), mood: z.string(), messages: z.array(Message).max(1000), game: z.object({ type: z.string(), prompt: z.string(), options: z.array(z.string()) }).nullable(), scores: z.object({ a: z.number(), b: z.number() }), updatedAt: z.string(), resetAt: z.number().int().min(0).optional() })).max(200)).optional(),
  selectedChats: z.record(z.string(), z.string().nullable()).optional(),
  memories: z.array(z.object({ id: z.string(), connectionId: z.string(), activity: z.string(), milestone: z.string(), rating: z.number().min(1).max(5), notes: z.string(), commentary: z.string(), at: z.string() })).max(2000).optional(),
  ruelette: z.record(z.string(), JsonValue).optional(), plans: z.record(z.string(), JsonValue).optional(), reveals: z.record(z.string(), JsonValue).optional(), gifts: z.record(z.string(), JsonValue).optional(),
}).refine((data) => JSON.stringify(data).length <= 20_000_000, "Account data is too large. Try smaller photos.");

export function withoutCapabilities(data: z.infer<typeof WorkspaceSchema>) {
  const { pendingRoom, pendingInvite, ...safe } = data;
  return { ...safe, connections: safe.connections.map(({ room, ...connection }) => connection), pendingRoomId: pendingRoom?.id ?? null };
}