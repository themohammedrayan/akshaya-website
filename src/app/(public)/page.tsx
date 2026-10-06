import { createClient } from "@/lib/supabase/server";
import { LandingContent } from "@/components/LandingContent";

export default async function Home() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, slug, name_en, name_ml, category, fee, processing_time")
    .eq("active", true)
    .eq("show_on_website", true)
    .order("sort_order")
    .limit(6);

  return <LandingContent services={services ?? []} />;
}
