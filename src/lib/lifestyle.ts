import { z } from "zod";

export const LIFESTYLE_TOPICS = [
  { key: "alcohol", label: "Alcohol", options: ["Never", "Rarely", "Socially", "Regularly", "Sober / in recovery"] },
  { key: "tobacco", label: "Tobacco & vaping", options: ["Never", "Occasionally", "Regularly", "Trying to quit"] },
  { key: "cannabis", label: "420", options: ["Never", "Occasionally", "Regularly", "Not around me, please"] },
] as const;

const answer = z.string().max(40).optional();
export const LifestyleSchema = z
  .object({ alcohol: answer, tobacco: answer, cannabis: answer, openToPartner: z.boolean().optional() })
  .optional();
export type LifestyleT = z.infer<typeof LifestyleSchema>;

export function describeLifestyle(l: LifestyleT) {
  if (!l) return "";
  const parts = LIFESTYLE_TOPICS.filter((t) => l[t.key]).map((t) => `${t.label}: ${l[t.key]}`);
  if (!parts.length) return "";
  return ` | Lifestyle (respect, never pressure): ${parts.join(", ")}${l.openToPartner === false ? ", prefers a partner who doesn't partake" : ""}`;
}
