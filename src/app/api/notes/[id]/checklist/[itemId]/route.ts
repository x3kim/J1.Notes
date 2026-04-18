import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { itemId } = await params;
  try {
    const body = await request.json();

    // Aktualisiert genau dieses eine Häkchen in der Datenbank
    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { checked: body.checked },
    });
    
    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Fehler beim Aktualisieren des Häkchens' }, { status: 500 });
  }
}