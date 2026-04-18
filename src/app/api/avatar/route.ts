import { NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: Request) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Only PNG, JPG, and WebP images are allowed' }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File size must not exceed 2 MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = file.name.split('.').pop() ?? 'jpg';
  const uniqueName = `avatar-${Date.now()}.${ext}`;

  const avatarDir = path.join(process.cwd(), 'public', 'avatars');
  try {
    await mkdir(avatarDir, { recursive: true });
  } catch (_) {}

  await writeFile(path.join(avatarDir, uniqueName), buffer);

  return NextResponse.json({ url: `/avatars/${uniqueName}` });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url).searchParams.get('file');
  if (!url) return NextResponse.json({ success: false });

  try {
    const fileName = url.split('/').pop();
    if (fileName && fileName.startsWith('avatar-')) {
      const filePath = path.join(process.cwd(), 'public', 'avatars', fileName);
      await unlink(filePath);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
