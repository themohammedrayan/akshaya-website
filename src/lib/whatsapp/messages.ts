// Every Malayalam string the WhatsApp bot sends, in one place so wording can
// be reviewed/changed without touching the flow in bot.ts. The bot is
// Malayalam-only by design (rural customers); keep sentences short.
//
// WhatsApp limits (enforced again in client.ts): button title <= 20 chars,
// list row title <= 24, row description <= 72, list button <= 20,
// footer <= 60, interactive body <= 1024.

export const ML = {
  welcomeTitle: "🙏 അക്ഷയ ഇ-കേന്ദ്രത്തിലേക്ക് സ്വാഗതം",
  menuBody:
    "സേവനങ്ങളും ആവശ്യമായ രേഖകളും അറിയാൻ *സേവനങ്ങൾ* അമർത്തുക.\nഞങ്ങൾ നിങ്ങളെ തിരിച്ചു വിളിക്കാൻ *എന്നെ വിളിക്കൂ* അമർത്തുക.",

  btnServices: "സേവനങ്ങൾ",
  btnCallMe: "എന്നെ വിളിക്കൂ",
  btnOtherService: "മറ്റൊരു സേവനം",

  listButton: "തിരഞ്ഞെടുക്കുക",
  listFooter: "മെനുവിലേക്ക് മടങ്ങാൻ hi എന്ന് അയക്കുക",
  categoriesBody: "ഏത് തരം സേവനമാണ് വേണ്ടത്?",
  servicesBody: (category: string) => `*${category}*\nസേവനം തിരഞ്ഞെടുക്കുക:`,
  moreRow: "കൂടുതൽ സേവനങ്ങൾ…",
  moreRowDescription: "അടുത്ത പേജ്",

  categories: {
    "e-district": { title: "സർട്ടിഫിക്കറ്റുകൾ", description: "ഇ-ഡിസ്ട്രിക്ട് സേവനങ്ങൾ" },
    aadhaar: { title: "ആധാർ സേവനങ്ങൾ", description: "പുതിയ ആധാർ, തിരുത്തലുകൾ" },
    other: { title: "മറ്റ് സേവനങ്ങൾ", description: "" },
  } as Record<string, { title: string; description: string }>,

  docsHeading: "📄 *ആവശ്യമായ രേഖകൾ:*",
  docsUnknown: "📄 ആവശ്യമായ രേഖകൾ അറിയാൻ *എന്നെ വിളിക്കൂ* അമർത്തുക.",
  fee: (amount: string) => `💰 ഫീസ്: ₹${amount}`,
  feeAtCentre: "💰 ഫീസ്: സെന്ററിൽ നിന്ന് അറിയാം",
  time: (t: string) => `⏱️ സമയം: ${t}`,
  visitNote: "രേഖകളുടെ ഒറിജിനലുമായി സെന്ററിൽ നേരിട്ട് വരിക. സംശയങ്ങൾക്ക് *എന്നെ വിളിക്കൂ* അമർത്തുക.",
  nextBody: "ഇനി എന്ത് ചെയ്യണം?",

  callbackDone: "✅ നന്ദി! ഞങ്ങളുടെ സ്റ്റാഫ് ഉടൻ നിങ്ങളെ വിളിക്കും.",
  callbackDoneService: (service: string) => `✅ നന്ദി! *${service}* സംബന്ധിച്ച് ഞങ്ങളുടെ സ്റ്റാഫ് ഉടൻ നിങ്ങളെ വിളിക്കും.`,
  messageReceived: "🙏 നിങ്ങളുടെ സന്ദേശം ലഭിച്ചു. ഞങ്ങളുടെ സ്റ്റാഫ് ഉടൻ നിങ്ങളെ വിളിക്കും.",

  centreAddress: (a: string) => `📍 ${a}`,
  centreHours: (h: string) => `🕘 ${h}`,
  centrePhone: (p: string) => `📞 ${p}`,

  // Stored as enquiries.last_message for non-text messages.
  media: {
    audio: "[ശബ്ദ സന്ദേശം]",
    image: "[ഫോട്ടോ]",
    document: "[ഫയൽ]",
    video: "[വീഡിയോ]",
    location: "[ലൊക്കേഷൻ]",
    contacts: "[കോൺടാക്റ്റ്]",
    other: "[സന്ദേശം]",
  } as Record<string, string>,
} as const;

/** Typed messages that just mean "show me the menu" rather than a question for staff. */
export const GREETINGS = [
  "hi",
  "hii",
  "hai",
  "hello",
  "helo",
  "hey",
  "menu",
  "start",
  "0",
  "ഹായ്",
  "ഹലോ",
  "മെനു",
  "നമസ്കാരം",
  "namaskaram",
];
