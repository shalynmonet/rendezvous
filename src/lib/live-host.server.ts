import { z } from "zod";
import { GuestKeySchema, LiveTurnSchema, TasteProfileSchema } from "./chat-schemas";
import { guestClient } from "./guest-chat.server";
import { runAgent } from "./agent.server";

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
    return Response.json({ error: "Could not start Rue." }, { status: 500 });
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
          system: `Host a live chat between two REAL participants, ${a.name} (A) and ${b.name} (B). Never impersonate either participant and never invent their answers. Return messages from Rue ONLY. Mood: ${c.mood}. Current scores A ${scores.a}, B ${scores.b}. Current game: ${JSON.stringify(c.game)}. If both people have answered, react to their actual answers and add 0-2 points each, with a short reason; otherwise do not change scores. Then start a new taste-grounded game: this_or_that, defend_your_pick, guess_my_answer, or deep_cuts. Call Qloo tools for evidence and mention specific favorite names in your reasons. One or two short Rue messages, each under 40 words. Game options must be grounded in the profiles.`,
          prompt: `${JSON.stringify({ a, b })}\nActual conversation:\n${
            messages
              .slice(-80)
              .map(
                (m) =>
                  `${m.sender === "a" ? a.name : m.sender === "b" ? b.name : "Rue"}: ${m.content}`,
              )
              .join("\n") || "Greet both people and start the first game."
          }`,
          finishSchema: LiveTurnSchema,
          finishDescription: "Submit Rue messages only, the next game and cumulative points.",
        });
        const saved = await supabaseAdmin.rpc("finish_guest_chat", {
          p_room: room,
          p_claim: claim,
          p_turn: JSON.parse(JSON.stringify(result)),
          p_tools: toolsUsed,
        });
        if (saved.error || !saved.data) throw new Error("Could not save Rue’s game.");
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
