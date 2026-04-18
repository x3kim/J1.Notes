import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const settings = await prisma.appSettings.findUnique({ where: { id: 'singleton' } });
    return NextResponse.json({
      username: settings?.username ?? null,
      avatar: settings?.avatar ?? null,
    });
  } catch {
    return NextResponse.json({ username: null, avatar: null });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updateData: Record<string, unknown> = {};

    if (typeof body.username === 'string') {
      const trimmed = body.username.trim();
      if (trimmed.length < 3 || trimmed.length > 20) {
        return NextResponse.json({ error: 'Username must be 3–20 characters' }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return NextResponse.json({ error: 'Username may only contain letters, numbers, and underscores' }, { status: 400 });
      }
      updateData.username = trimmed;
    }

    if (typeof body.avatar === 'string' || body.avatar === null) {
      updateData.avatar = body.avatar;
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: 'singleton' },
      update: updateData,
      create: { id: 'singleton', ...updateData },
    });

    return NextResponse.json({ username: settings.username, avatar: settings.avatar });
  } catch {
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
