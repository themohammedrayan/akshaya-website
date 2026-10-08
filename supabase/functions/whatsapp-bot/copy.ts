import type { Lang, RequiredDoc, ServiceRow } from "./types.ts";

/** Mirrors src/lib/i18n/pickLang.ts -- duplicated because this Deno function can't import Next.js app code. */
export function pickLang(lang: Lang, en: string, ml: string): string {
  return lang === "ml" && ml ? ml : en;
}

/**
 * Keep in sync with src/lib/i18n/en.json + ml.json's "statusLabels" block.
 * Duplicated here (not imported) because this Edge Function runs on Deno
 * and cannot import the Next.js app's i18n bundle.
 */
export const STATUS_LABELS: Record<string, { en: string; ml: string }> = {
  submitted: { en: "Submitted", ml: "സമർപ്പിച്ചു" },
  docs_verified: { en: "Documents Verified", ml: "രേഖകൾ പരിശോധിച്ചു" },
  in_progress: { en: "In Progress", ml: "പുരോഗമിക്കുന്നു" },
  needs_customer_action: { en: "Action Needed From You", ml: "നിങ്ങളുടെ ശ്രദ്ധ ആവശ്യമാണ്" },
  completed: { en: "Completed", ml: "പൂർത്തിയായി" },
  delivered: { en: "Delivered", ml: "കൈമാറി" },
  cancelled: { en: "Cancelled", ml: "റദ്ദാക്കി" },
};

export function statusLabel(lang: Lang, status: string): string {
  const entry = STATUS_LABELS[status];
  if (!entry) return status;
  return pickLang(lang, entry.en, entry.ml);
}

export const t = {
  welcomeText:
    "Welcome to Akshaya e-Center! / അക്ഷയ ഇ-സെന്ററിലേക്ക് സ്വാഗതം!\nPlease choose your language / ദയവായി ഭാഷ തിരഞ്ഞെടുക്കുക:",
  welcomeButtons: [
    { id: "lang_en", title: "English" },
    { id: "lang_ml", title: "മലയാളം" },
  ],

  didNotUnderstand(lang: Lang): string {
    return pickLang(lang, "Sorry, I didn't understand that.", "ക്ഷമിക്കണം, മനസ്സിലായില്ല.");
  },

  menuBody(lang: Lang): string {
    return pickLang(lang, "Please pick a service:", "ദയവായി ഒരു സേവനം തിരഞ്ഞെടുക്കുക:");
  },
  menuButtonLabel(lang: Lang): string {
    return pickLang(lang, "View services", "സേവനങ്ങൾ കാണുക");
  },
  categoryTitle(lang: Lang, category: string): string {
    const names: Record<string, { en: string; ml: string }> = {
      "e-district": { en: "e-District Services", ml: "ഇ-ഡിസ്ട്രിക്റ്റ് സേവനങ്ങൾ" },
      aadhaar: { en: "Aadhaar Services", ml: "ആധാർ സേവനങ്ങൾ" },
      other: { en: "Other Services", ml: "മറ്റ് സേവനങ്ങൾ" },
    };
    const entry = names[category] ?? { en: category, ml: category };
    return pickLang(lang, entry.en, entry.ml);
  },

  serviceDetailBody(lang: Lang, service: ServiceRow): string {
    const name = pickLang(lang, service.name_en, service.name_ml);
    const feeLine = pickLang(lang, `Fee: ₹${service.fee}`, `ഫീസ്: ₹${service.fee}`);
    const timeLine = pickLang(
      lang,
      `Processing time: ${service.processing_time}`,
      `പ്രോസസ്സിംഗ് സമയം: ${service.processing_time}`
    );
    const docs = service.required_docs ?? [];
    const docsHeader = pickLang(lang, "Documents required:", "ആവശ്യമായ രേഖകൾ:");
    const docsList = docs.length
      ? docs.map((d) => `- ${pickLang(lang, d.en, d.ml)}`).join("\n")
      : pickLang(lang, "None -- this is an enquiry/appointment.", "ഒന്നും വേണ്ട -- ഇത് ഒരു അന്വേഷണം/അപ്പോയിന്റ്മെന്റ് ആണ്.");
    return `*${name}*\n${feeLine}\n${timeLine}\n\n${docsHeader}\n${docsList}`;
  },
  serviceDetailButtons(lang: Lang): { id: string; title: string }[] {
    return [
      { id: "proceed", title: pickLang(lang, "Proceed", "തുടരുക") },
      { id: "back", title: pickLang(lang, "Back to menu", "മെനുവിലേക്ക്") },
    ];
  },

  collectNamePrompt(lang: Lang): string {
    return pickLang(lang, "What is the applicant's full name?", "അപേക്ഷകന്റെ പൂർണ്ണ നാമം എന്താണ്?");
  },

  trackingCodeMessage(lang: Lang, trackingCode: string): string {
    return pickLang(
      lang,
      `Your request has been created. Your tracking code is *${trackingCode}*. Please save this to check your status later.`,
      `നിങ്ങളുടെ അഭ്യർത്ഥന സൃഷ്ടിച്ചു. നിങ്ങളുടെ ട്രാക്കിംഗ് കോഡ് *${trackingCode}* ആണ്. നില പിന്നീട് പരിശോധിക്കാൻ ഇത് സൂക്ഷിക്കുക.`
    );
  },
  noDocsNeededMessage(lang: Lang): string {
    return pickLang(
      lang,
      "No documents are needed for this request. We'll be in touch.",
      "ഈ അഭ്യർത്ഥനയ്ക്ക് രേഖകൾ ആവശ്യമില്ല. ഞങ്ങൾ ബന്ധപ്പെടും."
    );
  },
  requestDocPrompt(lang: Lang, doc: RequiredDoc): string {
    return pickLang(
      lang,
      `Please send a photo or PDF of: ${doc.en}`,
      `ദയവായി ഒരു ഫോട്ടോ അല്ലെങ്കിൽ PDF അയയ്ക്കുക: ${doc.ml}`
    );
  },
  uploadFailedRetry(lang: Lang): string {
    return pickLang(
      lang,
      "That upload didn't go through. Please try sending that document again.",
      "ആ അപ്‌ലോഡ് വിജയിച്ചില്ല. ദയവായി ആ രേഖ വീണ്ടും അയയ്ക്കുക."
    );
  },
  uploadWindowClosed(lang: Lang, trackingCode: string): string {
    return pickLang(
      lang,
      `Upload time has closed for this request. Your request *${trackingCode}* was received -- please bring the remaining documents in person to the center, or contact us, to complete it.`,
      `ഈ അഭ്യർത്ഥനയ്ക്കുള്ള അപ്‌ലോഡ് സമയം അവസാനിച്ചു. നിങ്ങളുടെ അഭ്യർത്ഥന *${trackingCode}* ലഭിച്ചു -- ബാക്കി രേഖകൾ കേന്ദ്രത്തിൽ നേരിട്ട് കൊണ്ടുവരിക, അല്ലെങ്കിൽ പൂർത്തിയാക്കാൻ ഞങ്ങളെ ബന്ധപ്പെടുക.`
    );
  },
  allDocsReceived(lang: Lang, trackingCode: string): string {
    return pickLang(
      lang,
      `All documents received. Your tracking code is *${trackingCode}*. You can check your status anytime by sending "status".`,
      `എല്ലാ രേഖകളും ലഭിച്ചു. നിങ്ങളുടെ ട്രാക്കിംഗ് കോഡ് *${trackingCode}* ആണ്. "status" അയച്ച് എപ്പോൾ വേണമെങ്കിലും നില പരിശോധിക്കാം.`
    );
  },

  statusAskCode(lang: Lang): string {
    return pickLang(
      lang,
      "Please enter your tracking code (e.g. AKS-1234).",
      "ദയവായി നിങ്ങളുടെ ട്രാക്കിംഗ് കോഡ് നൽകുക (ഉദാ: AKS-1234)."
    );
  },
  statusAskPhone(lang: Lang): string {
    return pickLang(
      lang,
      "We couldn't match that to this WhatsApp number. Please type the phone number used when the request was submitted.",
      "ഈ WhatsApp നമ്പറുമായി അത് പൊരുത്തപ്പെടുത്താൻ കഴിഞ്ഞില്ല. അഭ്യർത്ഥന സമർപ്പിച്ചപ്പോൾ ഉപയോഗിച്ച ഫോൺ നമ്പർ ദയവായി ടൈപ്പ് ചെയ്യുക."
    );
  },
  statusNotFound(lang: Lang): string {
    return pickLang(
      lang,
      "We couldn't find a request matching that tracking code and phone number. Please double-check and try again, or send \"menu\" to start a new request.",
      "ആ ട്രാക്കിംഗ് കോഡും ഫോൺ നമ്പറും പൊരുത്തപ്പെടുന്ന ഒരു അഭ്യർത്ഥന കണ്ടെത്താനായില്ല. ദയവായി വീണ്ടും പരിശോധിക്കുക, അല്ലെങ്കിൽ പുതിയ അഭ്യർത്ഥനയ്ക്കായി \"menu\" അയയ്ക്കുക."
    );
  },
  statusResult(
    lang: Lang,
    params: { trackingCode: string; status: string; serviceName: string }
  ): string {
    const label = statusLabel(lang, params.status);
    return pickLang(
      lang,
      `Request *${params.trackingCode}* (${params.serviceName})\nStatus: *${label}*`,
      `അഭ്യർത്ഥന *${params.trackingCode}* (${params.serviceName})\nനില: *${label}*`
    );
  },
};
