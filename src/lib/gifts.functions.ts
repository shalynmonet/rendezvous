import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { GiftGuideSchema, GiftQuestionsSchema } from "./gift-schemas";
import { conversationProfile } from "./lifestyle";

const Taste = z.object({ category: z.enum(["artist", "film", "tv", "restaurant", "cuisine", "place", "book", "brand"]), label: z.string().min(1).max(120), entity_id: z.string().optional() });

const GiftInput = z
  .object({
    name: z.string().trim().min(1).max(60),
    occasion: z.string().max(120),
    budget: z.string().max(40),
    tastes: z.array(Taste).max(40),
    questions: GiftQuestionsSchema.optional(),
  })
  .refine((d) => d.tastes.length > 0 || d.questions, { message: "Tell Ru a little about them first." });

export const giftGuide = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => GiftInput.parse(d))
  .handler(async ({ data }) => {
    const { runAgent } = await import("./agent.server");
    const { resolveItems } = await import("./qloo.server");
    // Gifts use public tastes only; private lifestyle answers never reach the prompt.
    const tastes = data.tastes.length ? await resolveItems(data.tastes) : [];
    const recipient = conversationProfile({ name: data.name, tastes });
    const q = data.questions;
    const about = [
      recipient.tastes.length ? `Saved tastes: ${recipient.tastes.map((t) => `${t.label} (${t.category}${t.entity_id ? `, qloo:${t.entity_id}` : ""})`).join("; ")}` : "",
      q ? `Relationship to giver: ${q.relationship}. Age range: ${q.age_range || "unknown"}. Interests: ${q.interests}. Favorites: ${q.favorites || "none given"}. Preferred gift style: ${q.style || "any"}. Avoid / already has: ${q.avoid || "nothing noted"}.` : "",
    ].filter(Boolean).join("\n");
    const { result, toolsUsed } = await runAgent({
      system: `Write a gift guide for ${recipient.name}. Occasion: ${data.occasion || "just because"}. Budget: ${data.budget || "flexible"}.
Give 4 or 5 distinct, specific, real, purchasable gift ideas (or bookable experiences) within budget — varied categories, no gift cards, nothing generic. Use resolve_taste and get_affinities (e.g. book, brand, artist, movie) to find taste-matched picks. Each "why" cites their specific tastes or answers. "where_to_find" names a kind of shop or well-known retailer. Respect anything they want to avoid.`,
      prompt: about,
      finishSchema: GiftGuideSchema,
      finishDescription: "Submit the 4–5 idea gift guide.",
    });
    return { guide: result, toolsUsed };
  });
