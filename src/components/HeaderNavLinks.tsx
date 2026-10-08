"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
  FilePlusIcon,
  GridIcon,
  HomeIcon,
  MenuIcon,
  PhoneIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "@/components/site/icons";

const LINKS = [
  { href: "/", key: "nav.home", Icon: HomeIcon },
  { href: "/services", key: "nav.services", Icon: GridIcon },
  { href: "/status", key: "nav.checkStatus", Icon: SearchIcon },
  { href: "/#contact", key: "nav.contact", Icon: PhoneIcon },
] as const;

export function HeaderNavLinks() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href);

  const close = () => setOpen(false);

  return (
    <nav className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="flex items-center justify-between py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="site-menu"
          className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold text-brand-700 hover:bg-white"
        >
          {open ? <XIcon /> : <MenuIcon />}
          {t("nav.menu")}
        </button>
        <Link
          href="/request"
          className="inline-flex items-center gap-2 rounded-md bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <FilePlusIcon className="h-4 w-4" />
          {t("nav.startRequest")}
        </Link>
      </div>

      <div
        id="site-menu"
        className={clsx(
          "flex-col gap-1 pb-3 lg:flex lg:flex-row lg:items-stretch lg:gap-1 lg:py-3",
          open ? "flex" : "hidden",
        )}
      >
        {LINKS.map(({ href, key, Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={close}
            aria-current={isActive(href) ? "page" : undefined}
            className={clsx(
              "flex items-center gap-2 rounded-md px-4 py-2.5 text-[15px] font-medium transition-colors",
              isActive(href)
                ? "bg-brand-700 text-white"
                : "text-brand-700 hover:bg-white hover:text-brand-800",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {t(key)}
          </Link>
        ))}

        <div className="flex flex-col gap-1 lg:ml-auto lg:flex-row lg:gap-2">
          <Link
            href="/request"
            onClick={close}
            className="hidden items-center gap-2 rounded-md bg-brand-700 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-brand-800 lg:flex"
          >
            <FilePlusIcon className="h-[18px] w-[18px]" />
            {t("nav.startRequest")}
          </Link>
          <Link
            href="/login"
            onClick={close}
            className="flex items-center gap-2 rounded-md bg-accent-500 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-accent-600"
          >
            <UserIcon className="h-[18px] w-[18px]" />
            {t("nav.login")}
          </Link>
        </div>
      </div>
    </nav>
  );
}
