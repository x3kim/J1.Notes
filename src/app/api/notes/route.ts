import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.note.deleteMany({ where: { deleted_at: { lte: sevenDaysAgo } } });

  // include erweitert um labels und attachments!
  const notes = await prisma.note.findMany({
    include: { checklist_items: true, labels: true, attachments: true },
    orderBy: { created_at: 'desc' }
  });
  return NextResponse.json(notes);
}

export async function POST(request: Request) {
  try {
  const body = await request.json();
  let user = await prisma.user.findFirst();
  if (!user) user = await prisma.user.create({ data: { email: "admin", password_hash: "" }});

  const note = await prisma.note.create({
    data: {
      title: body.title, color: body.color, content_text: body.content_text, bg_image: body.bg_image, owner_id: user.id,
      checklist_items: { create: body.checklist_items || [] },
      attachments: { create: (body.attachments || []).map((url: string) => ({ url })) },
      labels: { connect: (body.label_ids || []).map((id: string) => ({ id })) }
    }
  });
  return NextResponse.json(note, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Erstellen' }, { status: 500 });
  }
}

export async function DELETE() {
  await prisma.note.deleteMany({ where: { deleted_at: { not: null } } });
  return NextResponse.json({ message: 'Papierkorb geleert' });
}