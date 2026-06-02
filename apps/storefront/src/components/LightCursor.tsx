'use client';
import { useEffect, useRef } from 'react';

/**
 * THE FIRST-LIGHT CURSOR.
 *
 * On Lumera your pointer is a point of light moving through the Eclipse: a soft, screen-blended
 * corona glow that lifts whatever it passes — text, imagery, the dark itself — trailed by a precise
 * focus ring that widens and brightens over anything interactive. Augments the native cursor (never
 * replaces it, so usability stays intact). Desktop / fine-pointer only; on touch or
 * `prefers-reduced-motion` it does nothing and the native cursor stands alone.
 *
 * Cheap: two fixed elements, one rAF lerping transforms directly (no React re-render per frame).
 */
export function LightCursor() {
  const glowRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const glow = glowRef.current;
    const ring = ringRef.current;
    if (!fine || reduce || !glow || !ring) return; // touch / reduced-motion → native cursor only

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const gp = { x: target.x, y: target.y }; // glow position (slow trail)
    const rp = { x: target.x, y: target.y }; // ring position (tight follow)
    let gScale = 1;
    let rScale = 1;
    let visible = false;
    let hover = false;
    let down = false;
    let raf = 0;

    function frame() {
      raf = requestAnimationFrame(frame);
      gp.x += (target.x - gp.x) * 0.1;
      gp.y += (target.y - gp.y) * 0.1;
      rp.x += (target.x - rp.x) * 0.33;
      rp.y += (target.y - rp.y) * 0.33;
      const gTarget = hover ? 1.3 : 1;
      const rTarget = (hover ? 1.9 : 1) * (down ? 0.82 : 1);
      gScale += (gTarget - gScale) * 0.18;
      rScale += (rTarget - rScale) * 0.22;
      glow!.style.transform = `translate3d(${gp.x}px, ${gp.y}px, 0) translate(-50%, -50%) scale(${gScale})`;
      ring!.style.transform = `translate3d(${rp.x}px, ${rp.y}px, 0) translate(-50%, -50%) scale(${rScale})`;
    }

    function show() {
      if (visible) return;
      visible = true;
      glow!.style.opacity = '1';
      ring!.style.opacity = '1';
    }
    function onMove(e: PointerEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
      show();
    }
    function onOver(e: PointerEvent) {
      const el = e.target as Element | null;
      hover = !!el?.closest?.('a,button,[role="button"],input,select,textarea,label,summary');
    }
    function onDown() {
      down = true;
    }
    function onUp() {
      down = false;
    }
    function onLeave() {
      visible = false;
      glow!.style.opacity = '0';
      ring!.style.opacity = '0';
    }

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <>
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-[380px] w-[380px] rounded-full opacity-0 transition-opacity duration-500 will-change-transform md:block"
        style={{
          background:
            'radial-gradient(circle, rgba(244,238,221,0.10), rgba(233,216,166,0.05) 35%, transparent 62%)',
          mixBlendMode: 'screen',
        }}
      />
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] hidden h-7 w-7 rounded-full border border-[#E9D8A6]/50 opacity-0 transition-opacity duration-300 will-change-transform md:block"
        style={{ mixBlendMode: 'screen' }}
      />
    </>
  );
}
