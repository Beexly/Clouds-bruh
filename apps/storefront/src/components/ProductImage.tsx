import type { CSSProperties } from 'react';

/** Chapter accent hexes — mirror tailwind.config.ts `colors.chapter`. */
const CHAPTER_ACCENT: Record<string, string> = {
  stillness: '#8DA9B8',
  armor: '#C9A96E',
  signal: '#B5546E',
  altar: '#9C8CC4',
  relentless: '#C2502E',
};

/**
 * Product imagery with an on-brand fallback. When a product has no photograph yet
 * (pre-curation, or supplier media still pending), render a chapter-tinted editorial
 * placeholder — the Lumera monogram over a faint accent wash — instead of an empty box,
 * so the Broadcast always looks intentional and luxurious, never broken.
 */
export function ProductImage({
  src,
  alt,
  chapter,
  imgClassName = 'h-full w-full object-cover',
  loading,
}: {
  src?: string | null;
  alt: string;
  chapter?: string | null;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
}) {
  if (src) {
    return <img src={src} alt={alt} className={imgClassName} loading={loading} />;
  }
  const accent = (chapter && CHAPTER_ACCENT[chapter.toLowerCase()]) || '#E9D8A6';
  const style: CSSProperties = {
    backgroundImage: `radial-gradient(115% 85% at 50% 0%, ${accent}26 0%, transparent 58%), linear-gradient(165deg, #161618 0%, #0B0B0D 72%)`,
  };
  return (
    <div
      role="img"
      aria-label={alt}
      className="flex h-full w-full select-none flex-col items-center justify-center gap-2.5"
      style={style}
    >
      <span aria-hidden className="font-serif text-4xl leading-none text-firstlight/25">L</span>
      {chapter ? (
        <span aria-hidden className="text-micro uppercase tracking-sacred text-firstlight/25">
          {chapter}
        </span>
      ) : null}
    </div>
  );
}
