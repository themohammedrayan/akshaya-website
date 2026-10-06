import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Account not set up</h1>
        <p className="mt-2 text-zinc-600">
          Your login works, but no staff profile is linked to it yet. Ask the owner to add you in
          Supabase Studio.
        </p>
        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm font-medium text-brand-700 hover:underline">
            Log out
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 print:bg-white">
      <header className="border-b border-zinc-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="font-bold text-brand-800">
            Akshaya Dashboard
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
            <Link href="/dashboard/invoices" className="text-zinc-600 hover:text-brand-700">
              Invoices
            </Link>
            {profile.role === "owner" && (
              <>
                <Link href="/dashboard/reports" className="text-zinc-600 hover:text-brand-700">
                  Reports
                </Link>
                <Link href="/dashboard/prices" className="text-zinc-600 hover:text-brand-700">
                  Prices
                </Link>
              </>
            )}
            <Link href="/dashboard/printed-forms" className="text-zinc-600 hover:text-brand-700">
              Printed Forms
            </Link>
            <span className="text-zinc-500">
              {profile.name} · <span className="capitalize">{profile.role}</span>
            </span>
            <form action={signOut}>
              <button type="submit" className="font-medium text-zinc-600 hover:text-brand-700">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
