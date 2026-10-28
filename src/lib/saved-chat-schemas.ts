import { z } from "zod";
import { TasteProfileSchema, LiveTurnSchema } from "./chat-schemas";

export const AccountChatSchema = z.object({
  sourceId: z.string().min(1).max(160),
  kind: z.enum(["demo", "local", "live"]),
  ownerSide: z.enum(["a", "b"]).optional(),
  a: TasteProfileSchema,
  b: TasteProfileSchema.nullable(),
  mood: z.string().max(100).nullable(),
  messages: z.array(z.object({ sender: z.enum(["a", "b", "rue"]), content: z.string().max(20000) })).min(1).max(1000),
  game: LiveTurnSchema.shape.game,
  scores: LiveTurnSchema.shape.points,
});
export type AccountChat = z.infer<typeof AccountChatSchema>;