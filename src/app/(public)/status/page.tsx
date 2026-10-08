import { StatusContent } from "@/components/StatusContent";

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // ?code= comes from the home page's quick "Track your application" box.
  const { code } = await searchParams;
  return <StatusContent initialCode={code?.toUpperCase().slice(0, 20)} />;
}
