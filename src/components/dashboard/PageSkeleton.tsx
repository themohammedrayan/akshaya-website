/** Placeholder shown instantly while a dashboard page loads (see loading.tsx files). */
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse">
      <div className="h-7 w-56 rounded-lg bg-zinc-200" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-zinc-200" />
      <div className="mt-5 flex flex-wrap gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-24 rounded-xl bg-zinc-200" />
        ))}
      </div>
      <div className="mt-6 grid gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="h-4 w-40 rounded bg-zinc-200" />
            <div className="mt-2 h-3 w-64 max-w-full rounded bg-zinc-100" />
            <div className="mt-2 h-3 w-32 rounded bg-zinc-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
