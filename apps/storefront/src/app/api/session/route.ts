import { NextResponse, type NextRequest } from 'next/server';

/**
 * Session route — the only place the customer JWT touches a cookie.
 *
 * The token is stored httpOnly (not readable by JS, not in localStorage) so it cannot be
 * exfiltrated by client-side XSS. The customer context posts the token here after login/register,
 * reads it back on mount, and deletes it on logout. Every branch is defensive — a malformed body
 * yields a 400, never a thrown 500.
 */

export const runtime = 'nodejs';

const COOKIE = 'lumera_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE,
  };
}

/** Read the current session token (so the client can fetch /store/customers/me). */
export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value ?? null;
  return NextResponse.json({ token });
}

/** Persist a token after login/register. */
export async function POST(req: NextRequest) {
  let token: unknown;
  try {
    ({ token } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  if (typeof token !== 'string' || !token.trim()) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, token.trim(), cookieOptions());
  return res;
}

/** Clear the session on logout. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
  return res;
}
