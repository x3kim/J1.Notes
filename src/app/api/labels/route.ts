import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const labels = await prisma.label.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(labels);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();
  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 50) {
    return NextResponse.json({ error: 'Label name must be 1–50 characters' }, { status: 400 });
  }
  const safeColor = typeof color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(color.trim()) ? color.trim() : null;
  try {
    const label = await prisma.label.create({ data: { name: name.trim(), color: safeColor } });
    return NextResponse.json(label, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Label existiert evtl. schon' }, { status: 400 }); }
}