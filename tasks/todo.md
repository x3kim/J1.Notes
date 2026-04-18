# J1.Notes v1.0.3 — Task-Liste

## Phase A — Isolierte Kleinfix-Patches (Haiku) ⬜
- [ ] **A1** Hydration Error beheben (`page.tsx` ~Zeile 49, `suppressHydrationWarning` oder mounted-Guard)
- [ ] **A2** Versionsnummer in Footer/Settings anzeigen (`Footer.tsx`, v1.0.3)
- [ ] **A3** Labels Inline-Edit (`EditLabelsModal.tsx`, Klick auf Name → direkt editieren)
- [ ] **A4** TipTap Duplicate Extensions fix (`NoteEditor.tsx` + `EditNoteModal.tsx`, StarterKit-Konfig)
- [ ] **A5** Fehlende Übersetzungen ergänzen (`public/locales/de/*.json`, `public/locales/fr/*.json`)
- [ ] **CHECKPOINT A** — Kein Console-Error, Hydration OK, alle Texte übersetzt

## Phase B — NoteCard & Layout-Fixes (Haiku) ⬜
- [ ] **B1** Leere Notiz verhindern (`NoteEditor.tsx`, `editor?.getText()?.trim()` statt `contentText`)
- [ ] **B2** Vollbild-Button in NoteCard hinzufügen (`NoteCard.tsx`, Hover-Icon öffnet EditNoteModal)
- [ ] **B3** Mobile UI responsive (`page.tsx` Header, 375px breakpoint, kein Clipping)
- [ ] **B4** Hintergrund-Palette NoteCard um Bild-Upload erweitern (`NoteCard.tsx`)
- [ ] **CHECKPOINT B** — Mobile OK, keine leeren Notizen, Vollbild in Übersicht

## Phase C — Komplexe Fixes (Sonnet) ⬜
- [ ] **C1** EditNoteModal: Änderungen bei Overlay-Klick speichern (`EditNoteModal.tsx` Zeile 272)
- [ ] **C2** Zeichnung speichern debuggen & fixen (`DrawingModal.tsx` + `/api/upload/route.ts`)
- [ ] **C3** `NoteActionBar` Komponente erstellen & in NoteCard, NoteEditor, EditNoteModal einbauen
- [ ] **CHECKPOINT C** — Drawing speicherbar, kein Datenverlust beim Schließen, Icons einheitlich

## Phase D — Dependency-Updates (Sonnet + context7) ⬜
- [ ] **D1** Prisma 5.10.2 → 7.7.0 (context7, schema check, migrate)
- [ ] **D2** Next.js 14.1.0 → 15.x (context7, breaking changes, build fix)
- [ ] **D3** React 18.2.0 → 19.x (context7, deprecated APIs)
- [ ] **D4** Weitere Deps: lucide-react, sonner, i18next auf aktuelle Versionen
- [ ] **CHECKPOINT D** — `npm run build` erfolgreich, keine Laufzeitfehler

## Phase E — Review & Release (Opus) ⬜
- [ ] **E1** Opus: Vollständiger Code-Review aller Änderungen (Sicherheit, Performance, Konsistenz)
- [ ] **E2** Version auf 1.0.3 setzen (`package.json`)
- [ ] **E3** Git-Commit mit Changelog-Message
- [ ] **CHECKPOINT E** — v1.0.3 fertig, kein bekannter Bug

---

**Legende:** ⬜ ausstehend · ✅ fertig · 🔄 in Arbeit · ❌ blockiert
