import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    return NextResponse.json({
      auth_enabled: settings?.auth_enabled ?? false,
      auth_type: settings?.auth_type ?? 'password',
      has_password: !!(settings?.password_hash),
      reset_email: settings?.reset_email ?? null,
      pin_length: settings?.pin_length ?? 6,
    });
  } catch {
    return NextResponse.json({ auth_enabled: false, auth_type: 'password', has_password: false, reset_email: null, pin_length: 6 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.auth_enabled === 'boolean') updateData.auth_enabled = body.auth_enabled;
    if (body.auth_type) {
      if (!['password', 'pin'].includes(body.auth_type)) {
        return NextResponse.json({ error: 'Ungültiger auth_type' }, { status: 400 });
      }
      updateData.auth_type = body.auth_type;
    }
    if (body.password) {
      if (typeof body.password !== 'string') {
        return NextResponse.json({ error: 'Ungültiges Passwort-Format' }, { status: 400 });
      }
      const isPinType = (body.auth_type || 'password') === 'pin';
      if (isPinType && !/^\d{4,12}$/.test(body.password)) {
        return NextResponse.json({ error: 'PIN muss 4-12 Ziffern enthalten' }, { status: 400 });
      }
      updateData.password_hash = await bcrypt.hash(body.password, 12);
      if (isPinType) {
        updateData.pin_length = body.password.length;
      }
    }
    if (typeof body.reset_email === 'string') {
      const trimmed = body.reset_email.trim().toLowerCase();
      if (trimmed === '') {
        updateData.reset_email = null;
      } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        updateData.reset_email = trimmed;
      } else {
        return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
      }
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: { id: 'singleton', ...updateData },
    });

    return NextResponse.json({ success: true, auth_enabled: settings.auth_enabled });
  } catch {
    return NextResponse.json({ error: 'Fehler beim Speichern' }, { status: 500 });
  }
}
