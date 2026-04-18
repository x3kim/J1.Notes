# gNotes v1.0 — Implementierungsplan

## Architektur
- Auth: JWT-Cookie (jose), bcryptjs, AppSettings-Tabelle in SQLite
- Toast: sonner
- Rich Text: @tiptap/react + StarterKit + underline + link extensions
- Drawing: react-sketch-canvas → PNG → Upload → Attachment
- Reminders: reminder_at auf Note, clientseitiger Check beim Start
- Docker: Multi-Stage + docker-compose (SQLite default, PostgreSQL via ENV)

## Neue Dependencies
- sonner
- @tiptap/react, @tiptap/starter-kit, @tiptap/extension-underline, @tiptap/extension-link
- react-sketch-canvas

## Schema-Änderungen
- AppSettings Model: id, auth_enabled Boolean @default(false), auth_type String @default("password"), password_hash String?
- Note: reminder_at DateTime? (neu)

## Phase 1 — Foundation (ERLEDIGT wenn Bugs behoben, Sonner integriert, Schema aktuell)
### Bugs zu fixen:
1. NoteCard.tsx Zeile 21: `searchQueryActive` zu Props-Destrukturierung hinzufügen, Zeile 117-118 (module-level const) entfernen
2. EditNoteModal.tsx: `attachments`-State deklarieren (`useState<string[]>(note.attachments?.map((a:any) => a.url) || [])`)
3. page.tsx: Dark Mode via localStorage persistieren (initial load + onChange speichern)
4. notes/[id]/route.ts: Versions-Snapshot nur erstellen wenn title/content_text/checklist_items/labels sich ändern (nicht bei position/pinned/archived/deleted_at changes)
### Sonner:
- `npm install sonner`
- Toaster in layout.tsx einbinden
- API-Calls in page.tsx mit toast wrappen
### Schema:
- AppSettings Model hinzufügen
- reminder_at auf Note hinzufügen
- prisma db push ausführen

## Phase 2 — Auth (abhängig von Phase 1)
### Files:
- src/app/api/auth/login/route.ts (POST: verify password/pin, set JWT cookie)
- src/app/api/auth/logout/route.ts (POST: clear cookie)
- src/app/api/settings/auth/route.ts (GET: auth settings, POST: update auth settings)
- src/app/login/page.tsx (Login-Seite: PIN-Grid oder Passwort-Input je nach auth_type)
- middleware.ts (JWT prüfen, redirect zu /login wenn auth_enabled)
- page.tsx: Settings-Panel mit Auth-Section erweitern

### Auth-Flow:
- Default: auth_enabled = false → App offen zugänglich
- Wenn aktiviert: Middleware prüft JWT-Cookie → kein Cookie → /login
- Login-Seite: liest auth_type von /api/settings/auth, zeigt PIN oder Passwort
- JWT: 30 Tage, httpOnly, SameSite=Strict
- /api/auth/* und /login von Middleware ausnehmen

## Phase 3 — Docker (unabhängig, parallel zu Phase 2 möglich)
### Files:
- Dockerfile (multi-stage: node:20-alpine builder + runner)
- .dockerignore
- docker-compose.yml (SQLite, volumes für prisma/dev.db und public/uploads)
- docker-compose.postgres.yml (PostgreSQL service)
- .env.example
### Start-Command: prisma generate && prisma db push && node server.js (next start)
### Wichtig: DATABASE_URL als ENV, bei sqlite → file:/data/dev.db (gemounted Volume)

## Phase 4 — UI-Verbesserungen (nach Phase 1)
### Quick-Create-Bar:
- NoteEditor.tsx im collapsed state: 3 Buttons rechts
  - "Neue Liste" → isListMode = true, expand
  - "Neue Notiz mit Zeichnung" → DrawingModal öffnen (Phase 5)
  - "Neue Notiz mit Bild" → fileInputRef.current?.click(), expand
### Hintergrundbilder:
- 8 vordefinierte Bild-URLs (Unsplash/SVG-Patterns) in NoteCard + NoteEditor Palette
- "Eigenes Bild"-Button → Upload → als bg_image URL speichern
- bg_image kann jetzt: SVG-Pattern-String ODER absoluter URL-Pfad sein
- Unterscheidung: if (bg_image.startsWith('/uploads/')) → backgroundImage: `url(${bg_image})`
  else → backgroundImage: bg_image (bestehende SVG-Patterns)
### Bildanhänge im EditNoteModal:
- Upload-Button hinzufügen (gleiche Logik wie NoteEditor)
- Attachments-State korrekt initialisieren (Bug aus Phase 1)
- Beim Speichern: body.attachments mit URLs mitschicken
### Drag & Drop:
- dragOverNote State in page.tsx
- NoteCard: onDragEnter callback
- Visuell: ring-2 ring-yellow-500 auf Ziel-Karte beim Hover

## Phase 5 — Rich Text + Zeichnen
### Tiptap:
- npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link
- NoteEditor.tsx + EditNoteModal.tsx: textarea → EditorContent
- BubbleMenu: Bold, Italic, Underline, Strike, Link
- content_text speichert jetzt HTML
- Backward-compat: wenn !content_text.startsWith('<') → als <p>text</p> in Tiptap laden
- NoteCard.tsx: content_text anzeigen via dangerouslySetInnerHTML (mit sanitize)
### Drawing:
- npm install react-sketch-canvas
- src/components/DrawingModal.tsx erstellen:
  - Vollbild-Overlay mit ReactSketchCanvas
  - Tools: Stift (verschiedene Farben), Radierer, Strichgröße, Undo, Clear
  - "Fertig"-Button: exportImage('png') → base64 → Blob → FormData → /api/upload → URL
  - URL als Attachment an Note hängen
- DrawingModal lazy-loaded: dynamic(() => import('../components/DrawingModal'), { ssr: false })

## Phase 6 — Erinnerungen + PWA
### Reminders:
- EditNoteModal: Bell-Icon Button → DatetimePicker (native <input type="datetime-local">)
- NoteCard: Bell-Icon wenn reminder_at gesetzt
- page.tsx: useEffect beim Mount → fetch notes → filter reminder_at <= now() → toast für jede
- Nach toast: PATCH note → reminder_at: null
### PWA:
- public/manifest.json: name, short_name, icons, theme_color: #fbbc04, background_color: #202124, display: standalone
- Icons: 192x192 + 512x512 (gelbes N auf dunklem Hintergrund, als PNG generieren)
- layout.tsx: <link rel="manifest">, <meta name="theme-color">, apple-touch-icon
- public/sw.js: Cache-First für statische Assets
- layout.tsx: <script> zum SW registrieren
