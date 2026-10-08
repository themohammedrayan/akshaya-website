"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buttonClasses } from "@/components/ui/button-styles";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [forgot, setForgot] = useState(searchParams.get("forgot") === "1");
  const [resetSent, setResetSent] = useState(false);

  // A password-recovery email link can land here (Site URL). Hand it to the
  // reset page, keeping the tokens in the hash.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery") || hash.includes("error_code=")) {
      router.replace(`/reset-password${hash}`);
    }
  }, [router]);

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setPending(false);

    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setPending(false);

    if (error) {
      setError("Invalid email or password.");
      return;
    }

    router.replace(searchParams.get("redirect") ?? "/dashboard/invoices/new");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-zinc-900">Staff Login</h1>
      <p className="mt-1 text-sm text-zinc-500">Akshaya e-Center dashboard</p>

      {forgot ? (
        resetSent ? (
          <p className="mt-8 text-sm text-zinc-700">
            If that email has a staff account, a reset link is on its way. Open it on this device.
          </p>
        ) : (
          <form onSubmit={handleForgot} className="mt-8 space-y-5">
            <div>
              <label htmlFor="reset-email" className="block text-sm font-medium text-zinc-700">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
              {pending ? "Sending…" : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setForgot(false);
                setError(null);
              }}
              className="w-full text-center text-sm text-brand-700 hover:underline"
            >
              Back to sign in
            </button>
          </form>
        )
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 focus:border-brand-600 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
            {pending ? "Signing in…" : "Sign in"}
          </button>

          <button
            type="button"
            onClick={() => {
              setForgot(true);
              setError(null);
            }}
            className="w-full text-center text-sm text-brand-700 hover:underline"
          >
            Forgot password?
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
