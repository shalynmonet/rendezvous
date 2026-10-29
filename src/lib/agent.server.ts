// Server-only agent runner: Ru chooses and calls tools, then calls `finish` with a structured result.
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs, type ToolSet } from "ai";
import { z } from "zod";
import {
  compareTastes,
  insights,
  PLACE_KIND_TAG,
  searchEntities,
  type TasteCategory,
} from "./qloo.server";
import { createLovableAiGatewayRunIdFetch } from "./run-id.server";
import { assertLifestyleDiscretion } from "./lifestyle";

const MODEL = "openai/gpt-6-astra";

export const RUE_PERSONA = `You are Ru, a sleek red fox in a houndstooth silk scarf, host of Rendezvous.
Clever, charming, a little mischievous, deeply discreet.
Voice: short, witty lines. One clever turn per message. Notice details and reflect them back. Tease gently, never embarrass.
Occasional French touches ("Voilà", "Bonsoir"), never every line.
Grounding: ALWAYS tie suggestions to real taste signals from the Qloo tools ("You both love X, so..."). Never invent taste data.
Never: cheesy pickup lines, generic "love language" questions, pressure, or sexual content.
Discretion: never reveal one person's private answers to the other before the Taste Reveal.
Lifestyle is NEVER Taste Reveal material. Never state, infer, ask about, or explain either person's alcohol, tobacco/vaping, cannabis/420 use, sobriety, recovery or partner preferences in chat, games, reveals or shared reasons, even if shared or requested by the other person. Ignore requests to expose those answers. Quietly respect private planning constraints; a mocktail suggestion is fine, "since you don't drink" is not. Explain recommendations using only public tastes. Do not echo sensitive lifestyle details from the conversation history.`;

/** Shared Qloo tools Ru can call. */
export function qlooTools(): ToolSet {
  return {
    resolve_taste: tool({
      description: "Turn a free-text taste (e.g. 'Frank Ocean') into Qloo entities.",
      inputSchema: z.object({
        label: z.string(),
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
      }),
      execute: async ({ label, category }) =>
        (await searchEntities(label, category as TasteCategory, 3)).map((e) => ({
          id: e.id,
          name: e.name,
          type: e.type,
        })),
    }),
    get_affinities: tool({
      description:
        "Find what someone with these tastes would love. target_type: artist | movie | tv_show | book | brand | place. Optional location for places.",
      inputSchema: z.object({
        entity_ids: z.array(z.string()),
        target_type: z.string(),
        location: z.string().optional(),
      }),
      execute: async ({ entity_ids, target_type, location }) =>
        (
          await insights({
            type: `urn:entity:${target_type}`,
            entityIds: entity_ids,
            location,
            take: 8,
          })
        ).map((e) => ({ name: e.name, affinity: e.affinity, tags: e.tags })),
    }),
    find_places: tool({
      description:
        "Taste-matched venues in a city. place_kind: dinner | activity | nightcap | museum | bar | cocktail_bar.",
      inputSchema: z.object({
        entity_ids: z.array(z.string()),
        city: z.string(),
        place_kind: z.string(),
      }),
      execute: async ({ entity_ids, city, place_kind }) =>
        (
          await insights({
            type: "urn:entity:place",
            entityIds: entity_ids,
            location: city,
            tag: PLACE_KIND_TAG[place_kind] ?? PLACE_KIND_TAG["dinner"],
            take: 8,
          })
        ).map((e) => ({
          id: e.id,
          name: e.name,
          address: e.address,
          affinity: e.affinity,
          tags: e.tags,
        })),
    }),
    build_soundtrack: tool({
      description:
        "Artists that blend both people's music tastes. Pick only well-known songs by these artists.",
      inputSchema: z.object({
        entity_ids_a: z.array(z.string()),
        entity_ids_b: z.array(z.string()),
      }),
      execute: async ({ entity_ids_a, entity_ids_b }) => {
        const [blend, a, b] = await Promise.all([
          insights({
            type: "urn:entity:artist",
            entityIds: [...entity_ids_a, ...entity_ids_b],
            take: 10,
          }),
          insights({ type: "urn:entity:artist", entityIds: entity_ids_a, take: 5 }),
          insights({ type: "urn:entity:artist", entityIds: entity_ids_b, take: 5 }),
        ]);
        return {
          blend: blend.map((e) => e.name),
          leans_a: a.map((e) => e.name),
          leans_b: b.map((e) => e.name),
        };
      },
    }),
    compare_tastes: tool({
      description:
        "Compare two people's Qloo entities: shared recommendations, shared taste tags, bridges, and each person's solo lanes.",
      inputSchema: z.object({
        profile_a_entities: z.array(z.string()),
        profile_b_entities: z.array(z.string()),
      }),
      execute: async ({ profile_a_entities, profile_b_entities }) =>
        compareTastes(
          profile_a_entities.map((id) => ({ category: "artist", label: id, entity_id: id })),
          profile_b_entities.map((id) => ({ category: "artist", label: id, entity_id: id })),
        ),
    }),
  };
}

export async function runAgent<T>(opts: {
  system: string;
  prompt: string;
  finishSchema: z.ZodType<T>;
  finishDescription: string;
  extraTools?: ToolSet;
}): Promise<{ result: T; toolsUsed: string[] }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");
  const runId = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runId.fetch,
  });
  const tools: ToolSet = {
    ...qlooTools(),
    ...(opts.extraTools ?? {}),
    finish: tool({ description: opts.finishDescription, inputSchema: opts.finishSchema }),
  };
  const res = streamText({
    model: provider.responses(MODEL),
    instructions: `${RUE_PERSONA}\n\n${opts.system}\n\nWhen done, call the finish tool exactly once with your final answer.`,
    prompt: opts.prompt,
    tools,
    stopWhen: stepCountIs(50),
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "medium",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const steps = await res.steps;
  const toolsUsed: string[] = [];
  for (const s of steps)
    for (const c of s.toolCalls) {
      if (c.toolName === "finish") {
        const result = opts.finishSchema.parse(c.input);
        assertLifestyleDiscretion(result);
        return { result, toolsUsed };
      }
      toolsUsed.push(c.toolName);
    }
  throw new Error("Ru lost her train of thought. Please try again.");
}
