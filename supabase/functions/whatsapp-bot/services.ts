import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { pickLang, t } from "./copy.ts";
import type { Lang, ListSection, OutboundMessage, ServiceRow } from "./types.ts";

const LIST_ROW_TITLE_LIMIT = 24; // WhatsApp interactive list row title hard limit
const LIST_ROW_DESCRIPTION_LIMIT = 72;
const LIST_ROWS_PER_SECTION = 10; // WhatsApp interactive list hard limit per section

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

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function buildMainMenuMessage(lang: Lang, services: ServiceRow[]): OutboundMessage {
  const byCategory = new Map<string, ServiceRow[]>();
  for (const service of services) {
    const bucket = byCategory.get(service.category) ?? [];
    bucket.push(service);
    byCategory.set(service.category, bucket);
  }

  const sections: ListSection[] = [];

  for (const [category, categoryServices] of byCategory) {
    const parts = chunk(categoryServices, LIST_ROWS_PER_SECTION);
    parts.forEach((part, idx) => {
      const suffix = parts.length > 1 ? ` (${idx + 1})` : "";
      sections.push({
        title: truncate(`${t.categoryTitle(lang, category)}${suffix}`, LIST_ROW_TITLE_LIMIT),
        rows: part.map((service) => ({
          id: service.slug,
          title: truncate(pickLang(lang, service.name_en, service.name_ml), LIST_ROW_TITLE_LIMIT),
          description: truncate(
            pickLang(lang, `Fee ₹${service.fee}`, `ഫീസ് ₹${service.fee}`),
            LIST_ROW_DESCRIPTION_LIMIT
          ),
        })),
      });
    });
  }

  return {
    kind: "list",
    body: t.menuBody(lang),
    buttonLabel: t.menuButtonLabel(lang),
    sections,
  };
}

export function findServiceBySlug(services: ServiceRow[], slug: string): ServiceRow | undefined {
  return services.find((s) => s.slug === slug);
}
