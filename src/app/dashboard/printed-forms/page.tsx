import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/dashboard/SubmitButton";
import Form from "next/form";

const FORM_LABELS: Record<string, string> = {
  "form1-en": "Form 1",
  "form3-en": "Form 3",
  "form5-en": "Form 5",
};

export default async function PrintedFormsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("uidai_printed_forms")
    .select("id, form_type, applicant_name, aadhaar_number, printed_at")
    .order("printed_at", { ascending: false });

  if (filters.date) {
    query = query.gte("printed_at", `${filters.date}T00:00:00`).lt("printed_at", `${filters.date}T23:59:59`);
  }

  const { data: printedForms } = await query;

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-900">UIDAI Printed Forms</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Record-keeping log of Aadhaar enrolment forms printed via the UIDAI overlay printer.
      </p>

      <Form action="/dashboard/printed-forms" className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <input type="date" name="date" defaultValue={filters.date ?? ""} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
        <SubmitButton className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800">
          Filter
        </SubmitButton>
        {filters.date && (
          <Link href="/dashboard/printed-forms" className="text-sm text-zinc-500 hover:text-brand-700">
            Clear
          </Link>
        )}
      </Form>

      <div className="mt-6 grid gap-3">
        {(printedForms ?? []).length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
            No printed forms match these filters.
          </p>
        )}
        {(printedForms ?? []).map((row) => (
          <div key={row.id} className="flex flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-900">{row.applicant_name ?? "—"}</p>
              <p className="font-mono text-sm text-zinc-600">{row.aadhaar_number ?? "—"}</p>
              <p className="text-xs text-zinc-400">
                {new Date(row.printed_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
              </p>
            </div>
            <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
              {FORM_LABELS[row.form_type] ?? row.form_type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
