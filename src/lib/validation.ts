import { z } from "zod";
import { isValidIndianPhone } from "@/lib/phone";

export const intakeSchema = z.object({
  serviceId: z.string().uuid("Choose a service"),
  customerName: z.string().trim().min(2, "Enter your full name").max(200),
  customerPhone: z
    .string()
    .trim()
    .refine(isValidIndianPhone, "Enter a valid 10-digit phone number"),
});

export type IntakeInput = z.infer<typeof intakeSchema>;

export const statusLookupSchema = z.object({
  trackingCode: z.string().trim().min(1, "Enter your tracking code"),
  phone: z
    .string()
    .trim()
    .refine(isValidIndianPhone, "Enter a valid 10-digit phone number"),
});

export type StatusLookupInput = z.infer<typeof statusLookupSchema>;
