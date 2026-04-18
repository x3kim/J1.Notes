import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const labels = await prisma.label.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(labels);
}

export async function POST(request: Request) {
  const { name, color } = await request.json();
  try {
    const label = await prisma.label.create({ data: { name, color: color || null } });
    return NextResponse.json(label, { status: 201 });
  } catch (error) { return NextResponse.json({ error: 'Label existiert evtl. schon' }, { status: 400 }); }
}