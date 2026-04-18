import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const versions = await prisma.noteVersion.findMany({
    where: { note_id: id },
    orderBy: { created_at: 'desc' },
    take: 50, // Limit to last 50 versions
  });
  return NextResponse.json(versions);
}

// POST /api/notes/[id]/versions - Restore a specific version
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { version_id } = body;

    if (!version_id) {
      return NextResponse.json({ error: 'version_id required' }, { status: 400 });
    }

    // Get the version to restore
    const version = await prisma.noteVersion.findUnique({ where: { id: version_id } });
    if (!version || version.note_id !== id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    // Get current note state (to create a history entry for the restore)
    const currentNote = await prisma.note.findUnique({
      where: { id },
      include: { checklist_items: true, labels: true, attachments: true }
    });

    if (!currentNote) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    }

    // Save current state as a history entry before restoring
    await prisma.noteVersion.create({
      data: {
        note_id: id,
        snapshot: JSON.stringify(currentNote),
        user_action: 'pre_restore',
        char_delta: 0,
      }
    });

    // Parse the snapshot to restore
    const oldData = JSON.parse(version.snapshot);

    // Restore checklist items
    await prisma.checklistItem.deleteMany({ where: { note_id: id } });
    if (oldData.checklist_items && oldData.checklist_items.length > 0) {
      await Promise.all(oldData.checklist_items.map((item: { text: string; checked: boolean }) =>
        prisma.checklistItem.create({ data: { text: item.text, checked: item.checked, note_id: id } })
      ));
    }

    // Restore the note
    const restoredNote = await prisma.note.update({
      where: { id },
      data: {
        title: oldData.title,
        content_text: oldData.content_text,
        color: oldData.color,
        labels: oldData.labels ? { set: oldData.labels.map((l: { id: string }) => ({ id: l.id })) } : undefined,
      },
    });

    // Create a history entry marking the restore
    await prisma.noteVersion.create({
      data: {
        note_id: id,
        snapshot: JSON.stringify({ ...restoredNote, checklist_items: oldData.checklist_items || [], labels: oldData.labels || [], attachments: currentNote.attachments }),
        user_action: 'restore',
        char_delta: 0,
      }
    });

    return NextResponse.json({ success: true, note: restoredNote }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Wiederherstellen' }, { status: 500 });
  }
}
