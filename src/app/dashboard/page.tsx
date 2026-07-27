import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";

const STATUSES = [
  "submitted",
  "docs_verified",
  "in_progress",
  "needs_customer_action",
  "completed",
  "delivered",
  "cancelled",
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; service?: string; assigned?: string; date?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("requests")
    .select(
      "id, tracking_code, customer_name, customer_phone, status, created_at, service:services(name_en, slug), assigned:profiles!requests_assigned_to_fkey(name)",
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.service) query = query.eq("service_id", filters.service);
  if (filters.assigned === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (filters.assigned) {
    query = query.eq("assigned_to", filters.assigned);
  }
  if (filters.date) {
    query = query.gte("created_at", `${filters.date}T00:00:00`).lt("created_at", `${filters.date}T23:59:59`);
  }

  const [{ data: requests }, { data: services }, { data: staff }] = await Promise.all([
    query,
    supabase.from("services").select("id, name_en").order("sort_order"),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900">Request Queue</h1>

      <form method="get" className="mt-4 flex flex-wrap gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <select name="status" defaultValue={filters.status ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>

        <select name="service" defaultValue={filters.service ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="">All services</option>
          {(services ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name_en}
            </option>
          ))}
        </select>

        <select name="assigned" defaultValue={filters.assigned ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm">
          <option value="">Anyone</option>
          <option value="unassigned">Unassigned</option>
          {(staff ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <input type="date" name="date" defaultValue={filters.date ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />

        <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Filter
        </button>
        {(filters.status || filters.service || filters.assigned || filters.date) && (
          <Link href="/dashboard" className="self-center text-sm text-zinc-500 hover:text-brand-700">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 grid gap-3">
        {(requests ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
            No requests match these filters.
          </p>
        )}
        {(requests ?? []).map((req) => (
          <Link
            key={req.id}
            href={`/dashboard/${req.id}`}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 hover:border-brand-400 hover:bg-brand-50 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-mono text-sm font-semibold text-zinc-900">{req.tracking_code}</p>
              <p className="text-sm text-zinc-600">
                {req.customer_name} · {req.customer_phone}
              </p>
              <p className="text-xs text-zinc-400">
                {req.service?.name_en} · {new Date(req.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {req.assigned && <span className="text-xs text-zinc-500">{req.assigned.name}</span>}
              <StatusBadge status={req.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
