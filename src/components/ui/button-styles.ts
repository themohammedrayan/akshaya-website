import clsx from "clsx";

type Variant = "primary" | "secondary" | "whatsapp";

export function buttonClasses(variant: Variant = "primary", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    variant === "primary" && "bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700",
    variant === "secondary" && "border border-zinc-300 text-zinc-800 hover:bg-zinc-50 focus-visible:outline-zinc-400",
    variant === "whatsapp" && "bg-[#25D366] text-white hover:bg-[#1ebe57] focus-visible:outline-[#25D366]",
    className,
  );
}
