import Image from "next/image";
import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { HeaderNavLinks } from "@/components/HeaderNavLinks";
import { PARTNERS } from "@/lib/site";
import { CENTER } from "@/lib/center";
import akshayaMark from "../../public/akshaya-mark.png";

export function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Identity band: logo + wordmark left, partner logos right */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image src={akshayaMark} alt="Akshaya" className="h-11 w-auto sm:h-14" preload />
          <span className="leading-tight">
            <span className="block text-2xl font-extrabold text-brand-700 sm:text-3xl" lang="ml">
              അക്ഷയ
            </span>
            <span className="block whitespace-nowrap text-[11px] font-medium text-zinc-600 sm:text-xs" lang="ml">
              അവസരങ്ങളുടെ ജാലകം
            </span>
            <span className="block whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-accent-600 sm:text-xs">
              e-Centre {CENTER.name.replace("AKSHAYA E CENTRE ", "")} · Thelakkad
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <ul className="hidden items-center gap-2 lg:flex">
            {PARTNERS.map((p) => (
              <li key={p.name}>
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.name}
                  className="flex h-14 items-center"
                >
                  {p.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.src} alt={p.name} className="h-14 w-auto" />
                  ) : (
                    <span className="rounded-md border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-xs font-semibold text-brand-700">
                      {p.short}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
          <LanguageToggle />
        </div>
      </div>

      {/* Navigation band */}
      <div className="border-t border-zinc-200 bg-zinc-100">
        <HeaderNavLinks />
      </div>
    </header>
  );
}
