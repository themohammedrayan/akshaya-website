import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { t } from "../copy.ts";
import { buildMainMenuMessage, fetchActiveServices, findServiceBySlug } from "../services.ts";
import type { ConversationState, InboundMessage, OutboundMessage, RequiredDoc, StepResult } from "../types.ts";
import { uploadRequestDocument } from "../docs.ts";

type StepHandler = (
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
) => Promise<StepResult>;

function welcomePrompt(): OutboundMessage {
  return { kind: "buttons", body: t.welcomeText, buttons: t.welcomeButtons };
}

async function welcome(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  if (msg.type === "interactive" && (msg.interactiveId === "lang_en" || msg.interactiveId === "lang_ml")) {
    const language = msg.interactiveId === "lang_en" ? "en" : "ml";
    const services = await fetchActiveServices(supabase);
    return {
      nextState: { ...state, flow: "intake", step: "main_menu", language },
      replies: [buildMainMenuMessage(language, services)],
    };
  }

  const wasAlreadyWaiting = state.step === "welcome";
  const replies: OutboundMessage[] = [];
  if (wasAlreadyWaiting) {
    replies.push({ kind: "text", body: t.didNotUnderstand(state.language ?? "en") });
  }
  replies.push(welcomePrompt());
  return { nextState: { ...state, flow: "intake", step: "welcome" }, replies };
}

async function mainMenu(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const services = await fetchActiveServices(supabase);

  if (msg.type === "interactive" && msg.interactiveId) {
    const service = findServiceBySlug(services, msg.interactiveId);
    if (service) {
      const nextState: ConversationState = {
        ...state,
        step: "service_detail",
        current_service: service.id,
        draft: { ...state.draft, service_snapshot: service },
      };
      return {
        nextState,
        replies: [{ kind: "buttons", body: t.serviceDetailBody(lang, service), buttons: t.serviceDetailButtons(lang) }],
      };
    }
  }

  return {
    nextState: { ...state, step: "main_menu" },
    replies: [{ kind: "text", body: t.didNotUnderstand(lang) }, buildMainMenuMessage(lang, services)],
  };
}

async function serviceDetail(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const service = state.draft.service_snapshot;

  if (msg.type === "interactive" && msg.interactiveId === "proceed" && service) {
    return {
      nextState: { ...state, step: "collect_name" },
      replies: [{ kind: "text", body: t.collectNamePrompt(lang) }],
    };
  }

  if (msg.type === "interactive" && msg.interactiveId === "back") {
    const services = await fetchActiveServices(supabase);
    return {
      nextState: {
        ...state,
        step: "main_menu",
        current_service: null,
        draft: { ...state.draft, service_snapshot: undefined },
      },
      replies: [buildMainMenuMessage(lang, services)],
    };
  }

  if (!service) {
    const services = await fetchActiveServices(supabase);
    return {
      nextState: { ...state, step: "main_menu" },
      replies: [buildMainMenuMessage(lang, services)],
    };
  }

  return {
    nextState: { ...state, step: "service_detail" },
    replies: [
      { kind: "text", body: t.didNotUnderstand(lang) },
      { kind: "buttons", body: t.serviceDetailBody(lang, service), buttons: t.serviceDetailButtons(lang) },
    ],
  };
}

async function createRequestAndAdvance(
  supabase: SupabaseClient,
  state: ConversationState
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const service = state.draft.service_snapshot;

  const { data, error } = await supabase.rpc("submit_request", {
    p_service_id: state.current_service,
    p_customer_name: state.draft.customer_name,
    p_customer_phone: state.phone,
  });

  if (error || !data) {
    console.error("submit_request failed", error);
    return {
      nextState: { ...state, step: "collect_name" },
      replies: [{ kind: "text", body: t.uploadFailedRetry(lang) }, { kind: "text", body: t.collectNamePrompt(lang) }],
    };
  }

  const { request_id, tracking_code } = data as { request_id: string; tracking_code: string };
  const trackingMessage: OutboundMessage = { kind: "text", body: t.trackingCodeMessage(lang, tracking_code) };
  const pendingDocs: RequiredDoc[] = service?.required_docs ?? [];

  if (pendingDocs.length === 0) {
    return {
      nextState: null,
      replies: [trackingMessage, { kind: "text", body: t.noDocsNeededMessage(lang) }],
    };
  }

  const nextState: ConversationState = {
    ...state,
    request_id,
    step: "collect_docs",
    draft: { ...state.draft, tracking_code, pending_docs: pendingDocs },
  };
  return {
    nextState,
    replies: [trackingMessage, { kind: "text", body: t.requestDocPrompt(lang, pendingDocs[0]) }],
  };
}

async function collectName(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const name = msg.type === "text" ? (msg.text ?? "").trim() : "";

  if (msg.type === "text" && name.length >= 2) {
    return await createRequestAndAdvance(supabase, {
      ...state,
      draft: { ...state.draft, customer_name: name },
    });
  }

  return {
    nextState: { ...state, step: "collect_name" },
    replies: [{ kind: "text", body: t.didNotUnderstand(lang) }, { kind: "text", body: t.collectNamePrompt(lang) }],
  };
}

async function collectDocs(
  supabase: SupabaseClient,
  state: ConversationState,
  msg: InboundMessage
): Promise<StepResult> {
  const lang = state.language ?? "en";
  const pendingDocs: RequiredDoc[] = state.draft.pending_docs ?? [];
  const trackingCode = state.draft.tracking_code ?? "";
  const currentDoc = pendingDocs[0];

  if (!currentDoc || !state.request_id) {
    return { nextState: null, replies: [{ kind: "text", body: t.allDocsReceived(lang, trackingCode) }] };
  }

  if ((msg.type === "document" || msg.type === "image") && msg.mediaId) {
    const result = await uploadRequestDocument(supabase, state.request_id, currentDoc, msg.mediaId);

    if (result.status === "ok") {
      const remaining = pendingDocs.slice(1);
      if (remaining.length === 0) {
        return { nextState: null, replies: [{ kind: "text", body: t.allDocsReceived(lang, trackingCode) }] };
      }
      return {
        nextState: { ...state, draft: { ...state.draft, pending_docs: remaining } },
        replies: [{ kind: "text", body: t.requestDocPrompt(lang, remaining[0]) }],
      };
    }

    if (result.status === "window_closed") {
      return { nextState: null, replies: [{ kind: "text", body: t.uploadWindowClosed(lang, trackingCode) }] };
    }

    return {
      nextState: { ...state, step: "collect_docs" },
      replies: [{ kind: "text", body: t.uploadFailedRetry(lang) }],
    };
  }

  return {
    nextState: { ...state, step: "collect_docs" },
    replies: [{ kind: "text", body: t.didNotUnderstand(lang) }, { kind: "text", body: t.requestDocPrompt(lang, currentDoc) }],
  };
}

export const intakeSteps: Record<string, StepHandler> = {
  welcome,
  main_menu: mainMenu,
  service_detail: serviceDetail,
  collect_name: collectName,
  collect_docs: collectDocs,
};
