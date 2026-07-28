import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { pickLang, statusLabel, t } from "../copy.ts";
import { normalizePhone } from "../phone.ts";
import type { ConversationState, InboundMessage, Lang, StepResult } from "../types.ts";

type StepHandler = (
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
) => Promise<StepResult>;

const TRACKING_CODE_PATTERN = /^AKS-\d{4}$/i;

interface StatusHistoryEntry {
  status: string;
  note: string | null;
  changed_at: string;
}

interface StatusResult {
  tracking_code: string;
  status: string;
  service_name_en: string;
  service_name_ml: string;
  history: StatusHistoryEntry[];
}

function renderStatusBody(lang: Lang, result: StatusResult): string {
  const serviceName = pickLang(lang, result.service_name_en, result.service_name_ml);
  const lines = [t.statusResult(lang, { trackingCode: result.tracking_code, status: result.status, serviceName })];

  if (result.history?.length) {
    lines.push("");
    lines.push(pickLang(lang, "History:", "ചരിത്രം:"));
    for (const entry of result.history) {
      const label = statusLabel(lang, entry.status);
      const date = new Date(entry.changed_at).toLocaleDateString(lang === "ml" ? "ml-IN" : "en-IN");
      const note = entry.note ? `: ${entry.note}` : "";
      lines.push(`- ${label} (${date})${note}`);
    }
  }

  return lines.join("\n");
}

async function lookupStatus(
  supabase: SupabaseClient,
  state: ConversationState,
  trackingCode: string,
  phone: string
): Promise<StepResult | null> {
  const lang = state.language ?? "en";
  const { data, error } = await supabase.rpc("get_request_status", {
    p_tracking_code: trackingCode,
    p_phone: phone,
  });

  if (error) {
    console.error("get_request_status failed", error);
    return null;
  }
  if (!data) return null;

  const result = data as StatusResult;
  return { nextState: null, replies: [{ kind: "text", body: renderStatusBody(lang, result) }] };
}

/**
 * Shared by the global AKS-XXXX interrupt and the in-flow code prompt:
 * always try the sender's own WhatsApp number first (per spec), and only
 * fall back to asking for the phone number used on the request if that
 * doesn't match (e.g. a website request submitted with a different number).
 */
export async function handleTrackingCode(
  supabase: SupabaseClient,
  state: ConversationState,
  trackingCode: string
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const direct = await lookupStatus(supabase, state, trackingCode, state.phone);
  if (direct) return direct;

  return {
    nextState: {
      ...state,
      flow: "status",
      step: "status_prompt_phone",
      draft: { ...state.draft, tracking_code: trackingCode },
    },
    replies: [{ kind: "text", body: t.statusAskPhone(lang) }],
  };
}

async function statusPromptCode(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const text = msg.type === "text" ? (msg.text ?? "").trim() : "";

  if (msg.type === "text" && TRACKING_CODE_PATTERN.test(text)) {
    return await handleTrackingCode(supabase, state, text.toUpperCase());
  }

  return {
    nextState: { ...state, flow: "status", step: "status_prompt_code" },
    replies: [{ kind: "text", body: t.didNotUnderstand(lang) }, { kind: "text", body: t.statusAskCode(lang) }],
  };
}

async function statusPromptPhone(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const text = msg.type === "text" ? msg.text ?? "" : "";
  const trackingCode = state.draft.tracking_code ?? "";

  if (msg.type === "text" && normalizePhone(text).length === 10) {
    const result = await lookupStatus(supabase, state, trackingCode, text);
    if (result) return result;
    return { nextState: null, replies: [{ kind: "text", body: t.statusNotFound(lang) }] };
  }

  return {
    nextState: { ...state, flow: "status", step: "status_prompt_phone" },
    replies: [{ kind: "text", body: t.didNotUnderstand(lang) }, { kind: "text", body: t.statusAskPhone(lang) }],
  };
}

export const statusSteps: Record<string, StepHandler> = {
  status_prompt_code: statusPromptCode,
  status_prompt_phone: statusPromptPhone,
};
