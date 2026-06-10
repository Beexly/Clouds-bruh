/**
 * Micro-drop scale-or-kill grading (Growth Playbook #5 — the Shein LATR loop, premium-sized).
 * Pure so Forecaster, cockpit, and jobs all share one rule: at the grading window, drops selling
 * through scale (restock proposal), dead ones are killed (delist proposal), the middle holds.
 * Proposals only — execution always rides the founder Approval Loop.
 */
export interface DropGradeInput {
  units_total: number;
  units_remaining: number;
  /** Days since the drop went live. */
  days_live: number;
}

export interface DropGrade {
  grade: 'scale' | 'hold' | 'kill' | 'early';
  sell_through: number; // 0..1
  /** Present on 'scale': proposed restock quantity (2.5× units sold, min 10). */
  restock_qty?: number;
  reason: string;
}

export const DROP_GRADING = {
  window_days: 7,
  scale_at: 0.6,
  kill_at: 0.2,
  restock_multiple: 2.5,
  restock_min: 10,
} as const;

export function gradeDrop(input: DropGradeInput): DropGrade {
  const total = Math.max(0, input.units_total);
  const remaining = Math.min(Math.max(0, input.units_remaining), total);
  const sold = total - remaining;
  const sellThrough = total === 0 ? 0 : sold / total;
  const st = +sellThrough.toFixed(3);

  if (input.days_live < DROP_GRADING.window_days) {
    return { grade: 'early', sell_through: st, reason: `day ${input.days_live}/${DROP_GRADING.window_days} — grading window not reached` };
  }
  if (total === 0) return { grade: 'kill', sell_through: 0, reason: 'no units were ever allocated' };
  if (sellThrough >= DROP_GRADING.scale_at) {
    const restock = Math.max(DROP_GRADING.restock_min, Math.round(sold * DROP_GRADING.restock_multiple));
    return { grade: 'scale', sell_through: st, restock_qty: restock, reason: `sell-through ${(st * 100).toFixed(0)}% ≥ ${DROP_GRADING.scale_at * 100}% — restock ${restock} (${DROP_GRADING.restock_multiple}× sold)` };
  }
  if (sellThrough <= DROP_GRADING.kill_at) {
    return { grade: 'kill', sell_through: st, reason: `sell-through ${(st * 100).toFixed(0)}% ≤ ${DROP_GRADING.kill_at * 100}% — capital is dying on the shelf` };
  }
  return { grade: 'hold', sell_through: st, reason: `sell-through ${(st * 100).toFixed(0)}% — between thresholds; re-grade next cycle` };
}

export interface LiveDrop extends DropGradeInput {
  id: string;
  name?: string;
}

/** An action the LATR loop proposes for founder approval. agent+tool match that agent's real escalation gate. */
export interface DropProposal {
  drop_id: string;
  name?: string;
  grade: 'scale' | 'kill';
  sell_through: number;
  agent: 'forecaster' | 'warden';
  tool: 'trigger_reorder' | 'delist_product';
  input: Record<string, unknown>;
  reason: string;
}

/**
 * The actionable half of the LATR loop: grade live drops, emit founder-approval proposals — winners
 * become a Forecaster restock (`trigger_reorder`), dead stock a Warden delist (`delist_product`).
 * 'hold'/'early' produce nothing. Each proposal maps to that agent's REAL escalation gate, so the
 * founder Approval Loop executes it on one tap. Sorted: restocks first (revenue), then kills (free
 * the capital); within each, the most decisive sell-through leads.
 */
export function planDropActions(drops: LiveDrop[]): DropProposal[] {
  const out: DropProposal[] = [];
  for (const d of drops) {
    const g = gradeDrop(d);
    if (g.grade === 'scale') {
      out.push({
        drop_id: d.id, name: d.name, grade: 'scale', sell_through: g.sell_through,
        agent: 'forecaster', tool: 'trigger_reorder',
        input: { drop_id: d.id, qty: g.restock_qty }, reason: g.reason,
      });
    } else if (g.grade === 'kill') {
      out.push({
        drop_id: d.id, name: d.name, grade: 'kill', sell_through: g.sell_through,
        agent: 'warden', tool: 'delist_product',
        input: { drop_id: d.id }, reason: g.reason,
      });
    }
  }
  const rank = (p: DropProposal) => (p.grade === 'scale' ? 0 : 1);
  return out.sort(
    (a, b) => rank(a) - rank(b) || (a.grade === 'scale' ? b.sell_through - a.sell_through : a.sell_through - b.sell_through)
  );
}
