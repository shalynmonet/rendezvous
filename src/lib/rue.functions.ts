import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Category = z.enum(["artist", "film", "tv", "restaurant", "cuisine", "place", "book", "brand"]);
const Taste = z.object({ category: Category, label: z.string().min(1).max(120), entity_id: z.string().optional(), name: z.string().optional() });
const Person = z.object({ name: z.string().min(1).max(60), tastes: z.array(Taste).max(40) });
export type TasteT = z.infer<typeof Taste>;
export type PersonT = z.infer<typeof Person>;

const describe = (p: PersonT) =>
  `${p.name}: ${p.tastes.map((t) => `${t.label} (${t.category}${t.entity_id ? `, qloo:${t.entity_id}` : ""})`).join("; ")}`;

async function resolveOne(p: PersonT): Promise<PersonT> {
  const { resolveItems } = await import("./qloo.server");
  return { ...p, tastes: (await resolveItems(p.tastes)) as PersonT["tastes"] };
}
const resolvePeople = (a: PersonT, b: PersonT) => Promise.all([resolveOne(a), resolveOne(b)]);

export const resolveTaste = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ label: z.string().min(1).max(120), category: Category }).parse(d))
  .handler(async ({ data }) => {
    const { searchEntities } = await import("./qloo.server");
    try {
      return { results: (await searchEntities(data.label, data.category, 5)).map((e) => ({ id: e.id, name: e.name, image: e.image ?? null, description: e.description ?? null })), error: null };
    } catch (e) {
      return { results: [], error: (e as Error).message };
    }
  });

const Reason = z.object({ title: z.string(), reason: z.string() });
const RevealSchema = z.object({ headline: z.string(), common_ground: z.array(Reason), bridges: z.array(Reason), wildcards: z.array(Reason), rue_line: z.string() });
export type Reveal = z.infer<typeof RevealSchema>;

export const tasteReveal = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ a: Person, b: Person }).parse(d))
  .handler(async ({ data }) => {
    const { runAgent } = await import("./agent.server");
    const { compareTastes } = await import("./qloo.server");
    const [a, b] = await resolvePeople(data.a, data.b);
    const comparison = await compareTastes(a.tastes, b.tastes);
    const { result, toolsUsed } = await runAgent({
      system: `Produce a Taste Reveal for two people. Common ground = what they genuinely share (3). Bridges = things from Qloo that connect both worlds (3). Wildcards = one person's lane the other should try (2). Each reason cites the specific taste signal (names of their items and the Qloo result). You may call get_affinities for more evidence.`,
      prompt: `${describe(a)}\n${describe(b)}\n\nQloo comparison (precomputed with compare_tastes):\n${JSON.stringify(comparison)}`,
      finishSchema: RevealSchema,
      finishDescription: "Submit the final Taste Reveal.",
    });
    return { reveal: result, evidence: comparison, toolsUsed: ["compare_tastes", ...toolsUsed], a, b };
  });

const Stop = z.object({ type: z.string(), name: z.string(), address: z.string(), qloo_entity_id: z.string(), reason: z.string() });
const Song = z.object({ song: z.string(), artist: z.string(), reason: z.string() });
const PlanSchema = z.object({ title: z.string(), rue_line: z.string(), stops: z.array(Stop), soundtrack: z.array(Song) });
export type Plan = Omit<z.infer<typeof PlanSchema>, "soundtrack"> & { soundtrack: (z.infer<typeof Song> & { spotify_url: string })[] };

const spotify = (s: { song: string; artist: string }) => `https://open.spotify.com/search/${encodeURIComponent(`${s.song} ${s.artist}`)}`;

export const planDate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ a: Person, b: Person, city: z.string().min(1).max(80), vibe: z.string().max(80), budget: z.string().max(40), swap: z.object({ type: z.string(), avoid: z.array(z.string()) }).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { runAgent } = await import("./agent.server");
    const [a, b] = await resolvePeople(data.a, data.b);
    const swap = data.swap;
    const { result, toolsUsed } = await runAgent({
      system: swap
        ? `Replace ONE stop of type "${swap.type}" in ${data.city}. Call find_places with both people's entity ids. Do not pick any of: ${swap.avoid.join(", ")}. Return stops containing only that one new stop, and an empty soundtrack.`
        : `Plan a date night in ${data.city}: exactly three stops (dinner, activity, nightcap) using find_places with both people's entity ids, then a 12-song soundtrack via build_soundtrack (only well-known real songs by returned artists). Every stop and song needs a reason citing their tastes and the Qloo signal. Use only venues returned by find_places; copy their name, address and id.`,
      prompt: `${describe(a)}\n${describe(b)}\nVibe: ${data.vibe || "surprise me"}. Budget: ${data.budget || "flexible"}.`,
      finishSchema: PlanSchema,
      finishDescription: "Submit the date plan.",
    });
    return { plan: { ...result, soundtrack: result.soundtrack.map((s) => ({ ...s, spotify_url: spotify(s) })) } as Plan, toolsUsed };
  });

const Msg = z.object({ sender: z.enum(["rue", "a", "b"]), content: z.string().max(2000) });
const GameSchema = z.object({
  messages: z.array(z.object({ sender: z.enum(["rue", "b"]), content: z.string() })),
  game: z.object({ type: z.string(), prompt: z.string(), options: z.array(z.string()) }).nullable(),
  points: z.object({ a: z.number(), b: z.number() }),
});
export type ChatTurn = z.infer<typeof GameSchema>;

export const chatTurn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ a: Person, b: Person, mood: z.string().max(40), history: z.array(Msg).max(80), scores: z.object({ a: z.number(), b: z.number() }) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { runAgent } = await import("./agent.server");
    const { tool } = await import("ai");
    const [a, b] = await resolvePeople(data.a, data.b);
    const { result, toolsUsed } = await runAgent({
      system: `You host a playful chat between ${a.name} (person A, the live user) and ${b.name} (person B, whom you SIMULATE faithfully from their tastes — natural, short, human replies).
Mood: ${data.mood}. Games: this_or_that (two options drawn from both people's tastes or Qloo picks), defend_your_pick, guess_my_answer, deep_cuts.
Each turn: react to A's last message in one witty line; if a game is running, have B answer too, then award points (0-2 each, added to current scores) with a light reason; then start the next game with start_game. Use Qloo tools to build options grounded in their tastes.
Messages: 1-3 total, sender "rue" or "b". Keep each under 40 words. Current scores: A ${data.scores.a}, B ${data.scores.b}. Return updated cumulative points.`,
      prompt: `${describe(a)}\n${describe(b)}\n\nChat so far:\n${data.history.map((m) => `${m.sender === "a" ? a.name : m.sender === "b" ? b.name : "Rue"}: ${m.content}`).join("\n") || "(just started — greet them and launch the first game)"}`,
      finishSchema: GameSchema,
      finishDescription: "Submit Rue's (and simulated B's) messages, the next game card, and cumulative points.",
      extraTools: {
        start_game: tool({
          description: "Pick the next game type.",
          inputSchema: z.object({ type: z.enum(["this_or_that", "defend_your_pick", "guess_my_answer", "deep_cuts"]) }),
          execute: async ({ type }) => ({ ok: true, type }),
        }),
      },
    });
    return { turn: result, toolsUsed };
  });

const PortraitSchema = z.object({
  portrait: z.object({ headline: z.string(), summary: z.string(), signals: z.array(Reason.extend({ label: z.string() }).omit({ title: true })), surprise: z.string() }),
  draft_plan: z.object({ stops: z.array(z.object({ type: z.string(), name: z.string(), reason: z.string() })) }),
});

export const submitConcierge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      planner_name: z.string().trim().min(1).max(80),
      planner_email: z.string().trim().email().max(200),
      loved_one_name: z.string().trim().min(1).max(80),
      occasion: z.string().max(120),
      format: z.enum(["date", "weekend", "trip"]),
      city_or_destination: z.string().min(1).max(120),
      dates: z.string().max(120),
      budget: z.string().max(60),
      loved_one_tastes: z.array(Taste).min(1).max(30),
      notes: z.string().max(2000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { runAgent } = await import("./agent.server");
    const lo = await resolveOne({ name: data.loved_one_name, tastes: data.loved_one_tastes });
    const { result } = await runAgent({
      system: `A planner wants a ${data.format} for ${lo.name} (${data.occasion}) in ${data.city_or_destination}, ${data.dates}, budget ${data.budget}. Notes: ${data.notes}.
Build a Taste Portrait (headline, 2-3 sentence summary, 3-4 signals each with a reason citing Qloo affinities, one surprise idea) using get_affinities across a few types. Then a draft plan of 3 stops using find_places in the destination, each with a reason.`,
      prompt: describe(lo),
      finishSchema: PortraitSchema,
      finishDescription: "Submit the Taste Portrait and draft plan.",
    });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("concierge_requests").insert({
      ...data,
      loved_one_tastes: lo.tastes,
      taste_portrait: result.portrait,
      draft_plan: result.draft_plan,
    });
    if (error) {
      console.error("concierge insert failed", error);
      throw new Error("Could not save your request. Please try again.");
    }
    return result;
  });
