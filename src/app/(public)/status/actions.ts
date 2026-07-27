"use server";

import { createClient } from "@/lib/supabase/server";
import { statusLookupSchema } from "@/lib/validation";

export type StatusHistoryEntry = {
  status: string;
  note: string | null;
  changed_at: string;
};

export type RequestStatus = {
  tracking_code: string;
  status: string;
  service_name_en: string;
  service_name_ml: string;
  created_at: string;
  updated_at: string;
  history: StatusHistoryEntry[];
};

export type LookupStatusState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "not_found" }
  | { status: "found"; request: RequestStatus };

export async function lookupStatus(
  _prevState: LookupStatusState,
  formData: FormData,
): Promise<LookupStatusState> {
  const parsed = statusLookupSchema.safeParse({
    trackingCode: formData.get("trackingCode"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { status: "error", message: "errorGeneric" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_request_status", {
    p_tracking_code: parsed.data.trackingCode,
    p_phone: parsed.data.phone,
  });

  if (error) {
    return { status: "error", message: "errorGeneric" };
  }

  if (!data) {
    return { status: "not_found" };
  }

  return { status: "found", request: data as unknown as RequestStatus };
}
