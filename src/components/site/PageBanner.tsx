import Link from "next/link";
import { ChevronRightIcon } from "@/components/site/icons";

/** Title band at the top of inner pages, with breadcrumbs. */
export function PageBanner({
  title,
  subtitle,
  crumbs,
}: {
  title: string;
  subtitle?: string;
  crumbs: { href?: string; label: string }[];
}) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(115deg,var(--color-brand-800)_0%,#123a63_60%,#0b5f6b_100%)] text-white">
      <div className="absolute inset-0 opacity-15 [background-image:radial-gradient(circle,white_1px,transparent_1.5px)] [background-size:22px_22px]" />
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-white/70">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5" />}
                {c.href ? (
                  <Link href={c.href} className="hover:text-white">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-white">
                    {c.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-white/80">{subtitle}</p>}
      </div>
    </section>
  );
}
