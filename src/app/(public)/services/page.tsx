import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ServicesListContent } from "@/components/ServicesListContent";

export const metadata: Metadata = {
  title: "Services",
  description: "Fees, processing time and documents required for every service we offer.",
};

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, slug, name_en, name_ml, category, fee, processing_time")
    .eq("active", true)
    .eq("show_on_website", true)
    .order("sort_order");

  return <ServicesListContent services={services ?? []} />;
}
