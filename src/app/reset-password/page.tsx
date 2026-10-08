"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/ui/button-styles";

type Stage = "checking" | "ready" | "invalid" | "done";

const inputClasses =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("checking");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Turn the recovery link into a session. Supabase sends either
  // #access_token=...&refresh_token=... (links sent from the dashboard) or
  // ?code=... (links requested from the "Forgot password?" form, PKCE flow).
  useEffect(() => {
    const supabase = createClient();

    async function establishSession() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);

      const errorDescription = hash.get("error_description") ?? query.get("error_description");
      if (errorDescription) {
        setLinkError(errorDescription.replace(/\+/g, " "));
        setStage("invalid");
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      const code = query.get("code");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setLinkError(error.message);
          setStage("invalid");
          return;
        }
      } else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setLinkError(error.message);
          setStage("invalid");
          return;
        }
      }

      // Strip tokens from the address bar.
      window.history.replaceState(null, "", window.location.pathname);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      setStage(user ? "ready" : "invalid");
    }

    establishSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }

    setStage("done");
    setTimeout(() => {
      router.replace("/dashboard/invoices/new");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-zinc-900">Set a new password</h1>
      <p className="mt-1 text-sm text-zinc-500">Akshaya e-Center dashboard</p>

      {stage === "checking" && <p className="mt-8 text-sm text-zinc-600">Checking your reset link…</p>}

      {stage === "invalid" && (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-red-600">
            This reset link is invalid or has expired{linkError ? ` (${linkError})` : ""}.
          </p>
          <Link href="/login?forgot=1" className={buttonClasses("secondary", "w-full")}>
            Request a new link
          </Link>
        </div>
      )}

      {stage === "done" && (
        <p className="mt-8 text-sm text-green-700">Password updated. Taking you to the dashboard…</p>
      )}

      {stage === "ready" && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              New password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-zinc-700">
              Confirm new password
            </label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClasses}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
            {pending ? "Saving…" : "Save new password"}
          </button>
        </form>
      )}
    </div>
  );
}
