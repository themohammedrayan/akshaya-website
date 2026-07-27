import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { updateStatus, addNote, assignRequest } from "./actions";

const NEXT_STATUSES: Record<string, string[]> = {
  submitted: ["submitted", "docs_verified", "needs_customer_action", "cancelled"],
  docs_verified: ["docs_verified", "in_progress", "needs_customer_action", "cancelled"],
  in_progress: ["in_progress", "completed", "needs_customer_action", "cancelled"],
  needs_customer_action: ["needs_customer_action", "in_progress", "cancelled"],
  completed: ["completed", "delivered", "cancelled"],
  delivered: ["delivered"],
  cancelled: ["cancelled"],
};

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, tracking_code, customer_name, customer_phone, status, assigned_to, created_at, service:services(name_en, name_ml, slug)",
    )
    .eq("id", id)
    .single();

  if (!request) notFound();

  const [{ data: history }, { data: staff }] = await Promise.all([
    supabase
      .from("status_history")
      .select("id, status, note, is_internal, changed_at")
      .eq("request_id", id)
      .order("changed_at", { ascending: false }),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  const options = NEXT_STATUSES[request.status] ?? [request.status];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-lg font-bold text-zinc-900">{request.tracking_code}</p>
              <p className="text-zinc-600">{request.service?.name_en}</p>
            </div>
            <StatusBadge status={request.status} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-400">Name</dt>
              <dd className="text-zinc-900">{request.customer_name}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Phone</dt>
              <dd className="text-zinc-900">
                <a href={`tel:${request.customer_phone}`}>{request.customer_phone}</a>
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Submitted</dt>
              <dd className="text-zinc-900">
                {new Date(request.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Update status</h2>
          <form action={updateStatus} className="mt-3 flex flex-wrap items-center gap-3">
            <input type="hidden" name="requestId" value={request.id} />
            <select
              name="status"
              defaultValue={request.status}
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              {options.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Save status
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Add a note</h2>
          <form action={addNote} className="mt-3 space-y-3">
            <input type="hidden" name="requestId" value={request.id} />
            <input type="hidden" name="currentStatus" value={request.status} />
            <textarea
              name="note"
              rows={3}
              required
              placeholder="e.g. Waiting on a clearer copy of the ration card"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input type="checkbox" name="visibleToCustomer" className="rounded" />
              Visible to customer on the status page
            </label>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Add note
            </button>
          </form>
        </div>

        <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">History</h2>
          <ol className="mt-3 space-y-4 border-l border-zinc-200 pl-4">
            {(history ?? []).map((entry) => (
              <li key={entry.id}>
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.status} />
                  {entry.is_internal && (
                    <span className="text-xs text-zinc-400">(internal only)</span>
                  )}
                  <span className="text-xs text-zinc-400">
                    {new Date(entry.changed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
                {entry.note && <p className="mt-1 text-sm text-zinc-700">{entry.note}</p>}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-semibold text-zinc-900">Assignment</h2>
          <form action={assignRequest} className="mt-3 space-y-3">
            <input type="hidden" name="requestId" value={request.id} />
            <select
              name="assignedTo"
              defaultValue={request.assigned_to ?? ""}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            >
              <option value="">Unassigned</option>
              {(staff ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Save assignment
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
