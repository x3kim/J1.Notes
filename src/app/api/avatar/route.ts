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

  const ext = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') ?? 'jpg';
  const uniqueName = `avatar-${Date.now()}.${ext}`;

  // Store inside /uploads so the existing Docker volume keeps avatars persistent
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(uploadDir, { recursive: true });
  } catch (_) {}

  await writeFile(path.join(uploadDir, uniqueName), buffer);

  return NextResponse.json({ url: `/uploads/${uniqueName}` });
}

export async function DELETE(request: Request) {
  const fileParam = new URL(request.url).searchParams.get('file');
  if (!fileParam) return NextResponse.json({ success: false });

  try {
    const fileName = path.basename(fileParam.split('?')[0]);
    // Only delete files that look like avatars and stay within uploads dir
    if (!fileName || !fileName.startsWith('avatar-')) {
      return NextResponse.json({ success: false, error: 'Invalid file' });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const filePath = path.resolve(path.join(uploadDir, fileName));
    const resolvedDir = path.resolve(uploadDir);

    if (!filePath.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ success: false, error: 'Invalid path' });
    }

    await unlink(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
