'use client';
import { useEffect, useRef } from 'react';

/**
 * THE ECLIPSE — Lumera's living field.
 *
 * A slow-breathing corona over a parallax starfield, painted as *additive light* on the Eclipse
 * base (#0B0B0D). The brand thesis — light returning to the dark — made ambient, spatial, and
 * ever-present site-wide, so the whole experience feels alive instead of a flat black page.
 *
 * Engineered to be invisible to the battery: pure canvas-2D (no WebGL/asset deps), capped at ~30fps,
 * pauses entirely when the tab is hidden, and collapses to a single still frame under
 * `prefers-reduced-motion`. Pointer + scroll drive a gentle parallax; as you descend the Broadcast
 * the corona "sets" and dims while the violet penumbra rises — dusk deepening as you read.
 */

type Star = {
  x: number; // 0..1 of viewport
  y: number;
  r: number; // px radius
  a: number; // base alpha
  tw: number; // twinkle speed
  ph: number; // twinkle phase
  depth: number; // parallax depth 0..1.2
  warm: boolean; // a few corona-gold stars among the first-light white
};

const STAR_COUNT = 90;

export function Eclipse() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    const stars: Star[] = [];
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 }; // eased pointer parallax (-1..1)
    let sf = 0; // scroll fraction 0..1 (bounded)
    let raf = 0;
    let last = 0;
    const FRAME = 1000 / 30;

    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.1,
        a: 0.25 + Math.random() * 0.6,
        tw: 0.4 + Math.random() * 1.2,
        ph: Math.random() * Math.PI * 2,
        depth: 0.2 + Math.random(),
        warm: Math.random() < 0.18,
      });
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = Math.floor(w * dpr);
      canvas!.height = Math.floor(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, w, h);
      ctx!.globalCompositeOperation = 'lighter';

      ptr.x += (ptr.tx - ptr.x) * 0.05;
      ptr.y += (ptr.ty - ptr.y) * 0.05;
      const time = t / 1000;
      const max = Math.max(w, h);

      // The breathing corona (gold) — drifts slowly, dims as you scroll into the depths.
      const breath = reduce ? 1 : 0.5 + 0.5 * Math.sin(time * 0.18);
      const cx = w * (0.5 + (reduce ? 0 : Math.sin(time * 0.05) * 0.04)) + ptr.x * w * 0.02;
      const cy = h * (0.3 + sf * 0.22) + (reduce ? 0 : Math.sin(time * 0.07) * 8) + ptr.y * 12;
      const cr = max * (0.5 + breath * 0.08);
      const goldA = (0.05 + breath * 0.02) * (1 - sf * 0.45);
      const gold = ctx!.createRadialGradient(cx, cy, 0, cx, cy, cr);
      gold.addColorStop(0, `rgba(233,216,166,${goldA})`);
      gold.addColorStop(0.4, `rgba(233,216,166,${goldA * 0.22})`);
      gold.addColorStop(1, 'rgba(233,216,166,0)');
      ctx!.fillStyle = gold;
      ctx!.fillRect(0, 0, w, h);

      // The violet penumbra (signal) — counter-drifts and rises as the corona sets.
      const vx = w * (0.5 - (reduce ? 0 : Math.sin(time * 0.04) * 0.06)) - ptr.x * w * 0.03;
      const vy = h * (0.62 - sf * 0.18) - (reduce ? 0 : Math.cos(time * 0.06) * 10) + ptr.y * 8;
      const vr = max * 0.55;
      const violetA = 0.03 + sf * 0.02;
      const violet = ctx!.createRadialGradient(vx, vy, 0, vx, vy, vr);
      violet.addColorStop(0, `rgba(110,91,214,${violetA})`);
      violet.addColorStop(0.5, `rgba(110,91,214,${violetA * 0.3})`);
      violet.addColorStop(1, 'rgba(110,91,214,0)');
      ctx!.fillStyle = violet;
      ctx!.fillRect(0, 0, w, h);

      // The starfield — first-light points with a few corona-gold among them; gentle parallax.
      for (const s of stars) {
        const tw = reduce ? 1 : 0.45 + 0.55 * Math.sin(time * s.tw + s.ph);
        const px = s.x * w + ptr.x * 22 * s.depth;
        const py = s.y * h + ptr.y * 22 * s.depth + sf * 26 * (s.depth - 0.6);
        const alpha = s.a * tw;
        ctx!.beginPath();
        ctx!.arc(px, py, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = s.warm
          ? `rgba(233,216,166,${alpha})`
          : `rgba(244,238,221,${alpha})`;
        ctx!.fill();
        if (s.r > 1.1) {
          ctx!.beginPath();
          ctx!.arc(px, py, s.r * 3, 0, Math.PI * 2);
          ctx!.fillStyle = s.warm
            ? `rgba(233,216,166,${alpha * 0.12})`
            : `rgba(244,238,221,${alpha * 0.1})`;
          ctx!.fill();
        }
      }

      ctx!.globalCompositeOperation = 'source-over';
    }

    function loop(t: number) {
      raf = requestAnimationFrame(loop);
      if (t - last < FRAME) return;
      last = t;
      draw(t);
    }

    function start() {
      if (reduce || raf) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    }
    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function onResize() {
      resize();
      if (reduce) draw(0); // keep the still frame crisp on rotate/resize
    }
    function onPointer(e: PointerEvent) {
      ptr.tx = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.ty = (e.clientY / window.innerHeight) * 2 - 1;
    }
    function onScroll() {
      const doc = document.documentElement;
      const range = doc.scrollHeight - window.innerHeight;
      sf = range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
    }
    function onVisibility() {
      if (document.hidden) stop();
      else start();
    }

    resize();
    onScroll();
    if (reduce) {
      draw(0);
    } else {
      start();
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('visibilitychange', onVisibility);
    }
    window.addEventListener('resize', onResize);

    return () => {
      stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10" />;
}
