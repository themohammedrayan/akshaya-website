import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { intakeSteps } from "./intake.ts";
import { handleTrackingCode, statusSteps } from "./status.ts";
import { t } from "../copy.ts";
import { freshState, type ConversationState, type InboundMessage, type StepResult } from "../types.ts";

type StepHandler = (
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
) => Promise<StepResult>;

const registries: Record<string, Record<string, StepHandler>> = {
  intake: intakeSteps,
  status: statusSteps,
};

const RESET_KEYWORDS = /^(menu|hi|hello|start)$/i;
const STATUS_KEYWORD = /^status$/i;
const TRACKING_CODE_PATTERN = /^AKS-\d{4}$/i;

/**
 * Global interrupts (checked before per-step logic, on every text message),
 * then per-step dispatch keyed on `${flow}:${step}`. See §6 of the build
 * spec for the exact rules this implements.
 */
export async function dispatch(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const text = msg.type === "text" ? (msg.text ?? "").trim() : "";

  if (msg.type === "text" && RESET_KEYWORDS.test(text)) {
    return await intakeSteps.welcome(supabase, freshState(state.phone), msg);
  }

  if (msg.type === "text" && TRACKING_CODE_PATTERN.test(text)) {
    const seeded: ConversationState = {
      ...freshState(state.phone),
      language: state.language,
      flow: "status",
    };
    return await handleTrackingCode(supabase, seeded, text.toUpperCase());
  }

  if (msg.type === "text" && STATUS_KEYWORD.test(text)) {
    const lang = state.language ?? "en";
    const next: ConversationState = {
      ...freshState(state.phone),
      language: state.language,
      flow: "status",
      step: "status_prompt_code",
    };
    return { nextState: next, replies: [{ kind: "text", body: t.statusAskCode(lang) }] };
  }

  // Brand new phone number, or a stale/unknown flow -- no prompt to re-send yet, so treat as menu.
  if (!state.flow || !state.step) {
    return await intakeSteps.welcome(supabase, freshState(state.phone), msg);
  }

  const handler = registries[state.flow]?.[state.step];
  if (!handler) {
    return await intakeSteps.welcome(supabase, freshState(state.phone), msg);
  }

  return await handler(supabase, state, msg);
}
