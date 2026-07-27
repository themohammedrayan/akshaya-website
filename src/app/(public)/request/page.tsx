import { createClient } from "@/lib/supabase/server";
import { IntakeContent } from "@/components/IntakeContent";

export default async function RequestPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, slug, name_en, name_ml")
    .eq("active", true)
    .order("sort_order");

  return <IntakeContent services={services ?? []} preselectedSlug={service} />;
}
