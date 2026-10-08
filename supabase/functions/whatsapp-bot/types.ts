export type Lang = "en" | "ml";
export type Flow = "intake" | "status";

export interface RequiredDoc {
  en: string;
  ml: string;
}

export interface ServiceRow {
  id: string;
  slug: string;
  name_en: string;
  name_ml: string;
  category: "e-district" | "aadhaar" | "other";
  fee: number;
  processing_time: string;
  required_docs: RequiredDoc[];
  description_en: string;
  description_ml: string;
}

export interface ConversationDraft {
  customer_name?: string;
  tracking_code?: string;
  service_snapshot?: ServiceRow;
  pending_docs?: RequiredDoc[];
  [key: string]: unknown;
}

export interface ConversationState {
  phone: string;
  language: Lang | null;
  flow: Flow | null;
  current_service: string | null;
  request_id: string | null;
  step: string | null;
  draft: ConversationDraft;
}

export function freshState(phone: string): ConversationState {
  return {
    phone,
    language: null,
    flow: null,
    current_service: null,
    request_id: null,
    step: null,
    draft: {},
  };
}

/** Normalized shape for every inbound WhatsApp message type this bot handles. */
export interface InboundMessage {
  from: string; // wa_id, digits only, no leading '+'
  id: string; // WhatsApp message id, for future dedupe use
  type: "text" | "interactive" | "document" | "image" | "unsupported";
  text?: string; // for type 'text'
  interactiveId?: string; // button_reply.id or list_reply.id, for type 'interactive'
  mediaId?: string; // document.id or image.id, for type 'document' | 'image'
}

export interface ListSection {
  title: string;
  rows: { id: string; title: string; description?: string }[];
}

export type OutboundMessage =
  | { kind: "text"; body: string }
  | {
      kind: "buttons";
      body: string;
      buttons: { id: string; title: string }[];
    }
  | {
      kind: "list";
      body: string;
      buttonLabel: string;
      sections: ListSection[];
    };

export interface StepResult {
  nextState: ConversationState | null; // null means: delete the conversation_state row
  replies: OutboundMessage[];
}
