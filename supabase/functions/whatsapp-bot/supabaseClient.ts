import { createClient } from "npm:@supabase/supabase-js@2";
import { config } from "./config.ts";

/**
 * Service-role client: bypasses RLS entirely. Still goes through the same
 * submit_request / record_uploaded_document / get_request_status RPCs as
 * the website for parity (see AGENTS.md's core integration rule) -- it
 * only touches tables directly for conversation_state.
 */
export function createServiceRoleClient() {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
}
