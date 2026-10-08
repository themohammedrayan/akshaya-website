import { after, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CENTER } from "@/lib/center";
import { normalizePhone } from "@/lib/phone";
import { handleMessage, type BotService, type FollowUp, type Incoming, type Session } from "@/lib/whatsapp/bot";
import { markRead, sendReply } from "@/lib/whatsapp/client";
import { verifySignature } from "@/lib/whatsapp/signature";

// WhatsApp Cloud API webhook. Meta calls GET once to verify the URL, then
// POSTs every incoming message. We verify the signature, answer 200 straight
// away (Meta retries slow/failed deliveries), and do the work in after().
// See docs/WHATSAPP_BOT.md for setup.

export const maxDuration = 30;

type Admin = ReturnType<typeof createAdminClient>;

type WaMessage = {
  from: string;
  id: string;
  type: string;
  text?: { body: string };
  interactive?: { type: string; button_reply?: { id: string }; list_reply?: { id: string } };
  button?: { payload?: string; text?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string };
};

type WaValue = {
  contacts?: { wa_id: string; profile?: { name?: string } }[];
  messages?: WaMessage[];
};

type WaPayload = { object?: string; entry?: { changes?: { field?: string; value?: WaValue }[] }[] };

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (verifyToken && params.get("hub.mode") === "subscribe" && params.get("hub.verify_token") === verifyToken) {
    return new Response(params.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers.get("x-hub-signature-256"), process.env.WHATSAPP_APP_SECRET ?? "")) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: WaPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const inbound: { message: WaMessage; profileName: string | null }[] = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages" || !change.value?.messages) continue;
      // Delivery/read status callbacks arrive without `messages` and are ignored.
      for (const message of change.value.messages) {
        const contact = change.value.contacts?.find((c) => c.wa_id === message.from);
        inbound.push({ message, profileName: contact?.profile?.name?.trim() || null });
      }
    }
  }

  if (inbound.length) {
    after(async () => {
      const admin = createAdminClient();
      let services: BotService[] | null = null;
      for (const { message, profileName } of inbound) {
        try {
          services ??= await loadServices(admin);
          await processMessage(admin, message, profileName, services);
        } catch (error) {
          console.error("[whatsapp] failed to process message", message.id, error);
        }
      }
    });
  }

  return new Response("OK", { status: 200 });
}

function toIncoming(message: WaMessage): Incoming | null {
  switch (message.type) {
    case "text":
      return message.text?.body ? { kind: "text", text: message.text.body } : null;
    case "interactive": {
      const id = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
      return id ? { kind: "reply", id } : null;
    }
    case "button":
      // Quick-reply buttons on template messages (not used yet, but harmless).
      return message.button?.payload
        ? { kind: "reply", id: message.button.payload }
        : { kind: "text", text: message.button?.text ?? "" };
    case "reaction":
    case "unsupported":
    case "system":
    case "request_welcome":
      return null;
    default:
      return {
        kind: "media",
        mediaType: message.type,
        caption: message.image?.caption ?? message.video?.caption ?? message.document?.caption,
      };
  }
}

async function processMessage(admin: Admin, message: WaMessage, profileName: string | null, services: BotService[]) {
  const incoming = toIncoming(message);
  if (!incoming) return;

  // Meta re-delivers on timeouts; the unique wa_message_id makes us handle each message once.
  const { error: logError } = await admin.from("whatsapp_messages").insert({
    wa_message_id: message.id,
    wa_id: message.from,
    direction: "in",
    type: message.type,
    body: incoming.kind === "text" ? incoming.text : incoming.kind === "reply" ? incoming.id : (incoming.caption ?? null),
  });
  if (logError) {
    if (logError.code === "23505") return;
    throw logError;
  }

  const { data: sessionRow } = await admin
    .from("whatsapp_sessions")
    .select("step, data, updated_at")
    .eq("wa_id", message.from)
    .maybeSingle();
  const session: Session | null = sessionRow
    ? { step: sessionRow.step, data: (sessionRow.data ?? {}) as Session["data"], updatedAt: sessionRow.updated_at }
    : null;

  const now = new Date();
  const result = handleMessage({ incoming, session, services, centre: centreInfo(), now });

  await admin.from("whatsapp_sessions").upsert({
    wa_id: message.from,
    step: result.session.step,
    data: result.session.data,
    updated_at: now.toISOString(),
  });

  if (result.followUp) {
    await saveEnquiry(admin, message.from, profileName, result.followUp, now);
  }

  await markRead(message.id).catch((error) => console.error("[whatsapp] markRead failed", error));

  for (const reply of result.replies) {
    const outId = await sendReply(message.from, reply);
    await admin.from("whatsapp_messages").insert({
      wa_message_id: outId,
      wa_id: message.from,
      direction: "out",
      type: reply.type,
      body: reply.body,
    });
  }
}

async function loadServices(admin: Admin): Promise<BotService[]> {
  const { data, error } = await admin
    .from("services")
    .select("id, name_ml, category, fee, processing_time, required_docs")
    .eq("active", true)
    .eq("show_on_website", true)
    .order("sort_order")
    .order("name_ml");
  if (error) throw error;
  return (data ?? []).map((s) => ({ ...s, fee: Number(s.fee) }));
}

function centreInfo() {
  return {
    address: process.env.NEXT_PUBLIC_CENTER_ADDRESS || CENTER.addressLines.join(", "),
    hours: process.env.NEXT_PUBLIC_CENTER_HOURS || undefined,
    phone: process.env.NEXT_PUBLIC_CENTER_PHONE || CENTER.phone,
  };
}

/**
 * One open enquiry per phone: a new message/callback updates it (and puts it
 * back in "New" so staff notice), otherwise a fresh one is created.
 */
async function saveEnquiry(admin: Admin, waId: string, profileName: string | null, followUp: FollowUp, now: Date) {
  const phone = normalizePhone(waId);
  if (phone.length !== 10) return;

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: open } = await admin
      .from("enquiries")
      .select("id, kind, service_id, last_message, message_count, name")
      .eq("phone", phone)
      .in("status", ["new", "follow_up"])
      .maybeSingle();

    if (open) {
      const { error } = await admin
        .from("enquiries")
        .update({
          kind: followUp.kind === "callback" ? "callback" : open.kind,
          service_id: followUp.serviceId ?? open.service_id,
          last_message: followUp.message ?? open.last_message,
          message_count: open.message_count + 1,
          name: open.name ?? profileName,
          status: "new",
          last_contact_at: now.toISOString(),
        })
        .eq("id", open.id);
      if (error) throw error;
      return;
    }

    const { error } = await admin.from("enquiries").insert({
      phone,
      wa_id: waId,
      name: profileName,
      kind: followUp.kind,
      service_id: followUp.serviceId,
      last_message: followUp.message,
      last_contact_at: now.toISOString(),
    });
    if (!error) return;
    // Another delivery for the same phone created it first - loop and update that one.
    if (error.code !== "23505") throw error;
  }
}
