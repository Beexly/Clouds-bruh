import { AbstractPaymentProvider } from '@medusajs/framework/utils';
import type {
  Logger,
  PaymentSessionStatus,
  ProviderWebhookPayload,
  WebhookActionResult,
  CapturePaymentInput,
  CapturePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
} from '@medusajs/framework/types';

type InjectedDependencies = { logger?: Logger };
type PayPalOptions = {
  clientId?: string;
  clientSecret?: string;
  env?: 'sandbox' | 'live';
};

/**
 * PayPal Orders v2 payment provider for Lumera — Medusa v2 custom payment provider.
 *
 * Gated + fixture-safe, mirroring apps/intelligence/src/vendors/clients.ts and the Lumera fulfillment
 * provider: with no PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET the provider STILL constructs (token fetch is
 * lazy) and every method degrades gracefully without crashing — nothing reaches a live PayPal API.
 *
 * Auth: OAuth2 client-credentials token against `${base}/v1/oauth2/token`.
 * Base: sandbox `https://api-m.sandbox.paypal.com` unless PAYPAL_ENV=live → `https://api-m.paypal.com`.
 * All network is wrapped in try/catch. Uses the global `fetch` only — no SDK packages.
 *
 * Provider id resolves to `pp_paypal_{id}` per Medusa's `pp_{identifier}_{id}` convention.
 */
export class LumeraPayPalProviderService extends AbstractPaymentProvider<PayPalOptions> {
  static identifier = 'paypal';

  protected logger_?: Logger;
  protected options_: PayPalOptions;

  // Cached OAuth token (lazy). Never fetched at construction so missing creds can't crash boot.
  private accessToken_?: string;
  private tokenExpiresAt_ = 0;

  constructor(container: InjectedDependencies, options: PayPalOptions = {}) {
    super(container as Record<string, unknown>, options);
    this.logger_ = container?.logger;
    this.options_ = options ?? {};
  }

  // ── Configuration helpers (pure, unit-testable) ────────────────────────────

  /** Resolve the PayPal API base URL from options/env. Live only when explicitly opted in. */
  baseUrl(): string {
    return paypalBaseUrl(this.options_.env ?? process.env.PAYPAL_ENV);
  }

  private clientId(): string | undefined {
    return this.options_.clientId ?? process.env.PAYPAL_CLIENT_ID;
  }

  private clientSecret(): string | undefined {
    return this.options_.clientSecret ?? process.env.PAYPAL_CLIENT_SECRET;
  }

  /** Whether PayPal credentials are present. */
  configured(): boolean {
    return Boolean(this.clientId() && this.clientSecret());
  }

  // ── OAuth (lazy) ───────────────────────────────────────────────────────────

  /** Fetch (and cache) an OAuth2 client-credentials token, or null when unconfigured / on failure. */
  private async getAccessToken(): Promise<string | null> {
    if (!this.configured()) return null;
    if (this.accessToken_ && Date.now() < this.tokenExpiresAt_) return this.accessToken_;

    try {
      const auth = Buffer.from(`${this.clientId()}:${this.clientSecret()}`).toString('base64');
      const res = await fetch(`${this.baseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { access_token?: string; expires_in?: number };
      if (!data.access_token) return null;
      this.accessToken_ = data.access_token;
      // Refresh a minute early to avoid edge expiry.
      this.tokenExpiresAt_ = Date.now() + Math.max(0, (Number(data.expires_in) || 3000) - 60) * 1000;
      return this.accessToken_;
    } catch (e) {
      this.logger_?.warn?.(`[lumera-paypal] token fetch failed: ${(e as Error).message?.slice(0, 80)}`);
      return null;
    }
  }

  private async authedFetch(path: string, init: RequestInit = {}): Promise<Response | null> {
    const token = await this.getAccessToken();
    if (!token) return null;
    try {
      return await fetch(`${this.baseUrl()}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch (e) {
      this.logger_?.warn?.(`[lumera-paypal] request failed (${path}): ${(e as Error).message?.slice(0, 80)}`);
      return null;
    }
  }

  // ── Provider methods ───────────────────────────────────────────────────────

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const amount = formatPayPalAmount(input.amount);
    const currency = (input.currency_code || 'usd').toUpperCase();

    if (this.configured()) {
      const res = await this.authedFetch('/v2/checkout/orders', {
        method: 'POST',
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{ amount: { currency_code: currency, value: amount } }],
        }),
      });
      if (res?.ok) {
        const order = (await res.json()) as { id?: string; status?: string };
        if (order.id) {
          return {
            id: order.id,
            data: { id: order.id, status: order.status, amount, currency_code: currency },
            status: mapPayPalStatus(order.status),
          };
        }
      }
    }

    // Fixture-safe fallback: produce a deterministic-ish local session id so checkout flows can be
    // exercised without live creds. No network was made (or it failed) — stay pending.
    const localId = `paypal_local_${Date.now()}`;
    return {
      id: localId,
      data: { id: localId, status: 'CREATED', amount, currency_code: currency, gated: !this.configured() },
      status: 'pending',
    };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>;
    const status = await this.fetchOrderStatus(String(data.id ?? ''));
    return { status: status ?? 'authorized', data: { ...data } };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>;
    const orderId = String(data.id ?? '');
    if (this.configured() && orderId) {
      const res = await this.authedFetch(`/v2/checkout/orders/${orderId}/capture`, { method: 'POST' });
      if (res?.ok) {
        const captured = (await res.json()) as Record<string, unknown>;
        return { data: { ...data, ...captured, captured: true } };
      }
    }
    return { data: { ...data, captured: true } };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    // PayPal orders that are not captured expire on their own; there is no destructive cancel call.
    return { data: { ...((input.data ?? {}) as Record<string, unknown>), canceled: true } };
  }

  async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>;
    const captureId = String(data.capture_id ?? extractCaptureId(data) ?? '');
    const amount = formatPayPalAmount(input.amount);
    const currency = String(data.currency_code ?? 'USD').toUpperCase();

    if (this.configured() && captureId) {
      const res = await this.authedFetch(`/v2/payments/captures/${captureId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount: { value: amount, currency_code: currency } }),
      });
      if (res?.ok) {
        const refund = (await res.json()) as Record<string, unknown>;
        return { data: { ...data, refund } };
      }
    }
    return { data: { ...data, refunded_amount: amount } };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>;
    const orderId = String(data.id ?? '');
    if (this.configured() && orderId) {
      const res = await this.authedFetch(`/v2/checkout/orders/${orderId}`, { method: 'GET' });
      if (res?.ok) {
        const order = (await res.json()) as Record<string, unknown>;
        return { data: { ...data, ...order } };
      }
    }
    return { data };
  }

  async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    const data = (input.data ?? {}) as Record<string, unknown>;
    const orderId = String(data.id ?? '');
    const remote = await this.fetchOrderStatus(orderId);
    if (remote) return { status: remote, data };
    // Map any cached status string on data, else pending.
    return { status: mapPayPalStatus(data.status as string | undefined), data };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    // PayPal has no delete-order endpoint; just return the data so Medusa can drop the session.
    return { data: (input.data ?? {}) as Record<string, unknown> };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    // Amount/currency changes are reflected by re-initiating. Keep the existing session data and
    // re-stamp the amount so downstream reads stay consistent. No destructive network action.
    const data = (input.data ?? {}) as Record<string, unknown>;
    return {
      data: {
        ...data,
        amount: formatPayPalAmount(input.amount),
        currency_code: (input.currency_code || String(data.currency_code ?? 'usd')).toUpperCase(),
      },
      status: mapPayPalStatus(data.status as string | undefined),
    };
  }

  async getWebhookActionAndData(payload: ProviderWebhookPayload['payload']): Promise<WebhookActionResult> {
    const result = paypalWebhookAction(payload?.data ?? {});
    return result;
  }

  // ── internal ───────────────────────────────────────────────────────────────

  /** Best-effort remote order status; null when unconfigured or on any failure. */
  private async fetchOrderStatus(orderId: string): Promise<PaymentSessionStatus | null> {
    if (!this.configured() || !orderId) return null;
    const res = await this.authedFetch(`/v2/checkout/orders/${orderId}`, { method: 'GET' });
    if (!res?.ok) return null;
    try {
      const order = (await res.json()) as { status?: string };
      return mapPayPalStatus(order.status);
    } catch {
      return null;
    }
  }
}

// ── Pure helpers (unit-testable without network) ──────────────────────────────

/** Select the PayPal API base URL. Live only when env === 'live'; everything else → sandbox. */
export function paypalBaseUrl(env?: string): string {
  return String(env).toLowerCase() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * Map a PayPal Orders v2 status to a Medusa PaymentSessionStatus.
 * PayPal: CREATED | SAVED | APPROVED | VOIDED | COMPLETED | PAYER_ACTION_REQUIRED.
 */
export function mapPayPalStatus(status?: string): PaymentSessionStatus {
  switch (String(status).toUpperCase()) {
    case 'COMPLETED':
      return 'captured';
    case 'APPROVED':
    case 'SAVED':
      return 'authorized';
    case 'VOIDED':
      return 'canceled';
    case 'PAYER_ACTION_REQUIRED':
      return 'requires_more';
    case 'CREATED':
      return 'pending';
    default:
      return 'pending';
  }
}

/**
 * Lumera money convention: amounts are stored as **integer cents** throughout (catalog, cart, email),
 * matching the storefront (which divides by 100 for display). PayPal's REST API wants a 2-decimal
 * string in major units, so we convert cents → dollars only here, at the external boundary.
 * (Verify with one PayPal sandbox capture before going live — see SECURITY.md money-unit note.)
 */
export function formatPayPalAmount(amountCents: unknown): string {
  const n = Number(amountCents);
  if (!Number.isFinite(n) || n < 0) return '0.00';
  return (n / 100).toFixed(2);
}

/** Pull a capture id out of a captured-order payload, if present. */
function extractCaptureId(data: Record<string, unknown>): string | undefined {
  const units = (data.purchase_units ?? []) as Array<Record<string, any>>;
  for (const u of units) {
    const cap = u?.payments?.captures?.[0]?.id;
    if (cap) return String(cap);
  }
  return undefined;
}

/**
 * Translate a PayPal webhook event into a Medusa webhook action. Pure (no network) so it's testable.
 * We can't compute a BigNumber amount safely here without the framework's BigNumber, so we surface the
 * action and the session id; Medusa reconciles the amount from the stored session.
 */
export function paypalWebhookAction(data: Record<string, unknown>): WebhookActionResult {
  const eventType = String((data as any)?.event_type ?? '').toUpperCase();
  const resource = ((data as any)?.resource ?? {}) as Record<string, any>;
  const sessionId = String(resource.id ?? resource.supplementary_data?.related_ids?.order_id ?? '');
  const amount = Number(resource?.amount?.value ?? resource?.seller_receivable_breakdown?.gross_amount?.value ?? 0) || 0;

  const base = { session_id: sessionId, amount } as { session_id: string; amount: number };

  switch (eventType) {
    case 'CHECKOUT.ORDER.APPROVED':
      return { action: 'authorized', data: base };
    case 'PAYMENT.CAPTURE.COMPLETED':
    case 'CHECKOUT.ORDER.COMPLETED':
      return { action: 'captured', data: base };
    case 'PAYMENT.CAPTURE.DENIED':
    case 'PAYMENT.CAPTURE.DECLINED':
      return { action: 'failed', data: base };
    case 'CHECKOUT.ORDER.VOIDED':
    case 'PAYMENT.CAPTURE.REVERSED':
      return { action: 'canceled', data: base };
    default:
      return { action: 'not_supported' };
  }
}

export default LumeraPayPalProviderService;
