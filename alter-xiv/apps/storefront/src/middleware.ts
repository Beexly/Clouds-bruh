import { NextResponse, type NextRequest } from 'next/server';

/**
 * Establish an anonymous visitor identity at the edge, before the first paint.
 * This is what makes the Broadcast personalized on SSR (not just after hydration):
 * the server reads `axiv_vid` from the cookie and asks ORACLE for *this* visitor's
 * ordering. The client signal lib mirrors the same id into localStorage.
 */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get('axiv_vid')) {
    const id = crypto.randomUUID();
    res.cookies.set('axiv_vid', id, {
      httpOnly: false, // readable by the client signal lib so ids stay consistent
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }
  return res;
}

export const config = {
  // Run on pages, not on static assets or the Next internals.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
};
