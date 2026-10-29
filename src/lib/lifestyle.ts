import { z } from "zod";

export const LIFESTYLE_TOPICS = [
  { key: "alcohol", label: "Alcohol", options: ["Never", "Rarely", "Socially", "Regularly", "Sober / in recovery"] },
  { key: "tobacco", label: "Tobacco & vaping", options: ["Never", "Occasionally", "Regularly", "Trying to quit"] },
  { key: "cannabis", label: "420", options: ["Never", "Occasionally", "Regularly", "Not around me, please"] },
] as const;

const answer = z.string().max(40).optional();
export const LIFESTYLE_FIELDS = ["alcohol", "tobacco", "cannabis", "openToPartner"] as const;
export const LifestyleSchema = z
  .object({ alcohol: answer, tobacco: answer, cannabis: answer, openToPartner: z.boolean().optional(), shared: z.array(z.enum(LIFESTYLE_FIELDS)).optional() })
  .optional();
export type LifestyleT = z.infer<typeof LifestyleSchema>;

export function describeLifestyle(l: LifestyleT) {
  if (!l) return "";
  // Only anonymous practical constraints reach planning; never labels, recovery or usage answers.
  const constraints: string[] = [];
  if (["Never", "Sober / in recovery"].includes(l.alcohol ?? "")) constraints.push("offer alcohol-free drinks and activities that do not require drinking");
  if (l.tobacco === "Never" || l.tobacco === "Trying to quit") constraints.push("choose smoke-free settings");
  if (l.cannabis === "Never" || l.cannabis === "Not around me, please") constraints.push("avoid cannabis-focused activities");
  return constraints.length ? `\nPrivate planning constraints (never attribute or explain to either person): ${constraints.join("; ")}. Cite only public tastes in reasons.` : "";
}

export function sharedTasteProfile<T extends { lifestyle?: LifestyleT }>(profile: T): T {
  const { lifestyle, ...publicFields } = profile;
  if (!lifestyle?.shared?.length) return publicFields as T;
  const shared = Object.fromEntries(LIFESTYLE_FIELDS.filter((field) => lifestyle.shared?.includes(field) && lifestyle[field] !== undefined).map((field) => [field, lifestyle[field]]));
  return { ...publicFields, lifestyle: shared } as T;
}

export function conversationProfile<T extends { lifestyle?: LifestyleT }>(profile: T) {
  const { lifestyle: _private, ...publicFields } = profile;
  return publicFields;
}

// Reject accidental lifestyle attribution before generated text reaches either participant.
export function assertLifestyleDiscretion(result: unknown): void {
  const text = JSON.stringify(result);
  if (/\b(?:sober|sobriety|recovery|rehab)\b|(?:don['’]?t|doesn['’]?t|never|rarely|regularly|socially)\s+(?:drink|smoke|vape)\b/i.test(text) || /(?:you|your|they|their|he|she|since|because|prefers?)[^.!?]{0,70}\b(?:smok(?:e|es|ing)|vaping|tobacco|cannabis|420)\b/i.test(text)) {
    throw new Error("Ru couldn't keep that suggestion discreet. Please try again.");
  }
}
