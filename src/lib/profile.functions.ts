import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TasteProfileSchema } from "./chat-schemas";

export const readSavedProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("taste_profile")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw new Error("Could not load saved tastes.");
    return data?.taste_profile ? TasteProfileSchema.parse(data.taste_profile) : null;
  });
export const saveAccountProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TasteProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, taste_profile: data, updated_at: new Date().toISOString() });
    if (error) throw new Error("Could not save your tastes to your account.");
    return { saved: true };
  });
