import { NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
]);

export async function POST(request: Request) {
  const data = await request.formData();
  const file: File | null = data.get('file') as unknown as File;
  if (!file) return NextResponse.json({ success: false, error: 'No file' }, { status: 400 });

  // Validate type + size
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ success: false, error: 'Unsupported file type' }, { status: 415 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ success: false, error: 'File too large' }, { status: 413 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Sanitise file name: strip any path components, keep only basename, replace unsafe chars
  const rawBase = path.basename(file.name || 'upload');
  const safeBase = rawBase.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'upload';
  const uniqueName = `${Date.now()}-${safeBase}`;

  const uploadDir = path.join(process.cwd(), 'public/uploads');
  try { await mkdir(uploadDir, { recursive: true }); } catch (e) {}
  await writeFile(path.join(uploadDir, uniqueName), buffer);

  return NextResponse.json({ url: `/uploads/${uniqueName}` });
}

// Deletes an uploaded file. Guards against path traversal by re-resolving the
// target path and checking it stays within the uploads directory.
export async function DELETE(request: Request) {
  const url = new URL(request.url).searchParams.get('file');
  if (!url) return NextResponse.json({ success: false }, { status: 400 });

  try {
    const fileName = path.basename(url.split('?')[0]);
    if (!fileName || fileName === '.' || fileName === '..') {
      return NextResponse.json({ success: false, error: 'Invalid file' }, { status: 400 });
    }
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    const filePath = path.join(uploadDir, fileName);
    // Ensure the resolved path is still inside the upload directory
    const resolvedDir = path.resolve(uploadDir);
    const resolvedFile = path.resolve(filePath);
    if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
      return NextResponse.json({ success: false, error: 'Invalid path' }, { status: 400 });
    }
    await unlink(resolvedFile);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Datei nicht gefunden' }, { status: 404 });
  }
}
