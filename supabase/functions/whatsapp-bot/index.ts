import { config } from "./config.ts";
import { dispatch } from "./flows/dispatcher.ts";
import { sendMessages } from "./meta/client.ts";
import { parseInboundMessage } from "./meta/parse.ts";
import { deleteState, loadState, saveState } from "./state.ts";
import { createServiceRoleClient } from "./supabaseClient.ts";

function handleVerify(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === config.whatsappVerifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

async function handleWebhook(req: Request): Promise<Response> {
  // Always ack fast -- Meta retries slow/failed webhooks, which we don't
  // want to compound with duplicate processing. Any error below is logged,
  // not surfaced to Meta as a failure.
  try {
    const payload = await req.json();
    const inbound = parseInboundMessage(payload);
    if (!inbound || inbound.type === "unsupported" || !inbound.from) {
      return new Response("OK", { status: 200 });
    }

    const supabase = createServiceRoleClient();
    const state = await loadState(supabase, inbound.from);
    const { nextState, replies } = await dispatch(supabase, state, inbound);

    if (nextState) {
      await saveState(supabase, nextState);
    } else {
      await deleteState(supabase, inbound.from);
    }

    if (replies.length > 0) {
      await sendMessages(inbound.from, replies);
    }
  } catch (err) {
    console.error("whatsapp-bot webhook error", err);
  }

  return new Response("OK", { status: 200 });
}

Deno.serve(async (req) => {
  if (req.method === "GET") {
    return handleVerify(req);
  }
  if (req.method === "POST") {
    return await handleWebhook(req);
  }
  return new Response("Method Not Allowed", { status: 405 });
});
