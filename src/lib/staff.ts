import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Signed-in staff member's profile for pages/actions that need a role check
 * (the dashboard layout only guarantees a profile exists, not which role).
 *
 * Wrapped in `cache()` so the layout and the page share one auth check and
 * profile lookup per request. `getClaims()` verifies the JWT locally when the
 * project uses asymmetric signing keys (no Auth round trip), and falls back
 * to asking the Auth server otherwise.
 */
export const getStaffProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return { supabase, userId: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", userId)
    .single();

  return { supabase, userId, profile };
});
