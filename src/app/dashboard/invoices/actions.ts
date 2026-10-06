"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffProfile } from "@/lib/staff";
import { isValidIndianPhone } from "@/lib/phone";

const money = z.number().finite().min(0).max(10_000_000);

const invoiceSchema = z.object({
  // Optional at the counter - blank bills are saved as a walk-in customer.
  customerName: z
    .string()
    .trim()
    .max(200)
    .transform((v) => v || "Walk-in customer"),
  customerPhone: z
    .string()
    .trim()
    .refine((v) => v === "" || isValidIndianPhone(v), "Enter a valid 10-digit phone number, or leave it blank"),
  requestId: z.string().uuid().nullable(),
  notes: z.string().trim().max(500),
  // Bill-level adjustment of the service charge (never the govt fees).
  extra: money,
  discount: money,
  adjustmentReason: z.string().trim().max(200),
  items: z
    .array(
      z.object({
        serviceId: z.string().uuid().nullable(),
        description: z.string().trim().max(200),
        qty: z.number().int().min(1).max(1000),
        govtFee: money,
        serviceCharge: money,
        overrideReason: z.string().trim().max(200),
      }),
    )
    .min(1, "Add at least one item"),
  payment: z.object({
    mode: z.enum(["cash", "upi", "card", "credit"]),
    amount: money,
    reference: z.string().trim().max(100),
  }),
});

export type InvoiceFormState = { error: string | null };

export async function createInvoice(_prev: InvoiceFormState, formData: FormData): Promise<InvoiceFormState> {
  const { supabase, profile } = await getStaffProfile();
  if (!profile) return { error: "Please sign in again." };

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return { error: "Something went wrong reading the form. Reload and try again." };
  }

  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form and try again." };
  }
  const input = parsed.data;

  const { data: invoiceId, error } = await supabase.rpc("create_invoice", {
    p_invoice: {
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      request_id: input.requestId,
      notes: input.notes,
      extra: input.extra,
      discount: input.discount,
      adjustment_reason: input.adjustmentReason,
      items: input.items.map((item) => ({
        service_id: item.serviceId,
        description: item.description,
        qty: item.qty,
        govt_fee: item.govtFee,
        service_charge: item.serviceCharge,
        override_reason: item.overrideReason,
      })),
      payment:
        input.payment.mode === "credit"
          ? null
          : { mode: input.payment.mode, amount: input.payment.amount, reference: input.payment.reference },
    },
  });

  if (error || !invoiceId) {
    return { error: error?.message ?? "Could not save the invoice." };
  }

  revalidatePath("/dashboard/invoices");
  if (input.requestId) revalidatePath(`/dashboard/${input.requestId}`);
  redirect(`/dashboard/invoices/${invoiceId}/print?auto=1`);
}

function backTo(invoiceId: string, error?: string): never {
  revalidatePath(`/dashboard/invoices/${invoiceId}`);
  revalidatePath("/dashboard/invoices");
  redirect(`/dashboard/invoices/${invoiceId}${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export async function addPayment(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const mode = String(formData.get("mode") ?? "");
  const amount = Number(formData.get("amount"));
  const reference = String(formData.get("reference") ?? "");

  const { supabase, profile } = await getStaffProfile();
  if (!profile) redirect("/login");

  if (!["cash", "upi", "card"].includes(mode)) backTo(invoiceId, "Choose a payment mode");
  if (!Number.isFinite(amount) || amount <= 0) backTo(invoiceId, "Enter an amount");

  const { error } = await supabase.rpc("add_invoice_payment", {
    p_invoice_id: invoiceId,
    p_mode: mode,
    p_amount: amount,
    p_reference: reference,
  });
  backTo(invoiceId, error?.message);
}

export async function cancelInvoice(formData: FormData) {
  const invoiceId = String(formData.get("invoiceId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const { supabase, profile } = await getStaffProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "owner") backTo(invoiceId, "Only the owner can cancel invoices");
  if (!reason) backTo(invoiceId, "Give a reason for cancelling");

  const { error } = await supabase.rpc("cancel_invoice", { p_invoice_id: invoiceId, p_reason: reason });
  backTo(invoiceId, error?.message);
}
