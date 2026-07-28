import { config } from "../config.ts";
import type { OutboundMessage } from "../types.ts";

function graphUrl(path: string): string {
  return `https://graph.facebook.com/${config.whatsappApiVersion}/${path}`;
}

async function postToMessagesApi(body: Record<string, unknown>): Promise<void> {
  const res = await fetch(graphUrl(`${config.whatsappPhoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.whatsappAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error("WhatsApp send failed", res.status, errBody);
  }
}

export async function sendMessage(to: string, message: OutboundMessage): Promise<void> {
  if (message.kind === "text") {
    await postToMessagesApi({
      to,
      type: "text",
      text: { body: message.body },
    });
    return;
  }

  if (message.kind === "buttons") {
    await postToMessagesApi({
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: message.body },
        action: {
          buttons: message.buttons.map((b) => ({
            type: "reply",
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
    return;
  }

  if (message.kind === "list") {
    await postToMessagesApi({
      to,
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: message.body },
        action: {
          button: message.buttonLabel,
          sections: message.sections,
        },
      },
    });
    return;
  }
}

export async function sendMessages(to: string, messages: OutboundMessage[]): Promise<void> {
  for (const message of messages) {
    await sendMessage(to, message);
  }
}

export interface DownloadedMedia {
  bytes: Uint8Array;
  mimeType: string;
}

/**
 * Media ids resolve to a short-lived temp URL that itself requires the
 * Bearer token to fetch -- it is not a public CDN link.
 */
export async function downloadMedia(mediaId: string): Promise<DownloadedMedia> {
  const metaRes = await fetch(graphUrl(mediaId), {
    headers: { Authorization: `Bearer ${config.whatsappAccessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(`Failed to look up media ${mediaId}: ${metaRes.status}`);
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) {
    throw new Error(`Media ${mediaId} had no url`);
  }

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${config.whatsappAccessToken}` },
  });
  if (!fileRes.ok) {
    throw new Error(`Failed to download media ${mediaId}: ${fileRes.status}`);
  }

  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  return { bytes, mimeType: meta.mime_type ?? "application/octet-stream" };
}
