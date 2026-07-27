"use server";

import { createClient } from "@/lib/supabase/server";
import { intakeSchema } from "@/lib/validation";

export type SubmitRequestState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; trackingCode: string; requestId: string };

export async function submitRequest(
  _prevState: SubmitRequestState,
  formData: FormData,
): Promise<SubmitRequestState> {
  const parsed = intakeSchema.safeParse({
    serviceId: formData.get("serviceId"),
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
  });

  if (!parsed.success) {
    return { status: "error", message: "errorGeneric" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_request", {
    p_service_id: parsed.data.serviceId,
    p_customer_name: parsed.data.customerName,
    p_customer_phone: parsed.data.customerPhone,
  });

  const result = data as { tracking_code?: string; request_id?: string } | null;

  if (error || !result?.tracking_code || !result?.request_id) {
    return { status: "error", message: "errorGeneric" };
  }

  return { status: "success", trackingCode: result.tracking_code, requestId: result.request_id };
}
