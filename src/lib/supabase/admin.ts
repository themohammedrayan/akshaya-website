import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

/**
 * Service-role client that bypasses RLS. Only for server code with no user
 * session that has already authenticated its caller another way - today just
 * the WhatsApp webhook, which checks Meta's request signature first. Never
 * import this from a client component (the key isn't NEXT_PUBLIC_, so it
 * would be undefined there anyway).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
