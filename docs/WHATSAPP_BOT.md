# WhatsApp bot + follow-ups

A Malayalam-only WhatsApp bot for customers who won't use the website. It is an **information
and callback** channel: most services need the customer to come to the centre, so the bot tells
them which documents to bring and lets them ask for a call. Staff work the resulting list at
**Dashboard → Follow-ups** (`/dashboard/followups`).

## What the customer sees

```
hi / any greeting   → welcome + [ സേവനങ്ങൾ ] [ എന്നെ വിളിക്കൂ ]
സേവനങ്ങൾ            → list: സർട്ടിഫിക്കറ്റുകൾ / ആധാർ സേവനങ്ങൾ / മറ്റ് സേവനങ്ങൾ
category            → list of its services (9 per page + "കൂടുതൽ സേവനങ്ങൾ…")
service             → required documents, fee, time, address/hours/phone
                      + [ എന്നെ വിളിക്കൂ ] [ മറ്റൊരു സേവനം ]
എന്നെ വിളിക്കൂ       → "we'll call you"  → follow-up logged (with the service, if one was open)
anything else       → typed question, voice note, photo…: follow-up logged with the message,
                      "we'll call you" + menu. Further messages within 10 minutes are logged
                      silently (no repeated auto-reply).
```

- The service list, documents, fee and processing time come straight from the `services` table
  (rows with `active` and `show_on_website`, ordered by `sort_order`) - change them on the
  Prices page / in Studio and the bot follows. Documents use the `ml` text of `required_docs`.
- Address / hours / phone come from `NEXT_PUBLIC_CENTER_ADDRESS`, `NEXT_PUBLIC_CENTER_HOURS`,
  `NEXT_PUBLIC_CENTER_PHONE` (falling back to `src/lib/center.ts`).
- All bot wording is in `src/lib/whatsapp/messages.ts`. **Have a native speaker review it.**

## Follow-ups (staff)

One shared list, one open enquiry per phone number (a repeat message updates it and puts it
back under **New**). Tabs: New · Today · Overdue · Later · All. Each card has Call / WhatsApp
buttons and outcome buttons:

| Outcome | Result |
|---|---|
| Talked / No answer | stays open, comes back tomorrow (Today tab) |
| Call again on _date_ | stays open, comes back on that date |
| Came in | closed as `visited` |
| Not interested | closed |

Every call is kept in `enquiry_calls` (who, when, outcome, note). The nav badge counts New +
due today + overdue.

## Cost

Every bot message is a reply inside the 24-hour window the customer opened, which Meta does not
charge for. No message templates are used. Running cost ≈ ₹0 (plus the SIM).

## Setup (one time)

1. **Phone number** - get a new SIM. It must not be registered on the normal WhatsApp app
   (or delete that account first).
2. **Meta app** - at <https://developers.facebook.com> → *Create app* → type *Business* → add the
   **WhatsApp** product. Link/create the Meta Business portfolio for the centre.
3. **Add the number** - WhatsApp → *API Setup* → *Add phone number*, verify by SMS. Note the
   **Phone number ID**. Set the display name (e.g. "Akshaya e-Centre Thelakkad").
4. **Permanent token** - Business settings → *System users* → add an admin system user →
   *Add assets* (the app, full control) → *Generate token* with `whatsapp_business_messaging`
   and `whatsapp_business_management`, expiry *Never*.
5. **App secret** - App settings → *Basic* → *App secret*.
6. **Env vars in Vercel** (Project → Settings → Environment Variables, Production), then redeploy:
   - `WHATSAPP_TOKEN` - the system-user token
   - `WHATSAPP_PHONE_NUMBER_ID` - from step 3
   - `WHATSAPP_APP_SECRET` - from step 5
   - `WHATSAPP_VERIFY_TOKEN` - any long random string you make up
   - `SUPABASE_SERVICE_ROLE_KEY` - Supabase → Settings → API → `service_role` (secret!)
7. **Database** - `20261009000029_whatsapp_followups.sql` (already applied to the live project on 8 Oct 2026).
8. **Webhook** - WhatsApp → *Configuration* → Callback URL
   `https://akshayatlkd.rivlo.live/api/whatsapp`, Verify token = `WHATSAPP_VERIFY_TOKEN` →
   *Verify and save*, then subscribe to the **messages** field. (Needs steps 6-7 done and the
   code deployed first, or verification fails.)
9. **Privacy policy + publish** - App settings → *Basic* → Privacy policy URL
   `https://akshayatlkd.rivlo.live/privacy` → save → **Publish** the app. Until it is
   published, Meta only sends dashboard test webhooks, not real customer messages.
10. **Test** - send "hi" to the number from a phone, walk the menu, tap എന്നെ വിളിക്കൂ, and check
    Dashboard → Follow-ups → New.
11. **Business verification** - if the WhatsApp account shows as restricted, upload the business
    certificate in Business Support Home (business.facebook.com/business-support-home) and
    request review. Don't create extra portfolios/accounts to get around it.

Changing the domain later only means updating the Callback URL (step 8) and the Privacy policy
URL (step 9) - nothing in the code is tied to the domain.

### Status (8 Oct 2026)

Steps 1-5, 7 and 9 are done: number +91 97781 39360 (Phone number ID `1420407911147646`) is
registered, the app is published and the privacy page is live. Until the switch below, Meta's
webhook still points at the July bot (Supabase Edge Function `whatsapp-bot`, which lets customers
apply and upload documents over WhatsApp). Switching to this bot:

1. Set the step 6 env vars in Vercel and deploy `main`. `WHATSAPP_TOKEN` is the same permanent
   token the Edge Function uses (Supabase secret `WHATSAPP_ACCESS_TOKEN`).
2. Check `GET /api/whatsapp?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=ok`
   returns `ok`.
3. Step 8: change the Callback URL to `https://<site domain>/api/whatsapp` and verify. Rolling
   back is just pointing it back at
   `https://ishxtpxlpqcuemlrnesp.supabase.co/functions/v1/whatsapp-bot`.
4. Step 10, then once this bot has run for a while, delete the Edge Function and
   `supabase/functions/whatsapp-bot`, and drop `public.conversation_state`.

## How it works (code)

- `src/app/api/whatsapp/route.ts` - webhook. `GET` = Meta's verify handshake. `POST` checks
  `X-Hub-Signature-256` against the raw body (401 if wrong), answers 200 at once and processes in
  `after()`: de-duplicate by message id (`whatsapp_messages`), load the session, run the bot, save
  the session + enquiry, mark read, send replies. Excluded from `src/proxy.ts`.
- `src/lib/whatsapp/bot.ts` - the whole conversation as a pure function (no I/O). Button/list ids
  carry their own context (`svc:<id>`, `call:<id>`, `cat:<category>:<page>`), so old buttons keep
  working.
- `src/lib/whatsapp/client.ts` - Graph API sends, with WhatsApp's length limits applied.
- `src/lib/supabase/admin.ts` - service-role client, used only by the webhook.
- Tables: `enquiries`, `enquiry_calls` (staff via RLS), `whatsapp_sessions`, `whatsapp_messages`
  (no policies - service role only). `services.online_enabled` is reserved for later.

## Later

- **Online applications over WhatsApp**: turn on `services.online_enabled` per service and add a
  bot branch that calls `submit_request` and stores photos in the existing `request-documents`
  bucket; link the enquiry via `enquiries.request_id`. Status check can come back then.
- **"Ready for collection" messages**: needs an approved *utility* template (≈ ₹0.13/message),
  sent from the request status update.
