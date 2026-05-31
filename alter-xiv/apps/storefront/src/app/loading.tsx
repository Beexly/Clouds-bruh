import { DropBoardSkeleton, RailSkeleton } from '../components/Skeletons';

/** Route-level streaming fallback — the shell while a page resolves. */
export default function Loading() {
  return (
    <main className="min-h-screen bg-void bg-sacred-grain">
      <section className="px-6 pb-10 pt-24 text-center">
        <div className="mx-auto h-12 w-48 skeleton rounded" />
      </section>
      <DropBoardSkeleton />
      <RailSkeleton />
    </main>
  );
}
