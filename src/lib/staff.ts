import { createClient } from "@/lib/supabase/server";

/**
 * Signed-in staff member's profile for pages/actions that need a role check
 * (the dashboard layout only guarantees a profile exists, not which role).
 */
export async function getStaffProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("id", user.id)
    .single();

  return { supabase, profile };
}
