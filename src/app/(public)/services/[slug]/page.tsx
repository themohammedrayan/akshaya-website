import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServiceDetailContent } from "@/components/ServiceDetailContent";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .eq("show_on_website", true)
    .single();

  if (!service) notFound();

  return <ServiceDetailContent service={service} />;
}
