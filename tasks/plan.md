# J1.Notes v1.0.3 — Implementierungsplan

**Ziel:** Stabile Version mit allen Bugfixes, UI-Verbesserungen und vorsichtigen Dependency-Updates.  
**Datum:** 2026-04-18  
**Modell-Zuweisung:** Haiku (einfach), Sonnet (mittel/komplex), Opus (Review)

---

## Analyse der Feedback-Punkte

| # | Feedback | Schwere | Modell | Phase |
|---|----------|---------|--------|-------|
| F1 | Dependency-Updates (Next.js, React, Prisma) | MITTEL | Sonnet | D |
| F2 | Hydration Error: Server "Notes" vs. Client "Notizen" | HOCH | Haiku | A |
| F3 | Änderungen verschwinden beim Overlay-Klick | HOCH | Sonnet | C |
| F4 | Vollbild-Button fehlt in Übersichtsansicht | MITTEL | Haiku | B |
| F5 | Leere Notiz wird gespeichert | HOCH | Haiku | B |
| F6 | Zeichnung speichern/anfügen defekt | HOCH | Sonnet | C |
| F7 | Icons-Bar inkonsistent (Übersicht ≠ Geöffnet) | MITTEL | Sonnet | C |
| F8 | Hintergrund-Palette inkonsistent (fehlt Bild-Upload) | MITTEL | Haiku | B |
| F9 | Mobile UI: Header-Elemente werden abgeschnitten | HOCH | Haiku | B |
| F10 | Labels Inline-Edit (Klick auf Name) | NIEDRIG | Haiku | A |
| F11 | Fehlende Übersetzungen (inkl. TipTap Duplicate-Warning) | MITTEL | Haiku | A |
| F12 | Versionsnummer in Footer/Einstellungen | NIEDRIG | Haiku | A |

---

## Dependency-Graph (betroffene Dateien)

```
page.tsx ──────────────────┬── NoteEditor.tsx ──── EditorToolbar.tsx
                            │                   └── DrawingModal.tsx
                            ├── NoteCard.tsx
                            ├── NoteListItem.tsx
                            └── EditNoteModal.tsx ── EditorToolbar.tsx
                                                  └── DrawingModal.tsx

EditLabelsModal.tsx (unabhängig)
Footer.tsx (unabhängig)
public/locales/**/*.json (unabhängig)
prisma/schema.prisma ──── package.json
```

**Konflikt-Risiken:**
- `NoteEditor.tsx` wird von Phase A (TipTap) und Phase C (Icons) berührt → sequenziell
- `EditNoteModal.tsx` wird von Phase A (TipTap) und Phase C (Overlay + Icons) berührt → sequenziell
- `NoteCard.tsx` wird von Phase B (Vollbild + Palette) und Phase C (Icons) berührt → sequenziell
- `page.tsx` wird von Phase A (Hydration) und Phase B (Mobile) berührt → sequenziell

---

## Phasen & Aufgaben

### PHASE A — Isolierte Kleinfix-Patches (Haiku)
*Voraussetzung: keine. Kann sofort starten.*

**A1 — Hydration Error beheben**
- Problem: `page.tsx` rendert serverseitig "Notes" (EN-Fallback), client übersetzt zu "Notizen"
- Ursache: `useTranslation()` in SSR-Kontext gibt Fallback zurück, React-Hydration schlägt fehl
- Fix: `suppressHydrationWarning` auf dem betroffenen `<span>` oder i18n mit `useEffect`/`mounted`-Guard
- Datei: `src/app/page.tsx` (Zeile ~49)
- Akzeptanzkriterium: Keine Hydration-Warnung in der Console

**A2 — Versionsnummer in UI**
- Problem: Version 1.0.3 wird nirgends angezeigt
- Fix: In `Footer.tsx` Version aus `package.json` (oder Konstante) anzeigen; alternativ im Einstellungsmenü (Zahnrad-Modal in `page.tsx`)
- Datei: `src/components/Footer.tsx` + ggf. Einstellungsbereich in `src/app/page.tsx`
- Akzeptanzkriterium: "v1.0.3" sichtbar in Footer oder Settings

**A3 — Labels Inline-Edit**
- Problem: Im "Labels bearbeiten"-Modal kann man den Namen nur über dediziertes Edit-Formular ändern, nicht durch Klick in die Zeile
- Fix: Klick auf Label-Name macht Zeile inline editierbar (`contentEditable` oder Input-Toggle)
- Datei: `src/components/EditLabelsModal.tsx`
- Akzeptanzkriterium: Klick auf Label-Name → direkt editierbar, Enter/Blur speichert

**A4 — TipTap Duplicate Extensions**
- Problem: Console-Warnung "Duplicate extension names: ['link', 'underline']"
- Ursache: `StarterKit` enthält `Link`/`Underline` bereits + werden zusätzlich einzeln registriert
- Fix: In `StarterKit`-Konfiguration diese Extensions deaktivieren (`link: false, underline: false`) oder die Einzelregistrierungen entfernen
- Dateien: `src/components/NoteEditor.tsx`, `src/components/EditNoteModal.tsx`
- Akzeptanzkriterium: Keine TipTap-Warnung in Console

**A5 — Fehlende Übersetzungen**
- Problem: Manche UI-Elemente noch auf Englisch (nicht übersetzt in DE/FR)
- Vorgehen: Alle Text-Strings in Komponenten prüfen, fehlende Keys in DE/FR-Übersetzungsdateien ergänzen
- Dateien: `public/locales/de/*.json`, `public/locales/fr/*.json`
- Akzeptanzkriterium: Bei DE-Spracheinstellung kein englischer Text sichtbar

---

### PHASE B — NoteCard & Layout-Fixes (Haiku)
*Voraussetzung: Phase A abgeschlossen.*

**B1 — Leere Notiz wird gespeichert**
- Problem: Klick auf "Notiz schreiben...", keine Eingabe, Klick außen → leere Notiz wird angelegt
- Code-Analyse: `handleSave()` in `NoteEditor.tsx` prüft `contentText.trim()`, aber Tiptap-Editor könnte `<p></p>` als nicht-leeren HTML zurückgeben
- Fix: `editor?.getText()?.trim()` statt `contentText` für den Leer-Check verwenden; sicherstellen dass alle Felder wirklich leer sind
- Datei: `src/components/NoteEditor.tsx` (Zeile ~152-155)
- Akzeptanzkriterium: Nur-Klick ohne Eingabe → keine neue Notiz

**B2 — Vollbild-Button in Übersichtsansicht**
- Problem: Vollbild-Button (öffnet EditNoteModal) existiert nur im Modal, nicht auf der Notiz-Karte
- Fix: In `NoteCard.tsx` einen Maximieren/Öffnen-Button hinzufügen (bei Hover sichtbar, wie die anderen Aktions-Buttons)
- Datei: `src/components/NoteCard.tsx`
- Akzeptanzkriterium: Hover über Notiz-Karte zeigt Vollbild-Icon

**B3 — Mobile UI Responsive**
- Problem: Auf kleinen Bildschirmen werden Header-Elemente abgeschnitten (Suchleiste, Icons)
- Fix: Responsive Breakpoints im Header überarbeiten; ggf. Hamburger-Menu für sehr kleine Screens; `overflow-hidden` entfernen oder Elemente in Dropdown-Menü bei xs verbergen
- Datei: `src/app/page.tsx` (Header-Bereich)
- Akzeptanzkriterium: Bei 375px Breite alle Kernfunktionen erreichbar, kein Clipping

**B4 — Hintergrund-Palette inkonsistent**
- Problem: In NoteCard fehlt die Option "eigenes Bild hochladen" für den Notizhintergrund (vorhanden in EditNoteModal)
- Fix: In `NoteCard.tsx` Palette um `<input type="file">` für Bild-Upload erweitern (analog zu `handleBgImageUpload` in NoteEditor)
- Datei: `src/components/NoteCard.tsx`
- Akzeptanzkriterium: NoteCard-Palette hat dieselben Optionen wie EditNoteModal-Palette

---

### PHASE C — Komplexe Fixes (Sonnet)
*Voraussetzung: Phase A + B abgeschlossen.*

**C1 — Änderungen verschwinden beim Overlay-Klick**
- Problem: `EditNoteModal.tsx` Zeile 272: `onClick={e => { if (e.target === e.currentTarget) onClose(); }}`
- Ursache: Overlay-Klick ruft `onClose()` ohne vorher zu speichern → alle ungespeicherten Änderungen verloren
- Fix: Vor `onClose()` die aktuellen Änderungen via `onUpdate()` persistieren; oder Auto-Save bei jeder Änderung (Debounce 500ms)
- Datei: `src/components/EditNoteModal.tsx`
- Akzeptanzkriterium: Klick auf Overlay speichert Änderungen vor dem Schließen

**C2 — Zeichnung speichern/anfügen**
- Problem: Zeichnung wird nicht gespeichert/angehängt
- Analyse: `DrawingModal.tsx` → `exportImage('png')` → Base64 → Blob → `/api/upload` → `onSave(url)` → `setAttachments()`
- Potenzielle Ursachen: (a) `/api/upload` Route-Fehler, (b) Blob-Konvertierung fehlerhaft, (c) `onSave` Callback falsch verdrahtet, (d) API-Route verarbeitet keine PNG-Blobs
- Fix: Debug-Trace durch den gesamten Speicher-Workflow; fehlerhafte Stelle identifizieren und reparieren
- Dateien: `src/components/DrawingModal.tsx`, `src/app/api/upload/route.ts`
- Akzeptanzkriterium: Zeichnung im Modal → Speichern → erscheint als Anhang der Notiz

**C3 — Icons-Bar vereinheitlichen**
- Problem: Die Icons-Bar am unteren Rand im EditNoteModal fehlt in der Übersichtsansicht (NoteCard) und im NoteEditor
- Anforderung: Alle Aktions-Icons (Palette, Labels, Reminder, Anhang, Zeichnung, usw.) sollen einheitlich sichtbar sein; bei Platzmangel → Overflow-Dropdown ("Mehr"-Button mit verbleibenden Icons)
- Ansatz: Gemeinsame `NoteActionBar`-Komponente extrahieren; misst verfügbaren Platz via `ResizeObserver` oder feste Breakpoints; überschüssige Icons in `<details>`/Dropdown
- Dateien: Neue `src/components/NoteActionBar.tsx`, `src/components/NoteCard.tsx`, `src/components/NoteEditor.tsx`, `src/components/EditNoteModal.tsx`
- Akzeptanzkriterium: Alle Kontexte zeigen dieselben Icons; bei wenig Platz → Overflow-Dropdown

---

### PHASE D — Dependency-Updates (Sonnet + context7)
*Voraussetzung: Phase C abgeschlossen und alle Tests grün.*
*⚠️ RISIKO: Major Version Bumps — sorgfältig testen!*

**D1 — Prisma 5.10.2 → 7.7.0**
- Breaking Changes prüfen via context7
- Schema-Kompatibilität sicherstellen
- `prisma generate` + `prisma db push` ausführen
- Datei: `package.json`, `prisma/schema.prisma`

**D2 — Next.js 14.1.0 → 15.x**
- Breaking Changes prüfen via context7 (App Router-Änderungen, Middleware-API)
- `next.config.js` anpassen
- Build-Fehler beheben

**D3 — React 18.2.0 → 19.x**
- Breaking Changes prüfen via context7
- Deprecated APIs ersetzen
- `@types/react` und `@types/react-dom` aktualisieren

**D4 — Weitere Dependencies**
- `lucide-react` auf aktuelle Version (neue Icons verfügbar)
- `tailwindcss` auf 4.x prüfen (Breaking Changes!)
- Restliche Dependencies auf Patch/Minor-Updates

---

### PHASE E — Opus Review & Version-Bump
*Voraussetzung: Phase D abgeschlossen, Build erfolgreich.*

**E1 — Abschluss-Code-Review durch Opus**
- Review aller Änderungen aus Phasen A–D
- Sicherheits-Check (XSS, Input-Validierung)
- Performance-Check
- Konsistenz der UI-Patterns

**E2 — Version auf 1.0.3 setzen**
- `package.json`: `"version": "1.0.3"`
- Commit mit vollständigem Changelog

---

## Checkpoint-Plan

```
[START]
  ↓
Phase A (Haiku) ─── Checkpoint A: Console fehlerfrei, Hydration OK
  ↓
Phase B (Haiku) ─── Checkpoint B: Leere Notizen OK, Mobile OK
  ↓
Phase C (Sonnet) ── Checkpoint C: Drawing OK, Overlay-Save OK, Icons einheitlich
  ↓
Phase D (Sonnet) ── Checkpoint D: Build erfolgreich, keine Migrations-Fehler
  ↓
Phase E (Opus) ──── Checkpoint E: Review bestanden, v1.0.3 released
```

---

## Annahmen

1. Die App läuft lokal auf SQLite (Entwicklung). PostgreSQL-Kompatibilität bei Prisma-Updates muss separat geprüft werden.
2. TipTap v3.x bleibt unverändert — nur StarterKit-Konfiguration wird angepasst.
3. Tailwind v3 bleibt für diesen Release (v4 wäre zu großes Breaking Change-Risiko).
4. `react-sketch-canvas` bleibt auf v6.2.0 (funktioniert, außer dem Save-Bug).
5. Favicon-404 wird im Rahmen der Übersetzungs-/Kleinfix-Phase als Teil von A5 behoben.
