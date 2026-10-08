import type { Reply } from "./bot";

// Thin wrappers over the WhatsApp Cloud API (Graph API) send endpoint.
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

/** WhatsApp counts characters, not UTF-16 units - trim by code point. */
export function truncate(text: string, max: number): string {
  const chars = Array.from(text);
  return chars.length <= max ? text : `${chars.slice(0, max - 1).join("")}…`;
}

async function post(payload: Record<string, unknown>): Promise<string | null> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) throw new Error("WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TOKEN not set");

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const json = (await res.json().catch(() => null)) as { messages?: { id: string }[]; error?: unknown } | null;
  if (!res.ok) {
    throw new Error(`WhatsApp send failed (${res.status}): ${JSON.stringify(json?.error ?? json)}`);
  }
  return json?.messages?.[0]?.id ?? null;
}

/** Builds the Cloud API payload for one bot reply, applying WhatsApp's length limits. */
export function toPayload(to: string, reply: Reply): Record<string, unknown> {
  if (reply.type === "text") {
    return { to, type: "text", text: { body: truncate(reply.body, 4096), preview_url: false } };
  }
  if (reply.type === "buttons") {
    return {
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: truncate(reply.body, 1024) },
        action: {
          buttons: reply.buttons.slice(0, 3).map((b) => ({
            type: "reply",
            reply: { id: b.id, title: truncate(b.title, 20) },
          })),
        },
      },
    };
  }
  return {
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: truncate(reply.body, 4096) },
      ...(reply.footer ? { footer: { text: truncate(reply.footer, 60) } } : {}),
      action: {
        button: truncate(reply.button, 20),
        sections: [
          {
            rows: reply.rows.slice(0, 10).map((r) => ({
              id: r.id,
              title: truncate(r.title, 24),
              ...(r.description ? { description: truncate(r.description, 72) } : {}),
            })),
          },
        ],
      },
    },
  };
}

export function sendReply(to: string, reply: Reply): Promise<string | null> {
  return post(toPayload(to, reply));
}

/** Blue ticks on the customer's message, so they know it reached us. */
export async function markRead(messageId: string): Promise<void> {
  await post({ status: "read", message_id: messageId });
}
