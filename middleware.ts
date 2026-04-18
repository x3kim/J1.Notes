import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'j1notes-secret-change-in-production');

// Diese Pfade sind IMMER zugänglich
const PUBLIC_PATHS = [
  '/login',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/settings/auth',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Statische Assets und öffentliche Pfade durchlassen
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/icons') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico' ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('j1notes-auth')?.value;

  // Wenn Token vorhanden: validieren
  if (token) {
    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next(); // Token gültig
    } catch {
      // Token ungültig — aber wir wissen noch nicht ob Auth aktiviert ist
    }
  }

  // Kein oder ungültiges Token: Auth-Status prüfen via internal fetch
  try {
    const settingsUrl = new URL('/api/settings/auth', request.url);
    const settingsRes = await fetch(settingsUrl.toString(), {
      headers: { 'x-middleware-check': '1' },
    });
    const settings = await settingsRes.json();

    if (!settings.auth_enabled) {
      return NextResponse.next(); // Auth aus → freier Zugang
    }

    // Auth aktiviert aber kein gültiges Token → Login
    return NextResponse.redirect(new URL('/login', request.url));
  } catch {
    // Bei Fehler: durchlassen (fail-open für bessere UX)
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
