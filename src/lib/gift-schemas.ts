import { z } from "zod";

/** Questions Ru asks about someone who isn't on Rendezvous. */
export const GiftQuestionsSchema = z.object({
  relationship: z.string().trim().min(1).max(60),
  age_range: z.string().max(40),
  interests: z.string().trim().min(1).max(500),
  favorites: z.string().max(500),
  style: z.string().max(60),
  avoid: z.string().max(400),
});
export type GiftQuestions = z.infer<typeof GiftQuestionsSchema>;

export const GiftIdeaSchema = z.object({
  name: z.string(),
  category: z.string(),
  price_range: z.string(),
  why: z.string(),
  where_to_find: z.string(),
});

/** Every gift guide has 4–5 ideas. */
export const GiftGuideSchema = z.object({
  headline: z.string(),
  rue_line: z.string(),
  gifts: z.array(GiftIdeaSchema).min(4).max(5),
});
export type GiftGuide = z.infer<typeof GiftGuideSchema>;

export type SavedGiftGuide = {
  key: string;
  name: string;
  kind: "connection" | "custom";
  occasion: string;
  budget: string;
  questions?: GiftQuestions | undefined;
  guide: GiftGuide;
  at: string;
};

export const GIFT_STYLES = ["Sentimental", "Practical", "An experience", "A little luxe", "Playful"];
export const GIFT_BUDGETS = ["Under $25", "$25–50", "$50–100", "$100–250", "$250+"];
