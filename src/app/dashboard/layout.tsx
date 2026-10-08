import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LanguageToggle } from "@/components/LanguageToggle";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { LogoutIcon } from "@/components/dashboard/icons";
import { getServerTranslation } from "@/lib/i18n/server";
import { getStaffProfile } from "@/lib/staff";
import { todayIST } from "@/lib/billing";
import { signOut } from "./actions";
import { SubmitButton } from "@/components/dashboard/SubmitButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Profile (shared with the page via cache()), translations and the follow-up
  // badge count are independent, so fetch them together.
  const [{ userId, profile }, { t }, { count: followUpCount }] = await Promise.all([
    getStaffProfile(),
    getServerTranslation(),
    createClient().then((supabase) =>
      supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .or(`status.eq.new,and(status.eq.follow_up,follow_up_on.lte.${todayIST()})`),
    ),
  ]);

  if (!userId) {
    redirect("/login?redirect=/dashboard/invoices/new");
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Account not set up</h1>
        <p className="mt-2 text-zinc-600">
          Your login works, but no staff profile is linked to it yet. Ask the owner to add you in
          Supabase Studio.
        </p>
        <form action={signOut} className="mt-6">
          <SubmitButton className="text-sm font-medium text-brand-700 hover:underline">
            Log out
          </SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-100 print:bg-white">
      <header className="border-b border-zinc-200 bg-white print:hidden">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/dashboard/invoices/new" className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/akshaya-logo.png" alt="" width={44} height={36} className="h-9 w-auto" />
              <span className="text-lg font-bold leading-tight text-brand-800">
                Akshaya
                <span className="block text-xs font-medium text-zinc-500">e-Centre MPM 353</span>
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <span className="hidden text-sm text-zinc-500 sm:inline">
                {profile.name} · <span className="capitalize">{profile.role}</span>
              </span>
              <form action={signOut}>
                <SubmitButton
                  title={t("billing.nav.logout")}
                  className="flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                >
                  <LogoutIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">{t("billing.nav.logout")}</span>
                </SubmitButton>
              </form>
            </div>
          </div>
          <div className="mt-3">
            <DashboardNav isOwner={profile.role === "owner"} followUpCount={followUpCount ?? 0} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
