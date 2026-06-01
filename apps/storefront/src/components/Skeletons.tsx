/**
 * Streaming fallbacks — what the PPR-style shell shows while personalized rails load.
 * Server components (no client JS); pure CSS shimmer from globals.css.
 */
export function RailSkeleton({ label }: { label?: string }) {
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-3 w-40 skeleton rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[3/4] skeleton rounded" />
              <div className="h-2 w-3/4 skeleton rounded" />
              <div className="h-2 w-1/3 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DropBoardSkeleton() {
  return (
    <section className="px-6 pt-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 h-3 w-48 skeleton rounded" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-14 w-full skeleton rounded" />
          ))}
        </div>
      </div>
    </section>
  );
}
