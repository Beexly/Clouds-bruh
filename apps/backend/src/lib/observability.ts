/**
 * Observability — Sentry error reporting, env-gated and fire-and-forget.
 *
 * No SDK: we POST a minimal Sentry "envelope" straight to the ingest endpoint via global fetch
 * when SENTRY_DSN is set. When it's unset (or anything goes wrong) every export no-ops and never
 * throws — error reporting must never become a new source of errors on the critical path.
 *
 * DSN shape: https://{publicKey}@{host}/{projectId}
 *   → POST https://{host}/api/{projectId}/envelope/
 *   → header X-Sentry-Auth: Sentry sentry_key={publicKey}, sentry_version=7
 */

export type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ParsedSentryDsn {
  publicKey: string;
  host: string;
  projectId: string;
  ingestUrl: string;
  authHeader: string;
}

/** Parse a Sentry DSN into the ingest URL + auth header. Returns null on anything malformed. */
export function parseSentryDsn(dsn: string | undefined | null): ParsedSentryDsn | null {
  if (!dsn) return null;
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const host = url.host;
    const projectId = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    if (!publicKey || !host || !projectId) return null;
    return {
      publicKey,
      host,
      projectId,
      ingestUrl: `${url.protocol}//${host}/api/${projectId}/envelope/`,
      authHeader: `Sentry sentry_key=${publicKey}, sentry_version=7`,
    };
  } catch {
    return null;
  }
}

function sendEnvelope(event: Record<string, unknown>): void {
  const parsed = parseSentryDsn(process.env.SENTRY_DSN);
  if (!parsed) return; // no-op when unconfigured

  try {
    const sentAt = new Date().toISOString();
    const header = JSON.stringify({ event_id: event.event_id, sent_at: sentAt, dsn: process.env.SENTRY_DSN });
    const itemHeader = JSON.stringify({ type: 'event' });
    const body = `${header}\n${itemHeader}\n${JSON.stringify(event)}\n`;

    // Fire-and-forget: never await, swallow rejections.
    void fetch(parsed.ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': parsed.authHeader,
      },
      body,
    }).catch(() => {});
  } catch {
    // never throw
  }
}

function eventId(): string {
  // 32-char hex, Sentry's expected event_id shape.
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

/** Report a thrown error to Sentry with optional structured context. No-op when SENTRY_DSN unset. */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  try {
    const error = err instanceof Error ? err : new Error(typeof err === 'string' ? err : 'Unknown error');
    sendEnvelope({
      event_id: eventId(),
      timestamp: Date.now() / 1000,
      platform: 'node',
      level: 'error',
      exception: {
        values: [
          {
            type: error.name || 'Error',
            value: error.message,
            stacktrace: error.stack ? { frames: [] } : undefined,
          },
        ],
      },
      extra: { stack: error.stack, ...(context ?? {}) },
      tags: { service: 'lumera-backend' },
    });
  } catch {
    // never throw
  }
}

/** Report a message to Sentry at a given level. No-op when SENTRY_DSN unset. */
export function captureMessage(msg: string, level: SentryLevel = 'info'): void {
  try {
    sendEnvelope({
      event_id: eventId(),
      timestamp: Date.now() / 1000,
      platform: 'node',
      level,
      message: { formatted: msg },
      tags: { service: 'lumera-backend' },
    });
  } catch {
    // never throw
  }
}
