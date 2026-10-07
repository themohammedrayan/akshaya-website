"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffProfile } from "@/lib/staff";
import { isValidDate } from "@/lib/billing";

export type ActionResult = { error: string | null };

type Balances = { cash: number; bank: number; wallet: number; csc: number };

export type CloseResult = {
  close_date: string;
  actual: Balances;
  expected: Balances;
  difference: Balances;
  upi_pending: number;
  breakdown: {
    cash_received: number;
    upi_card_settled: number;
    govt_fees_bank: number;
    govt_fees_wallet: number;
    govt_fees_csc: number;
    movements: { expense: number; deposit: number; withdrawal: number; topup: number };
  };
  note: string | null;
};

const money = z.coerce.number().finite().min(0).max(100_000_000);

// Which accounts each kind of entry moves money between (mirrors add_money_movement).
const MOVEMENT_SHAPES = {
  expense: { from: ["cash", "bank", "wallet", "csc"], to: [null] },
  deposit: { from: ["cash"], to: ["bank"] },
  withdrawal: { from: ["cash", "bank"], to: [null] },
  topup: { from: ["cash", "bank"], to: ["wallet", "csc"] },
} as const;

const movementSchema = z.object({
  kind: z.enum(["expense", "deposit", "withdrawal", "topup"]),
  from: z.enum(["cash", "bank", "wallet", "csc"]),
  to: z.enum(["cash", "bank", "wallet", "csc"]).nullable().optional(),
  amount: z.coerce.number().finite().positive("Enter an amount").max(100_000_000),
  note: z.string().trim().max(200),
});

function refresh() {
  revalidatePath("/dashboard/close");
  revalidatePath("/dashboard/close/history");
}

export async function addMovement(input: unknown): Promise<ActionResult> {
  const { supabase, profile } = await getStaffProfile();
  if (!profile) return { error: "Please sign in again." };
  const parsed = movementSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the entry" };
  const m = parsed.data;
  const shape = MOVEMENT_SHAPES[m.kind];
  if (!(shape.from as readonly string[]).includes(m.from)) return { error: "Invalid account for this entry" };
  const to = m.to ?? shape.to[0];
  if (!(shape.to as readonly (string | null)[]).includes(to)) return { error: "Invalid account for this entry" };

  const { error } = await supabase.rpc("add_money_movement", {
    p_kind: m.kind,
    p_from: m.from,
    p_to: to,
    p_amount: m.amount,
    p_note: m.note,
  });
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function cancelMovement(id: string, reason: string): Promise<ActionResult> {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return { error: "Only the owner can cancel entries" };
  const { error } = await supabase.rpc("cancel_money_movement", { p_id: id, p_reason: reason });
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

const balancesSchema = z.object({ date: z.string(), cash: money, bank: money, wallet: money, csc: money });

export async function setOpening(input: unknown): Promise<ActionResult> {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return { error: "Only the owner can set opening balances" };
  const parsed = balancesSchema.safeParse(input);
  if (!parsed.success || !isValidDate(parsed.data.date)) return { error: "Enter all four balances" };
  const b = parsed.data;
  const { error } = await supabase.rpc("set_opening_balances", {
    p_date: b.date,
    p_cash: b.cash,
    p_bank: b.bank,
    p_wallet: b.wallet,
    p_csc: b.csc,
  });
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

/** Saves the counted balances first; only then are expected figures returned (blind count). */
export async function closeDay(input: unknown): Promise<ActionResult & { result?: CloseResult }> {
  const { supabase, profile } = await getStaffProfile();
  if (!profile) return { error: "Please sign in again." };
  const parsed = balancesSchema.safeParse(input);
  if (!parsed.success || !isValidDate(parsed.data.date)) return { error: "Enter all four balances" };
  const b = parsed.data;
  const { data, error } = await supabase.rpc("close_day", {
    p_date: b.date,
    p_cash: b.cash,
    p_bank: b.bank,
    p_wallet: b.wallet,
    p_csc: b.csc,
  });
  if (error) return { error: error.message };
  refresh();
  return { error: null, result: data as CloseResult };
}

export async function saveCloseNote(date: string, note: string): Promise<ActionResult> {
  const { supabase, profile } = await getStaffProfile();
  if (!profile) return { error: "Please sign in again." };
  const { error } = await supabase.rpc("set_closing_note", { p_date: date, p_note: note });
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}

export async function reopenDay(date: string): Promise<ActionResult> {
  const { supabase, profile } = await getStaffProfile();
  if (profile?.role !== "owner") return { error: "Only the owner can reopen a day" };
  const { error } = await supabase.rpc("reopen_day", { p_date: date });
  if (error) return { error: error.message };
  refresh();
  return { error: null };
}
