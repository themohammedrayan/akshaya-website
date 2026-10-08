import type { InboundMessage } from "../types.ts";

/**
 * Meta webhook POST payload shape (trimmed to what this bot reads):
 * entry[].changes[].value.messages[]
 * https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export function parseInboundMessage(payload: unknown): InboundMessage | null {
  const entry = (payload as { entry?: unknown[] })?.entry?.[0] as
    | { changes?: unknown[] }
    | undefined;
  const change = entry?.changes?.[0] as { value?: unknown } | undefined;
  const value = change?.value as { messages?: unknown[] } | undefined;
  const raw = value?.messages?.[0] as Record<string, unknown> | undefined;

  if (!raw) return null;

  const from = String(raw.from ?? "");
  const id = String(raw.id ?? "");
  const type = String(raw.type ?? "");

  if (type === "text") {
    const text = (raw.text as { body?: string } | undefined)?.body ?? "";
    return { from, id, type: "text", text };
  }

  if (type === "interactive") {
    const interactive = raw.interactive as
      | { button_reply?: { id?: string }; list_reply?: { id?: string } }
      | undefined;
    const interactiveId = interactive?.button_reply?.id ?? interactive?.list_reply?.id ?? "";
    return { from, id, type: "interactive", interactiveId };
  }

  if (type === "document") {
    const mediaId = (raw.document as { id?: string } | undefined)?.id ?? "";
    return { from, id, type: "document", mediaId };
  }

  if (type === "image") {
    const mediaId = (raw.image as { id?: string } | undefined)?.id ?? "";
    return { from, id, type: "image", mediaId };
  }

  return { from, id, type: "unsupported" };
}
