import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { freshState, type ConversationState } from "./types.ts";

interface ConversationStateRow {
  phone: string;
  language: string | null;
  flow: string | null;
  current_service: string | null;
  request_id: string | null;
  step: string | null;
  draft: Record<string, unknown> | null;
}

function rowToState(row: ConversationStateRow): ConversationState {
  return {
    phone: row.phone,
    language: (row.language as ConversationState["language"]) ?? null,
    flow: (row.flow as ConversationState["flow"]) ?? null,
    current_service: row.current_service,
    request_id: row.request_id,
    step: row.step,
    draft: row.draft ?? {},
  };
}

export async function loadState(
  supabase: SupabaseClient,
  phone: string
): Promise<ConversationState> {
  const { data, error } = await supabase
    .from("conversation_state")
    .select("phone, language, flow, current_service, request_id, step, draft")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("Failed to load conversation_state", error);
    return freshState(phone);
  }

  return data ? rowToState(data as ConversationStateRow) : freshState(phone);
}

export async function saveState(
  supabase: SupabaseClient,
  state: ConversationState
): Promise<void> {
  const { error } = await supabase.from("conversation_state").upsert({
    phone: state.phone,
    language: state.language,
    flow: state.flow,
    current_service: state.current_service,
    request_id: state.request_id,
    step: state.step,
    draft: state.draft,
  });
  if (error) {
    console.error("Failed to save conversation_state", error);
  }
}

export async function deleteState(supabase: SupabaseClient, phone: string): Promise<void> {
  const { error } = await supabase.from("conversation_state").delete().eq("phone", phone);
  if (error) {
    console.error("Failed to delete conversation_state", error);
  }
}
