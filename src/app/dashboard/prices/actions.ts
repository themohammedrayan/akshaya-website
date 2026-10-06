"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffProfile } from "@/lib/staff";

const money = z.coerce.number().finite().min(0).max(10_000_000);

function done(error?: string): never {
  revalidatePath("/dashboard/prices");
  redirect(`/dashboard/prices${error ? `?error=${encodeURIComponent(error)}` : "?saved=1"}`);
}

async function requireOwner() {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") done("Only the owner can change prices");
  return supabase;
}

const pricingSchema = z.object({
  serviceId: z.string().uuid(),
  defaultGovtFee: money,
  defaultServiceCharge: money,
  variableGovtFee: z.boolean(),
  showOnWebsite: z.boolean(),
  active: z.boolean(),
});

export async function updateServicePricing(formData: FormData) {
  const supabase = await requireOwner();
  const parsed = pricingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    defaultGovtFee: formData.get("defaultGovtFee") || 0,
    defaultServiceCharge: formData.get("defaultServiceCharge") || 0,
    variableGovtFee: formData.get("variableGovtFee") === "on",
    showOnWebsite: formData.get("showOnWebsite") === "on",
    active: formData.get("active") === "on",
  });
  if (!parsed.success) done("Enter valid amounts");
  const p = parsed.data;

  const { error } = await supabase
    .from("services")
    .update({
      default_govt_fee: p.variableGovtFee ? 0 : p.defaultGovtFee,
      default_service_charge: p.defaultServiceCharge,
      variable_govt_fee: p.variableGovtFee,
      show_on_website: p.showOnWebsite,
      active: p.active,
      // Keep the public storefront price in step with billing.
      ...(p.variableGovtFee ? {} : { fee: p.defaultGovtFee + p.defaultServiceCharge }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", p.serviceId);

  done(error?.message);
}

const itemSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(100),
  category: z.enum(["other", "e-district", "aadhaar"]),
  variableGovtFee: z.boolean(),
  defaultGovtFee: money,
  defaultServiceCharge: money,
});

export async function addBillingItem(formData: FormData) {
  const supabase = await requireOwner();
  const parsed = itemSchema.safeParse({
    name: formData.get("name"),
    category: formData.get("category"),
    variableGovtFee: formData.get("variableGovtFee") === "on",
    defaultGovtFee: formData.get("defaultGovtFee") || 0,
    defaultServiceCharge: formData.get("defaultServiceCharge") || 0,
  });
  if (!parsed.success) done(parsed.error.issues[0]?.message ?? "Check the form");
  const p = parsed.data;

  const slugBase = p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
  const { error } = await supabase.from("services").insert({
    slug: `${slugBase}-${Math.random().toString(36).slice(2, 6)}`,
    name_en: p.name,
    name_ml: p.name,
    category: p.category,
    processing_time: "Instant",
    variable_govt_fee: p.variableGovtFee,
    default_govt_fee: p.variableGovtFee ? 0 : p.defaultGovtFee,
    default_service_charge: p.defaultServiceCharge,
    fee: p.variableGovtFee ? 0 : p.defaultGovtFee + p.defaultServiceCharge,
    show_on_website: false,
    sort_order: 200,
  });

  done(error?.message);
}

export type SlabFormState = { error: string | null; saved: boolean };

const slabsSchema = z.array(
  z.object({
    up_to: z.number().finite().positive().nullable(),
    charge: z.number().finite().min(0),
  }),
);

export async function saveSlabs(_prev: SlabFormState, formData: FormData): Promise<SlabFormState> {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return { error: "Only the owner can change service charges", saved: false };

  const serviceId = String(formData.get("serviceId") ?? "") || null;
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("slabs") ?? "[]"));
  } catch {
    return { error: "Could not read the slabs", saved: false };
  }
  const parsed = slabsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Every band needs a valid amount and charge", saved: false };

  const limits = parsed.data.map((s) => s.up_to).filter((v): v is number => v !== null);
  if (new Set(limits).size !== limits.length) return { error: "Two bands have the same upper limit", saved: false };

  const { error } = await supabase.rpc("save_charge_slabs", {
    p_service_id: serviceId,
    p_slabs: parsed.data,
  });
  if (error) return { error: error.message, saved: false };

  revalidatePath("/dashboard/prices");
  return { error: null, saved: true };
}

export async function revertToDefaultSlabs(formData: FormData) {
  const supabase = await requireOwner();
  const serviceId = String(formData.get("serviceId") ?? "");
  const { error } = await supabase.rpc("save_charge_slabs", { p_service_id: serviceId, p_slabs: [] });
  done(error?.message);
}
