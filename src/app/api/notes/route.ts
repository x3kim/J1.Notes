import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import DOMPurify from 'isomorphic-dompurify';

function sanitizeNote(body: Record<string, any>): Record<string, any> {
  if (typeof body.content_text === 'string') {
    body.content_text = DOMPurify.sanitize(body.content_text, { USE_PROFILES: { html: true } });
  }
  if (typeof body.title === 'string') {
    body.title = body.title.slice(0, 500);
  }
  return body;
}

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
  const rawBody = await request.json();
  const body = sanitizeNote(rawBody);
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