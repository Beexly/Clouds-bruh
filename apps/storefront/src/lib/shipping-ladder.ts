/**
 * Free-shipping AOV ladder (Growth Playbook #2). Benchmark: a threshold ~25% above AOV lifts AOV
 * 15–30%; a progress indicator lifts the offer's conversion further. Pure + env-driven:
 * NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_USD (unset/0 = feature off, nothing renders).
 */
export interface LadderState {
  enabled: boolean;
  thresholdCents: number;
  remainingCents: number;
  /** 0..1 progress toward the threshold. */
  progress: number;
  /** Founder-voice line for the cart ("$18 away from free shipping" / "Free shipping unlocked"). */
  message: string;
}

export function shippingLadder(cartTotalCents: number, thresholdUsdRaw?: string | null): LadderState {
  const thresholdUsd = Number(thresholdUsdRaw ?? process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD_USD ?? 0);
  if (!Number.isFinite(thresholdUsd) || thresholdUsd <= 0) {
    return { enabled: false, thresholdCents: 0, remainingCents: 0, progress: 0, message: '' };
  }
  const thresholdCents = Math.round(thresholdUsd * 100);
  const total = Math.max(0, cartTotalCents || 0);
  const remainingCents = Math.max(0, thresholdCents - total);
  const progress = Math.min(1, thresholdCents === 0 ? 0 : total / thresholdCents);
  const message =
    remainingCents === 0
      ? 'Free shipping unlocked.'
      : `$${(remainingCents / 100).toFixed(2)} away from free shipping.`;
  return { enabled: true, thresholdCents, remainingCents, progress, message };
}
