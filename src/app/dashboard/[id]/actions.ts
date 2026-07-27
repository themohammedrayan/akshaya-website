"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateStatus(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  await supabase.from("requests").update({ status }).eq("id", requestId);

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
}

export async function addNote(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const currentStatus = formData.get("currentStatus") as string;
  const note = (formData.get("note") as string)?.trim();
  const visibleToCustomer = formData.get("visibleToCustomer") === "on";

  if (!note) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await supabase.from("status_history").insert({
    request_id: requestId,
    status: currentStatus,
    note,
    is_internal: !visibleToCustomer,
    changed_by: user?.id ?? null,
  });

  revalidatePath(`/dashboard/${requestId}`);
}

export async function assignRequest(formData: FormData) {
  const requestId = formData.get("requestId") as string;
  const assignedTo = formData.get("assignedTo") as string;

  const supabase = await createClient();
  await supabase
    .from("requests")
    .update({ assigned_to: assignedTo || null })
    .eq("id", requestId);

  revalidatePath(`/dashboard/${requestId}`);
  revalidatePath("/dashboard");
}
