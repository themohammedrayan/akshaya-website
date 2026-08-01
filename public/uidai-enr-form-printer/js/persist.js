(function () {
  "use strict";

  // Same public Supabase project URL/anon key already baked into the main
  // Next.js app's client bundle (NEXT_PUBLIC_SUPABASE_URL /
  // NEXT_PUBLIC_SUPABASE_ANON_KEY, see src/lib/supabase/client.ts) - copied
  // here by value because this folder is a static, no-build-step app with
  // no access to env vars at request time. Not a new secret exposure: the
  // anon key is designed to be public and already ships to every browser.
  var SUPABASE_URL = "https://ishxtpxlpqcuemlrnesp.supabase.co";
  var SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzaHh0cHhscHFjdWVtbHJuZXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxMzEwMjAsImV4cCI6MjEwMDcwNzAyMH0.GQkxLhmrO5KIQCcdb7dzK7_yrEYXpstLv6tLdeRKqfw";

  // Logs a printed record to Supabase for staff record-keeping
  // (uidai_printed_forms table, via the log_printed_form RPC). Best-effort:
  // this must never block or break printing itself, since the tool is used
  // as an offline printer first - a failed/slow network call only warns.
  function logPrintedForm(formId, record) {
    try {
      fetch(SUPABASE_URL + "/rest/v1/rpc/log_printed_form", {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_form_type: formId, p_record: record }),
      }).catch(function (err) {
        console.warn("uidai-enr-form-printer: failed to log printed form", err);
      });
    } catch (err) {
      console.warn("uidai-enr-form-printer: failed to log printed form", err);
    }
  }

  window.Persist = { logPrintedForm: logPrintedForm };
})();
