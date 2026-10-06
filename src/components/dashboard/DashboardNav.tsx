"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ChartIcon, FileIcon, GlobeIcon, ListIcon, ReceiptIcon, SafeIcon, TagIcon } from "./icons";

const ITEMS = [
  { href: "/dashboard/invoices/new", label: "newBill", Icon: ReceiptIcon, primary: true },
  { href: "/dashboard/invoices", label: "bills", Icon: ListIcon },
  { href: "/dashboard/close", label: "dayClose", Icon: SafeIcon },
  { href: "/dashboard", label: "requests", Icon: GlobeIcon },
  { href: "/dashboard/reports", label: "reports", Icon: ChartIcon, ownerOnly: true },
  { href: "/dashboard/prices", label: "prices", Icon: TagIcon, ownerOnly: true },
  { href: "/dashboard/printed-forms", label: "printedForms", Icon: FileIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/invoices/new") return pathname === href;
  if (href === "/dashboard/invoices") return pathname.startsWith(href) && pathname !== "/dashboard/invoices/new";
  if (href === "/dashboard") {
    // Request queue + request detail pages (/dashboard/<uuid>).
    return pathname === href || /^\/dashboard\/[0-9a-f-]{36}$/.test(pathname);
  }
  return pathname.startsWith(href);
}

export function DashboardNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {ITEMS.filter((item) => !item.ownerOnly || isOwner).map(({ href, label, Icon, primary }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-base font-semibold transition-colors",
              primary
                ? active
                  ? "bg-emerald-700 text-white"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
                : active
                  ? "bg-brand-100 text-brand-800"
                  : "text-zinc-600 hover:bg-zinc-100",
            )}
          >
            <Icon className="h-5 w-5" />
            {t(`billing.nav.${label}`)}
          </Link>
        );
      })}
    </nav>
  );
}
