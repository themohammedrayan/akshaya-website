"use client";

import { useFormStatus } from "react-dom";
import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={clsx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
    />
  );
}

/**
 * Submit button that disables itself and shows a spinner while its form is
 * submitting (server action or next/form navigation), so a slow save can't be
 * sent twice. Must be rendered inside the <form>.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingLabel?: React.ReactNode }) {
  const { pending: formPending, data } = useFormStatus();
  // With several submit buttons in one form (name/value pairs), only the one
  // that was clicked shows the spinner; all of them are disabled.
  const mine = !props.name || data?.get(props.name) === props.value;
  const pending = formPending && mine;
  return (
    <button
      type="submit"
      {...props}
      disabled={formPending || disabled}
      aria-busy={pending}
      className={clsx(className, "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60")}
    >
      {pending && <Spinner />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
