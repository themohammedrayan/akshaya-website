import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { pickLang, t } from "./copy.ts";
import type { Lang, OutboundMessage, ServiceRow } from "./types.ts";

const LIST_ROW_TITLE_LIMIT = 24; // WhatsApp interactive list row/section title hard limit
const LIST_ROW_DESCRIPTION_LIMIT = 72;
const LIST_MAX_ROWS = 10; // WhatsApp hard limit: 10 rows TOTAL across all sections of one list

/** Row id prefix for category picks in the first-level menu, e.g. "cat:aadhaar". */
export const CATEGORY_ID_PREFIX = "cat:";

export async function fetchActiveServices(supabase: SupabaseClient): Promise<ServiceRow[]> {
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, slug, name_en, name_ml, category, fee, processing_time, required_docs, description_en, description_ml"
    )
    .eq("active", true)
    .order("sort_order");

  if (error) {
    console.error("Failed to fetch services", error);
    return [];
  }
  return (data ?? []) as ServiceRow[];
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

/** Short category names that fit the 24-char list title limit in both languages. */
function shortCategoryTitle(lang: Lang, category: string): string {
  const short: Record<string, { en: string; ml: string }> = {
    "e-district": { en: "e-District Services", ml: "ഇ-ഡിസ്ട്രിക്റ്റ്" },
    aadhaar: { en: "Aadhaar Services", ml: "ആധാർ സേവനങ്ങൾ" },
    other: { en: "Other Services", ml: "മറ്റ് സേവനങ്ങൾ" },
  };
  const entry = short[category];
  const title = entry ? pickLang(lang, entry.en, entry.ml) : t.categoryTitle(lang, category);
  return truncate(title, LIST_ROW_TITLE_LIMIT);
}

function categoriesInOrder(services: ServiceRow[]): string[] {
  const seen: string[] = [];
  for (const service of services) {
    if (!seen.includes(service.category)) seen.push(service.category);
  }
  return seen;
}

/** First-level menu: one row per category (services are ordered by sort_order, so categories follow that order). */
export function buildMainMenuMessage(lang: Lang, services: ServiceRow[]): OutboundMessage {
  const categories = categoriesInOrder(services).slice(0, LIST_MAX_ROWS);

  return {
    kind: "list",
    body: pickLang(lang, "Please pick a category:", "ദയവായി ഒരു വിഭാഗം തിരഞ്ഞെടുക്കുക:"),
    buttonLabel: pickLang(lang, "View categories", "വിഭാഗങ്ങൾ കാണുക"),
    sections: [
      {
        title: pickLang(lang, "Categories", "വിഭാഗങ്ങൾ"),
        rows: categories.map((category) => {
          const count = services.filter((s) => s.category === category).length;
          return {
            id: `${CATEGORY_ID_PREFIX}${category}`,
            title: shortCategoryTitle(lang, category),
            description: pickLang(lang, `${count} services`, `${count} സേവനങ്ങൾ`),
          };
        }),
      },
    ],
  };
}

/** Second-level menu: the services inside one category (capped at WhatsApp's 10-row limit). */
export function buildCategoryServicesMessage(
  lang: Lang,
  services: ServiceRow[],
  category: string
): OutboundMessage {
  const inCategory = services.filter((s) => s.category === category);
  if (inCategory.length > LIST_MAX_ROWS) {
    console.error(`Category ${category} has ${inCategory.length} services; only the first ${LIST_MAX_ROWS} are shown`);
  }

  return {
    kind: "list",
    body: t.menuBody(lang),
    buttonLabel: t.menuButtonLabel(lang),
    sections: [
      {
        title: shortCategoryTitle(lang, category),
        rows: inCategory.slice(0, LIST_MAX_ROWS).map((service) => ({
          id: service.slug,
          title: truncate(pickLang(lang, service.name_en, service.name_ml), LIST_ROW_TITLE_LIMIT),
          description: truncate(
            pickLang(lang, `Fee ₹${service.fee}`, `ഫീസ് ₹${service.fee}`),
            LIST_ROW_DESCRIPTION_LIMIT
          ),
        })),
      },
    ],
  };
}

export function findServiceBySlug(services: ServiceRow[], slug: string): ServiceRow | undefined {
  return services.find((s) => s.slug === slug);
}
