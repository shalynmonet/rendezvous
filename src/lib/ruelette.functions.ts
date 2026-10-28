import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Category = z.enum(["artist", "film", "tv", "restaurant", "cuisine", "place", "book", "brand"]);
const Taste = z.object({ category: Category, label: z.string().min(1).max(120), entity_id: z.string().optional(), name: z.string().optional() });
const Person = z.object({ name: z.string().min(1).max(60), tastes: z.array(Taste).max(40) });
type P = z.infer<typeof Person>;

export const MODES = ["game_prompt", "song", "recipe", "photo_booth", "portrait"] as const;
export type AiMode = (typeof MODES)[number];

const base = { title: z.string(), rue_line: z.string(), reason: z.string() };
const SCHEMAS = {
  game_prompt: z.object({ ...base, prompt: z.string(), how_to_play: z.array(z.string()) }),
  song: z.object({ ...base, song: z.string(), artist: z.string(), artist_background: z.string(), mood: z.string() }),
  recipe: z.object({
    ...base,
    menu: z.array(z.object({ course: z.string(), dish: z.string() })),
    ingredients: z.array(z.string()),
    steps: z.array(z.string()),
    cook_together: z.array(z.string()),
  }),
  photo_booth: z.object({ ...base, prompt: z.string(), twist: z.string() }),
  portrait: z.object({ ...base, prompt_for_a: z.string(), prompt_for_b: z.string(), rules: z.array(z.string()) }),
} as const;
export type Activity =
  | ({ mode: "game_prompt" } & z.infer<typeof SCHEMAS.game_prompt>)
  | ({ mode: "song" } & z.infer<typeof SCHEMAS.song> & { spotify_url: string })
  | ({ mode: "recipe" } & z.infer<typeof SCHEMAS.recipe>)
  | ({ mode: "photo_booth" } & z.infer<typeof SCHEMAS.photo_booth>)
  | ({ mode: "portrait" } & z.infer<typeof SCHEMAS.portrait>);

const BRIEF: Record<AiMode, string> = {
  game_prompt: "Write a ready-to-paste prompt for an external AI game builder (like Chatforce) that builds a short two-player co-op browser game themed on BOTH people's tastes. The prompt should specify genre, mechanics, art direction, win condition and references to their favorites. Add 3-4 how_to_play tips for the couple.",
  song: "Pick ONE real, well-known song that pairs their tastes (use build_soundtrack). Give the artist's background in 2 sentences and a vivid mood description.",
  recipe: "Design a themed date-night menu to cook at home (3 courses), tailored to their cuisines and the vibe of their films/music. Give ingredients, numbered steps, and a cook_together checklist splitting tasks between the two by name.",
  photo_booth: "Write a wild cross-domain AI image prompt mashing up both people's tastes (e.g. a film's aesthetic meets an artist's album cover) for each partner to run in their own image tool, plus a playful twist rule.",
  portrait: "Write a caricature/portrait challenge: a prompt for each partner to sketch or generate a playful portrait of the OTHER person styled after that other person's own favorites, plus 3 short rules.",
};

const describe = (p: P) => `${p.name}: ${p.tastes.map((t) => `${t.label} (${t.category}${t.entity_id ? `, qloo:${t.entity_id}` : ""})`).join("; ")}`;

export const spinRuelette = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ mode: z.enum(MODES), a: Person, b: Person }).parse(d))
  .handler(async ({ data }): Promise<{ activity: Activity }> => ({ activity: await generate(data.mode, data.a, data.b) }));

async function generate(mode: AiMode, pa: P, pb: P): Promise<Activity> {
    const data = { mode, a: pa, b: pb };
    const { runAgent } = await import("./agent.server");
    const { resolveItems } = await import("./qloo.server");
    const [a, b] = await Promise.all([data.a, data.b].map(async (p) => ({ ...p, tastes: (await resolveItems(p.tastes)) as P["tastes"] })));
    const { result } = await runAgent({
      system: `You are hosting Rue-lette, a spin-the-wheel date activity. ${BRIEF[data.mode]} Keep it fun and grounded in their real tastes; 'reason' cites the specific taste signals. rue_line is your one-line diva host intro.`,
      prompt: `${describe(a!)}\n${describe(b!)}`,
      finishSchema: SCHEMAS[data.mode] as z.ZodType<Record<string, unknown>>,
      finishDescription: "Submit the Rue-lette activity.",
    });
    const act = { mode: data.mode, ...result } as Activity;
    if (act.mode === "song") act.spotify_url = `https://open.spotify.com/search/${encodeURIComponent(`${act.song} ${act.artist}`)}`;
    return act;
}

export const rueView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ a: z.string().max(60), b: z.string().max(60), activity: z.string().max(200), rating: z.number().int().min(1).max(5), notes: z.string().max(1000) }).parse(d),
  )
  .handler(async ({ data }) => debriefWith(data));

async function debriefWith(data: { a: string; b: string; activity: string; rating: number; notes: string }) {
    const { runAgent } = await import("./agent.server");
    const { result } = await runAgent({
      system: `This is the Rue-view: a debrief after ${data.a} and ${data.b} finished a Rue-lette activity. React in your signature diva-host voice: 2-3 witty sentences responding to their rating and notes, then a short milestone title for their memory book. No tools needed.`,
      prompt: `Activity: ${data.activity}\nRating: ${data.rating}/5\nTheir notes: ${data.notes || "(none)"}`,
      finishSchema: z.object({ commentary: z.string(), milestone: z.string() }),
      finishDescription: "Submit your debrief.",
    });
    return result;
}

// ---------- Shared (live) Rue-lette in a private two-person room ----------
const Key = z.string().regex(/^[a-f0-9]{64}$/);
const RoomIn = { room: z.string().uuid(), token: Key };
const BUCKET = "ruelette-photos";

export type RoomRuelette = {
  side: "a" | "b";
  joined: boolean;
  spin_id: string | null;
  mode: "game" | AiMode | null;
  rot: number;
  by: "a" | "b" | null;
  status: "generating" | "ready" | "error" | null;
  activity: Activity | null;
  error: string | null;
  photos: { a: string | null; b: string | null };
  debrief: { commentary: string; milestone: string; rating: number; notes: string; by: "a" | "b"; at: string } | null;
};

type RawRl = { spin_id?: string; mode?: RoomRuelette["mode"]; rot?: number; by?: "a" | "b"; status?: RoomRuelette["status"]; activity?: Activity | null; error?: string | null; uploads?: { a?: string; b?: string }; debrief?: RoomRuelette["debrief"] };

async function rpc(room: string, token: string, action: string, payload: Record<string, unknown> = {}) {
  const { guestClient } = await import("./guest-chat.server");
  const { data, error } = await guestClient().rpc("guest_ruelette" as never, { p_room: room, p_token: token, p_action: action, p_payload: payload } as never);
  if (error) throw new Error((error as { message: string }).message);
  return data as unknown as { side: "a" | "b"; joined?: boolean; ruelette: RawRl };
}

async function shape(r: Awaited<ReturnType<typeof rpc>>): Promise<RoomRuelette> {
  const rl: RawRl = r.ruelette ?? {};
  const uploads = rl.uploads ?? {};
  const photos: RoomRuelette["photos"] = { a: null, b: null };
  const paths = (["a", "b"] as const).filter((k) => uploads[k]);
  if (paths.length) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const k of paths) {
      const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(uploads[k]!, 3600);
      photos[k] = data?.signedUrl ?? null;
    }
  }
  return {
    side: r.side, joined: r.joined ?? true, spin_id: rl.spin_id ?? null, mode: rl.mode ?? null, rot: Number(rl.rot ?? 0),
    by: rl.by ?? null, status: rl.status ?? null, activity: rl.activity ?? null, error: rl.error ?? null, photos, debrief: rl.debrief ?? null,
  };
}

export const roomRuelette = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object(RoomIn).parse(d))
  .handler(async ({ data }) => shape(await rpc(data.room, data.token, "read")));

export const roomSpin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ...RoomIn, mode: z.enum(["game", ...MODES]), rot: z.number().finite(), a: Person, b: Person }).parse(d))
  .handler(async ({ data }) => {
    const r = await rpc(data.room, data.token, "spin", { mode: data.mode, rot: data.rot });
    if (data.mode === "game") return shape(r);
    const spin_id = r.ruelette.spin_id as string;
    try {
      const activity = await generate(data.mode, data.a, data.b);
      return shape(await rpc(data.room, data.token, "activity", { spin_id, activity }));
    } catch (e) {
      return shape(await rpc(data.room, data.token, "activity", { spin_id, error: (e as Error).message.slice(0, 300) }));
    }
  });

export const roomUpload = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ...RoomIn, spin_id: z.string().uuid(), image: z.string().max(8_000_000).regex(/^data:image\/(png|jpeg|webp|gif);base64,/) }).parse(d))
  .handler(async ({ data }) => {
    const r = await rpc(data.room, data.token, "read");
    if (r.ruelette?.spin_id !== data.spin_id) throw new Error("That activity has changed.");
    const [head, b64] = data.image.split(",");
    const type = head!.slice(5, head!.indexOf(";"));
    const bytes = Uint8Array.from(atob(b64!), (c) => c.charCodeAt(0));
    if (bytes.length > 6 * 1024 * 1024) throw new Error("Photo is too large (6 MB max).");
    const path = `${data.room}/${data.spin_id}/${r.side}-${crypto.randomUUID()}.${type.split("/")[1]}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: type });
    if (error) throw new Error("Upload failed. Please try again.");
    return shape(await rpc(data.room, data.token, "upload", { spin_id: data.spin_id, path }));
  });

export const roomDebrief = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ ...RoomIn, spin_id: z.string().uuid(), a: z.string().max(60), b: z.string().max(60), activity: z.string().max(200), rating: z.number().int().min(1).max(5), notes: z.string().max(1000) }).parse(d))
  .handler(async ({ data }) => {
    const res = await debriefWith(data);
    return shape(await rpc(data.room, data.token, "debrief", { spin_id: data.spin_id, debrief: { ...res, rating: data.rating, notes: data.notes } }));
  });
