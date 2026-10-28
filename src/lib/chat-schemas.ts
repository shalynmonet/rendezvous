import { z } from "zod";

export const TasteProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  city: z.string().trim().max(80),
  tastes: z
    .array(
      z.object({
        category: z.enum([
          "artist",
          "film",
          "tv",
          "restaurant",
          "cuisine",
          "place",
          "book",
          "brand",
        ]),
        label: z.string().min(1).max(120),
        entity_id: z.string().optional(),
        name: z.string().optional(),
      }),
    )
    .min(3)
    .max(40),
});
export const GuestKeySchema = z.string().regex(/^[a-f0-9]{64}$/);
export const LiveTurnSchema = z.object({
  messages: z.array(z.object({ sender: z.enum(["rue"]), content: z.string() })),
  game: z.object({ type: z.string(), prompt: z.string(), options: z.array(z.string()) }).nullable(),
  points: z.object({ a: z.number(), b: z.number() }),
});
export const LiveStateSchema = z.object({
  id: z.string().uuid(),
  side: z.enum(["a", "b"]),
  a: TasteProfileSchema,
  b: TasteProfileSchema.nullable(),
  messages: z.array(
    z.object({
      id: z.string(),
      sender: z.enum(["a", "b", "rue"]),
      content: z.string(),
      at: z.string(),
    }),
  ),
  game: LiveTurnSchema.shape.game,
  scores: LiveTurnSchema.shape.points,
  mood: z.string().nullable(),
  tools: z.array(z.string()),
  busy: z.boolean(),
  error: z.string().nullable(),
});
export type LiveState = z.infer<typeof LiveStateSchema>;
export type GuestRoom = { id: string; token: string; invite?: string };
export function newGuestKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
}
export function needsProfileChoice(local: unknown, saved: unknown) {
  return !!local && !!saved && JSON.stringify(local) !== JSON.stringify(saved);
}
