import { z } from "zod";
import { GuestKeySchema, LiveTurnSchema, TasteProfileSchema } from "./chat-schemas";
import { guestClient } from "./guest-chat.server";
import { runAgent } from "./agent.server";
import { conversationDirection, preserveConversationScores } from "./conversation-style";
import { conversationProfile } from "./lifestyle";

const Input = z.object({
  room: z.string().uuid(),
  token: GuestKeySchema,
  mood: z.string().max(40),
});
const Claim = z.object({
  claimed: z.boolean(),
  claim: z.string().uuid().optional(),
  a: TasteProfileSchema.optional(),
  b: TasteProfileSchema.optional(),
  messages: z
    .array(z.object({ sender: z.enum(["a", "b", "rue"]), content: z.string() }))
    .optional(),
  scores: LiveTurnSchema.shape.points.optional(),
  mood: z.string().optional(),
  game: LiveTurnSchema.shape.game.optional(),
});
export async function hostLiveChat(request: Request) {
  const input = Input.safeParse(await request.json());
  if (!input.success) return Response.json({ error: "Invalid chat request." }, { status: 400 });
  const { room, token, mood } = input.data;
  const rpc = await guestClient().rpc("guest_chat_access", {
    p_action: "claim",
    p_room: room,
    p_token: token,
    p_mood: mood,
  });
  if (rpc.error) return Response.json({ error: rpc.error.message }, { status: 403 });
  const c = Claim.parse(rpc.data);
  if (!c.claimed) return Response.json({ waiting: true });
  if (!c.claim || !c.a || !c.b || !c.scores || !c.messages)
    return Response.json({ error: "Could not start Ru." }, { status: 500 });
  const claim = c.claim,
    a = c.a,
    b = c.b,
    scores = c.scores,
    messages = c.messages;
  // The database-issued claim authenticates this privileged completion. Human messages continue independently.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (value: unknown) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(value) + "\n"));
        } catch {
          /* client disconnected; finish saving the claimed turn */
        }
      };
      const heartbeat = setInterval(() => emit({ status: "thinking" }), 1000);
      try {
        const { result, toolsUsed } = await runAgent({
          system: `Host a live conversation between two REAL participants, ${a.name} (A) and ${b.name} (B). Never impersonate either participant or invent their answers. Return messages from Ru ONLY. Mood: ${c.mood}. Current scores A ${scores.a}, B ${scores.b}. Current conversation card: ${JSON.stringify(c.game)}. React warmly and specifically to their actual answers. Only award 0-2 points each when they answered a scored game, never for personal stories or ordinary conversation. ${conversationDirection(c.game)} Use the taste profiles for personal grounding; call Qloo for discovery recommendations or game evidence, not unnecessarily on ordinary follow-ups. One or two short Ru messages, each under 40 words.`,
          prompt: `${JSON.stringify({ a: conversationProfile(a), b: conversationProfile(b) })}\nActual conversation:\n${
            messages
              .map(
                (m) =>
                  `${m.sender === "a" ? a.name : m.sender === "b" ? b.name : "Ru"}: ${m.content}`,
              )
              .join("\n") || "Greet both people and open with a warm question."
          }`,
          finishSchema: LiveTurnSchema,
          finishDescription: "Submit Ru messages only, the next conversation card and cumulative points.",
        });
        result.points = preserveConversationScores(c.game, scores, result.points);
        const saved = await supabaseAdmin.rpc("finish_guest_chat", {
          p_room: room,
          p_claim: claim,
          p_turn: JSON.parse(JSON.stringify(result)),
          p_tools: toolsUsed,
        });
        if (saved.error || !saved.data) throw new Error("Could not save Ru’s game.");
        emit({ done: true });
      } catch (e) {
        const error = (e as Error).message;
        await supabaseAdmin.rpc("finish_guest_chat", {
          p_room: room,
          p_claim: claim,
          p_turn: {},
          p_tools: [],
          p_error: error,
        });
        emit({ error });
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* disconnected */
        }
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}
