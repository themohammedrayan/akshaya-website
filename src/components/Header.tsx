import Link from "next/link";
import { LanguageToggle } from "@/components/LanguageToggle";
import { HeaderNavLinks } from "@/components/HeaderNavLinks";

export function Header() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-bold text-emerald-800">
            Akshaya e-Center
          </Link>
          <div className="sm:hidden">
            <LanguageToggle />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <HeaderNavLinks />
          <div className="hidden sm:block">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
