import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Compute a simple text length from a note snapshot (content_text + title + checklist items)
function getNoteTextLength(note: { title?: string | null; content_text?: string | null; checklist_items?: { text: string }[] }): number {
  const titleLen = (note.title || '').length;
  const contentLen = (note.content_text || '').replace(/<[^>]*>/g, '').length;
  const checklistLen = (note.checklist_items || []).reduce((acc, item) => acc + item.text.length, 0);
  return titleLen + contentLen + checklistLen;
}

// Extract plain text from a note for change comparison
function getNoteTextContent(note: { title?: string | null; content_text?: string | null; checklist_items?: { text: string }[] }): string {
  const title = note.title || '';
  const content = (note.content_text || '').replace(/<[^>]*>/g, '');
  const checklist = (note.checklist_items || []).map(i => i.text).join(' ');
  return `${title} ${content} ${checklist}`.trim();
}

// Check if a history entry should be created based on change significance
function isSubstantialChange(
  current: { title?: string | null; content_text?: string | null; checklist_items?: { text: string }[] },
  lastVersion: { snapshot: string; created_at: Date } | null,
  body: Record<string, unknown>
): { should: boolean; charDelta: number; userAction: string } {
  const currentText = getNoteTextContent(current);
  const currentLen = currentText.length;

  // Determine user action
  let userAction = 'edit';
  if (body.label_ids !== undefined && !body.content_text && !body.title && !body.checklist_items) {
    userAction = 'label_change';
  }

  if (!lastVersion) {
    return { should: true, charDelta: currentLen, userAction };
  }

  const lastSnapshot = JSON.parse(lastVersion.snapshot);
  const lastText = getNoteTextContent(lastSnapshot);
  const charDelta = Math.abs(currentLen - lastText.length);

  // Also check full text similarity for major rewrites
  const lastLen = lastText.length;
  const maxLen = Math.max(currentLen, lastLen, 1);
  // Levenshtein-like threshold: if >10% of content changed, it's substantial
  const percentChange = charDelta / maxLen;

  // Time since last version
  const secondsSinceLastVersion = (Date.now() - new Date(lastVersion.created_at).getTime()) / 1000;

  const isCharDeltaSignificant = charDelta >= 10;
  const isTimeSufficient = secondsSinceLastVersion >= 30;
  const isPercentSignificant = percentChange >= 0.05 && charDelta >= 5;

  const should = (isCharDeltaSignificant && isTimeSufficient) || isPercentSignificant || userAction !== 'edit';

  return { should, charDelta, userAction };
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(request.url);
  const isHardDelete = url.searchParams.get('hard') === 'true';
  try {
    if (isHardDelete) await prisma.note.delete({ where: { id } });
    else await prisma.note.update({ where: { id }, data: { deleted_at: new Date(), pinned: false } });
    return NextResponse.json({ message: 'Erfolgreich' }, { status: 200 });
  } catch (error) { return NextResponse.json({ error: 'Fehler' }, { status: 500 }); }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();

    // 1. Snapshot der aktuellen Notiz machen BEVOR wir sie ändern (nur bei Inhaltsänderungen)
    const contentFields = ['title', 'content_text', 'checklist_items', 'labels', 'label_ids'];
    const hasContentChange = Object.keys(body).some(key => contentFields.includes(key));

    if (hasContentChange) {
      const currentNote = await prisma.note.findUnique({
        where: { id },
        include: { checklist_items: true, labels: true, attachments: true }
      });

      if (currentNote) {
        // Get the most recent version to compare
        const lastVersion = await prisma.noteVersion.findFirst({
          where: { note_id: id },
          orderBy: { created_at: 'desc' }
        });

        const { should, charDelta, userAction } = isSubstantialChange(currentNote, lastVersion, body);

        if (should) {
          await prisma.noteVersion.create({
            data: {
              note_id: id,
              snapshot: JSON.stringify(currentNote),
              user_action: userAction,
              char_delta: charDelta,
            }
          });
        }
      }
    }

    // 2. Notiz updaten
    if (body.checklist_items !== undefined) {
      await prisma.checklistItem.deleteMany({ where: { note_id: id } });
      if (body.checklist_items.length > 0) {
        await Promise.all(body.checklist_items.map((item: { text: string; checked: boolean }) =>
          prisma.checklistItem.create({ data: { text: item.text, checked: item.checked, note_id: id } })
        ));
      }
    }

    if (body.attachments !== undefined) {
      await prisma.attachment.deleteMany({ where: { note_id: id } });
      if (body.attachments.length > 0) {
        await Promise.all(body.attachments.map((url: string) =>
          prisma.attachment.create({ data: { url, note_id: id } })
        ));
      }
    }

    const updatedNote = await prisma.note.update({
      where: { id },
      data: {
        title: body.title, content_text: body.content_text, color: body.color, bg_image: body.bg_image,
        pinned: body.pinned, archived: body.archived, deleted_at: body.deleted_at !== undefined ? body.deleted_at : undefined,
        position: body.position !== undefined ? body.position : undefined,
        reminder_at: body.reminder_at !== undefined ? (body.reminder_at ? new Date(body.reminder_at) : null) : undefined,
        labels: body.label_ids !== undefined ? { set: body.label_ids.map((labelId: string) => ({ id: labelId })) } : undefined
      },
    });
    return NextResponse.json(updatedNote, { status: 200 });
  } catch (error) { return NextResponse.json({ error: 'Fehler' }, { status: 500 }); }
}
