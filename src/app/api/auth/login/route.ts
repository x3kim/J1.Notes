import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'j1notes-secret-change-in-production');

export async function POST(request: Request) {
  try {
    const { password } = await request.json();

    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings || !settings.auth_enabled || !settings.password_hash) {
      return NextResponse.json({ error: 'Auth nicht aktiviert' }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, settings.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
    }

    const token = await new SignJWT({ authenticated: true })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });
    response.cookies.set('j1notes-auth', token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 30, // 30 Tage
      path: '/',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
