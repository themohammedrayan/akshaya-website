import { GREETINGS, ML } from "./messages";

// The bot's conversation logic, kept pure (no I/O) so the whole flow can be
// exercised with plain inputs. route.ts loads the session + services, calls
// handleMessage(), then persists the result and sends the replies.
//
// Flow (Malayalam only, info + callback):
//   greeting            -> welcome + [സേവനങ്ങൾ] [എന്നെ വിളിക്കൂ]
//   സേവനങ്ങൾ            -> list of categories
//   category            -> list of its services (9 per page + "more")
//   service             -> documents / fee / time / centre + [എന്നെ വിളിക്കൂ] [മറ്റൊരു സേവനം]
//   എന്നെ വിളിക്കൂ       -> callback enquiry logged, confirmation
//   anything else       -> message enquiry logged, "we'll call you" + menu
//
// Button/list ids carry everything they need (service id, category, page),
// so an old button tapped hours later still does the right thing.

export type Incoming =
  | { kind: "text"; text: string }
  | { kind: "reply"; id: string }
  | { kind: "media"; mediaType: string; caption?: string };

export type SessionData = {
  /** When the bot last sent the automatic "we'll call you" reply - used to throttle it. */
  lastAutoReplyAt?: string;
};

export type Session = { step: string; data: SessionData; updatedAt: string };

export type BotService = {
  id: string;
  name_ml: string;
  category: string;
  fee: number;
  processing_time: string;
  required_docs: unknown;
};

export type CentreInfo = { address?: string; hours?: string; phone?: string };

export type Reply =
  | { type: "text"; body: string }
  | { type: "buttons"; body: string; buttons: { id: string; title: string }[] }
  | {
      type: "list";
      body: string;
      button: string;
      footer?: string;
      rows: { id: string; title: string; description?: string }[];
    };

export type FollowUp = { kind: "callback" | "message"; serviceId: string | null; message: string | null };

export type BotResult = {
  replies: Reply[];
  session: { step: string; data: SessionData };
  followUp: FollowUp | null;
};

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const AUTO_REPLY_COOLDOWN_MS = 10 * 60 * 1000;
export const SERVICES_PER_PAGE = 9;
const LIST_TITLE_MAX = 24;

const CATEGORY_ORDER = ["e-district", "aadhaar", "other"];

const MAIN_BUTTONS = [
  { id: "menu:services", title: ML.btnServices },
  { id: "menu:callback", title: ML.btnCallMe },
];

export function handleMessage(input: {
  incoming: Incoming;
  session: Session | null;
  services: BotService[];
  centre: CentreInfo;
  now: Date;
}): BotResult {
  const { incoming, services, centre, now } = input;
  const session =
    input.session && now.getTime() - new Date(input.session.updatedAt).getTime() < SESSION_TTL_MS
      ? input.session
      : null;
  const data: SessionData = { ...(session?.data ?? {}) };

  if (incoming.kind === "reply") {
    const result = handleReply(incoming.id, services, centre, data);
    if (result) return result;
    // Unknown/stale id (e.g. a service that was since removed) -> menu.
    return menu(data, session === null);
  }

  if (incoming.kind === "text" && isGreeting(incoming.text)) {
    return menu(data, true);
  }
  if (incoming.kind === "media" && incoming.mediaType === "sticker") {
    return menu(data, session === null);
  }

  // Free text / voice / photo / ... - something for staff to read and call back about.
  const message =
    incoming.kind === "text"
      ? incoming.text.trim()
      : [ML.media[incoming.mediaType] ?? ML.media.other, incoming.caption?.trim()].filter(Boolean).join(" ");
  const followUp: FollowUp = { kind: "message", serviceId: null, message };

  const lastAuto = data.lastAutoReplyAt ? new Date(data.lastAutoReplyAt).getTime() : 0;
  if (session && now.getTime() - lastAuto < AUTO_REPLY_COOLDOWN_MS) {
    // Already told them we'll call - log it silently instead of repeating ourselves.
    return { replies: [], session: { step: session.step, data }, followUp };
  }

  data.lastAutoReplyAt = now.toISOString();
  return {
    replies: [{ type: "buttons", body: `${ML.messageReceived}\n\n${ML.menuBody}`, buttons: MAIN_BUTTONS }],
    session: { step: "menu", data },
    followUp,
  };
}

function handleReply(id: string, services: BotService[], centre: CentreInfo, data: SessionData): BotResult | null {
  if (id === "menu:services") {
    return { replies: [categoryList(services)], session: { step: "categories", data }, followUp: null };
  }

  if (id === "menu:callback") {
    return {
      replies: [{ type: "text", body: withCentre(ML.callbackDone, centre, { phone: true, hours: true }) }],
      session: { step: "menu", data },
      followUp: { kind: "callback", serviceId: null, message: null },
    };
  }

  const cat = /^cat:([a-z-]+):(\d+)$/.exec(id);
  if (cat) {
    const [, category, pageStr] = cat;
    const reply = serviceList(services, category, Number(pageStr));
    if (!reply) return null;
    return { replies: [reply], session: { step: "services", data }, followUp: null };
  }

  const svc = /^svc:(.+)$/.exec(id);
  if (svc) {
    const service = services.find((s) => s.id === svc[1]);
    if (!service) return null;
    return { replies: serviceDetail(service, centre), session: { step: "service", data }, followUp: null };
  }

  const call = /^call:(.+)$/.exec(id);
  if (call) {
    const service = services.find((s) => s.id === call[1]);
    return {
      replies: [
        {
          type: "text",
          body: withCentre(service ? ML.callbackDoneService(service.name_ml) : ML.callbackDone, centre, {
            phone: true,
            hours: true,
          }),
        },
      ],
      session: { step: "menu", data },
      followUp: { kind: "callback", serviceId: service?.id ?? null, message: null },
    };
  }

  return null;
}

function menu(data: SessionData, withWelcome: boolean): BotResult {
  const body = withWelcome ? `${ML.welcomeTitle}\n\n${ML.menuBody}` : ML.menuBody;
  return { replies: [{ type: "buttons", body, buttons: MAIN_BUTTONS }], session: { step: "menu", data }, followUp: null };
}

function categoryList(services: BotService[]): Reply {
  const present = new Set(services.map((s) => s.category));
  const categories = [...CATEGORY_ORDER, ...[...present].filter((c) => !CATEGORY_ORDER.includes(c))].filter((c) =>
    present.has(c),
  );
  return {
    type: "list",
    body: ML.categoriesBody,
    button: ML.listButton,
    footer: ML.listFooter,
    rows: categories.map((c) => ({
      id: `cat:${c}:0`,
      title: ML.categories[c]?.title ?? c,
      description: ML.categories[c]?.description || undefined,
    })),
  };
}

function serviceList(services: BotService[], category: string, page: number): Reply | null {
  const inCategory = services.filter((s) => s.category === category);
  const start = page * SERVICES_PER_PAGE;
  if (start >= inCategory.length) return null;

  // Exactly 10 fit on one list without needing a "more" row.
  const fitsOnOnePage = page === 0 && inCategory.length <= SERVICES_PER_PAGE + 1;
  const pageItems = fitsOnOnePage ? inCategory : inCategory.slice(start, start + SERVICES_PER_PAGE);
  const rows: Extract<Reply, { type: "list" }>["rows"] = pageItems.map((s) => {
    const fee = s.fee > 0 ? `₹${formatFee(s.fee)}` : undefined;
    // Row titles are cut at 24 characters; long Malayalam names go in full on the description line.
    const nameTooLong = Array.from(s.name_ml).length > LIST_TITLE_MAX;
    return {
      id: `svc:${s.id}`,
      title: s.name_ml,
      description: nameTooLong ? [s.name_ml, fee].filter(Boolean).join(" · ") : fee,
    };
  });
  if (!fitsOnOnePage && start + SERVICES_PER_PAGE < inCategory.length) {
    rows.push({ id: `cat:${category}:${page + 1}`, title: ML.moreRow, description: ML.moreRowDescription });
  }

  return {
    type: "list",
    body: ML.servicesBody(ML.categories[category]?.title ?? category),
    button: ML.listButton,
    footer: ML.listFooter,
    rows,
  };
}

function serviceDetail(service: BotService, centre: CentreInfo): Reply[] {
  const docs = requiredDocsMl(service.required_docs);
  const lines = [`*${service.name_ml}*`, ""];
  if (docs.length) {
    lines.push(ML.docsHeading, ...docs.map((d) => `• ${d}`));
  } else {
    lines.push(ML.docsUnknown);
  }
  lines.push("", service.fee > 0 ? ML.fee(formatFee(service.fee)) : ML.feeAtCentre);
  if (service.processing_time) lines.push(ML.time(service.processing_time));
  lines.push("", ML.visitNote);

  const body = withCentre(lines.join("\n"), centre, { address: true, hours: true, phone: true });
  const buttons = [
    { id: `call:${service.id}`, title: ML.btnCallMe },
    { id: "menu:services", title: ML.btnOtherService },
  ];

  // Interactive bodies max out at 1024 chars; fall back to a separate text message.
  if (body.length <= 1024) return [{ type: "buttons", body, buttons }];
  return [
    { type: "text", body },
    { type: "buttons", body: ML.nextBody, buttons },
  ];
}

function withCentre(body: string, centre: CentreInfo, show: { address?: boolean; hours?: boolean; phone?: boolean }) {
  const extra = [
    show.address && centre.address ? ML.centreAddress(centre.address) : null,
    show.hours && centre.hours ? ML.centreHours(centre.hours) : null,
    show.phone && centre.phone ? ML.centrePhone(centre.phone) : null,
  ].filter(Boolean);
  return extra.length ? `${body}\n\n${extra.join("\n")}` : body;
}

export function requiredDocsMl(requiredDocs: unknown): string[] {
  if (!Array.isArray(requiredDocs)) return [];
  return requiredDocs
    .map((d) => (d && typeof d === "object" ? ((d as { ml?: string; en?: string }).ml || (d as { en?: string }).en) : null))
    .filter((d): d is string => typeof d === "string" && d.trim().length > 0);
}

function formatFee(fee: number): string {
  return Number.isInteger(fee) ? String(fee) : fee.toFixed(2);
}

export function isGreeting(text: string): boolean {
  const t = text.trim().toLowerCase().replace(/[!.?,\s]+$/g, "");
  return GREETINGS.includes(t);
}
