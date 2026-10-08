"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffProfile } from "@/lib/staff";
import { isValidDate, todayIST } from "@/lib/billing";

const TABS = ["new", "today", "overdue", "upcoming", "all"] as const;

const callSchema = z.object({
  enquiryId: z.string().uuid(),
  outcome: z.enum(["talked", "no_answer", "call_again", "visited", "not_interested"]),
  note: z.string().trim().max(500).optional(),
  followUpOn: z.string().optional(),
});

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Logs one call attempt and moves the enquiry on (closed, or a follow-up date). */
export async function logCall(formData: FormData) {
  const tabValue = formData.get("tab");
  const tab = TABS.find((t) => t === tabValue) ?? "new";
  const back: (error?: string) => never = (error) => {
    revalidatePath("/dashboard", "layout");
    redirect(`/dashboard/followups?tab=${tab}${error ? `&error=${encodeURIComponent(error)}` : ""}`);
  };

  const { supabase, profile } = await getStaffProfile();
  if (!profile) back("Not signed in");

  const parsed = callSchema.safeParse({
    enquiryId: formData.get("enquiryId"),
    outcome: formData.get("outcome"),
    note: formData.get("note") || undefined,
    followUpOn: formData.get("followUpOn") || undefined,
  });
  if (!parsed.success) back("Check the form");
  const { enquiryId, outcome, note, followUpOn } = parsed.data;

  const today = todayIST();
  let update: { status: string; follow_up_on: string | null };
  if (outcome === "visited") {
    update = { status: "visited", follow_up_on: null };
  } else if (outcome === "not_interested") {
    update = { status: "closed", follow_up_on: null };
  } else if (outcome === "call_again") {
    if (!isValidDate(followUpOn) || followUpOn < today) back("Pick a date from today onwards");
    update = { status: "follow_up", follow_up_on: followUpOn! };
  } else {
    // Talked / no answer: keep it open and bring it back tomorrow.
    update = { status: "follow_up", follow_up_on: addDays(today, 1) };
  }

  const { error: callError } = await supabase.from("enquiry_calls").insert({
    enquiry_id: enquiryId,
    outcome,
    note: note || null,
    called_by: profile!.id,
  });
  if (callError) back(callError.message);

  const { error } = await supabase.from("enquiries").update(update).eq("id", enquiryId);
  back(error?.message);
}
