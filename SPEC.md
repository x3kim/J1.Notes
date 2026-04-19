# Spec: Live-Kollaboration für J1.Notes

## 1. Ziel

Mehrere Nutzer sollen dieselbe Notiz gleichzeitig bearbeiten können. Änderungen werden in Echtzeit übertragen — ohne manuelle Speicheraktion. Sichtbar ist außerdem, wer gerade mitarbeitet (Präsenz-Indikator mit Name/Avatar-Farbe).

**Zielgruppe:** Selbst-Hosted-Betrieb im Heimnetz/Intranet, kleine Gruppen (2–5 Nutzer gleichzeitig pro Notiz).

---

## 2. Technologie-Entscheidung: Y.js + Hocuspocus

### Warum Y.js?

Tiptap (der bestehende Editor) hat offizielle, von den Tiptap-Entwicklern gepflegte Extensions für Y.js:

- `@tiptap/extension-collaboration` — bindet Y.js als Tiptap-Dokument-Store ein
- `@tiptap/extension-collaboration-cursor` — zeigt Cursor/Auswahl anderer Nutzer an

Y.js ist ein **CRDT** (Conflict-free Replicated Data Type): Gleichzeitige Änderungen werden automatisch zusammengeführt, ohne Last-Write-Wins-Konflikte.

### Warum Hocuspocus?

Hocuspocus ist der offizielle WebSocket-Server für Tiptap + Y.js:

- Gleiche Maintainer wie Tiptap → perfekte Integration
- Persistenz-Extension für SQLite/PostgreSQL via Prisma oder direktem Adapter
- Awareness-Protokoll (Cursor, Presence) out-of-the-box
- Läuft als separater Node.js-Prozess in Docker → **keine Änderungen am Next.js-Setup nötig**

### Warum nicht die Alternativen?

| Option | Problem |
|--------|---------|
| SSE + REST | Einwegkanal, kein Conflict-Resolution für Text |
| socket.io (custom OT) | Viel Eigenimplementierung, fehleranfällig |
| Liveblocks / PartyKit | Externer Cloud-Dienst — widerspricht Self-Hosted-Anforderung |
| Next.js Custom Server mit WS | Bricht Next.js App-Router-Optimierungen, viel Boilerplate |

---

## 3. Architektur-Übersicht

```
Browser A ──WebSocket──┐
                       ├──► Hocuspocus-Server (Port 1234) ──► DB (Y.js Binary-Blob)
Browser B ──WebSocket──┘         │
                                 └──► Awareness (wer ist online, Cursor-Position)

Next.js App (Port 3000) ──REST──► Prisma ──► SQLite / PostgreSQL
```

- **Y.js-Dokument** ist die Single Source of Truth für den Tiptap-Inhalt während aktiver Kollaboration.
- Beim Schließen der Notiz wird der aktuelle Inhalt via vorhandenem `PATCH /api/notes/[id]` in die `content_text`-Spalte gespeichert (bestehender Flow bleibt erhalten).
- Hocuspocus persistiert den Y.js-Binär-Blob in einer neuen DB-Tabelle `NoteCollabState` — damit kann ein Nutzer nahtlos weitermachen, auch wenn er alleine ist.

---

## 4. Betroffene Dateien / Wo wird was ergänzt

### Neu: `hocuspocus-server/` (eigener Docker-Service)

```
hocuspocus-server/
├── index.ts          # Server-Konfiguration + Persistence-Hook
├── package.json
└── tsconfig.json
```

Aufgaben:
- WebSocket-Verbindungen für Notiz-Dokumente verwalten (Raum-ID = Note-ID)
- Y.js-Binär-Blob in DB lesen/schreiben (via Hocuspocus `onLoadDocument` / `onStoreDocument`)
- Auth-Check: Nur angemeldete Nutzer dürfen verbinden (JWT-Token aus Cookie validieren)

### Geändert: `docker-compose.yml`

Neuer Service `collab`:

```yaml
collab:
  build: ./hocuspocus-server
  ports:
    - "1234:1234"
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - JWT_SECRET=${JWT_SECRET}
  depends_on:
    - app
```

### Geändert: `prisma/schema.prisma`

Neues Modell für Y.js-Zustand:

```prisma
model NoteCollabState {
  note_id   String   @id
  ydoc      Bytes
  updated_at DateTime @updatedAt
  note      Note     @relation(fields: [note_id], references: [id], onDelete: Cascade)
}
```

### Geändert: `src/components/EditNoteModal.tsx`

- Tiptap-Editor erhält `Collaboration`- und `CollaborationCursor`-Extension
- WebSocket-Provider (`HocuspocusProvider`) wird beim Öffnen der Notiz initialisiert
- Kleiner Präsenz-Bereich im Modal-Header: Avatare/Initialen der aktiven Nutzer
- `useEffect` Cleanup: Provider disconnecten beim Schließen

### Neu: `src/hooks/useCollaboration.ts`

Hook kapselt Provider-Lifecycle:

```ts
// Gibt zurück: { provider, awareness, activeUsers }
```

### Geändert: `src/app/api/notes/[id]/route.ts` (PATCH)

- Kein Breaking Change — bestehender PATCH-Endpunkt bleibt identisch
- Optional: Nach dem Speichern Hocuspocus-Server per HTTP-Callback über neue DB-Version informieren (verhindert Überschreiben durch veralteten Y.js-State)

---

## 5. Checklist-Items — Sonderfall

Checklist-Items sind aktuell **außerhalb** des Tiptap-Editors als React-State gespeichert (separate `checklist_items`-DB-Tabelle). Das ist das komplexeste Problem.

### Option A: Tiptap TaskList-Migration (empfohlen für Phase 2)

- Checklisten werden in Tiptap-Content als `<ul data-type="taskList">` gespeichert
- Y.js synchronisiert sie automatisch zusammen mit dem Rest des Dokuments
- **Aufwand**: `ChecklistItem`-Tabelle entfernen, Migration schreiben, `EditNoteModal.tsx` und API umbauen
- **Vorteil**: Einheitliche Datenhaltung, keine zwei Sync-Kanäle

### Option B: Checklist via separater WebSocket-Events (Phase 1 Notlösung)

- Hocuspocus unterstützt Custom Messages — Checklist-Änderungen als binäre Messages senden
- **Nachteil**: Keine CRDT-Garantien für Checklisten → mögliche Konflikte

**Empfehlung für Phase 1:** Nur Rich-Text synchronisieren. Checklisten bleiben single-user (kein Kollisions-Risiko bei Häkchen-Setzen falls nur einer die Checkliste bearbeitet). Phase 2 migriert zu TaskList.

---

## 6. Präsenz-Indikator

Y.js **Awareness** überträgt beliebige Metadaten (Name, Farbe, Cursor-Position) an alle verbundenen Clients. Implementierung:

1. Beim Verbinden sendet Client: `{ name: user.name, color: randomColor(), cursor: null }`
2. Im Modal: Zeile von Avataren (max. 5, dann `+N`) mit Tooltip-Namen
3. Im Tiptap-Editor: farbige Cursor-Linie + Namens-Label

---

## 7. Aufwands-Schätzung

| Aufgabe | Aufwand |
|---------|---------|
| Hocuspocus-Server Setup + Docker | ~2–3h |
| Prisma-Schema + Migration | ~30 min |
| `EditNoteModal.tsx` WebSocket-Integration | ~3–4h |
| Präsenz-UI (Avatar-Reihe) | ~1–2h |
| Auth-Validierung im WS-Server | ~1–2h |
| Testing (2 Browser-Tabs) | ~1h |
| **Gesamt Phase 1** | **~8–12h** |
| Checklist-Migration (Phase 2) | ~4–6h zusätzlich |

---

## 8. Risikobewertung

### Wie groß ist die Chance, dass etwas kaputt geht?

**Gering** — weil Hocuspocus als separater Service läuft:

| Bereich | Risiko | Begründung |
|---------|--------|------------|
| Bestehender REST-Flow | **Sehr gering** | Hocuspocus läuft unabhängig, kein Code-Sharing mit Next.js |
| Tiptap-Editor (Einzelnutzer) | **Gering** | Ohne WS-Verbindung fällt Tiptap auf normalen Modus zurück |
| Checklist-Items | **Mittel** | In Phase 1 nicht synchronisiert — mögliche Verwirrung bei gleichzeitigem Bearbeiten |
| Daten-Konsistenz | **Gering** | Y.js CRDT + Hocuspocus-Persistence + bestehender DB-PATCH = drei Sicherheitsnetze |
| Docker-Komplexität | **Gering** | Neuer Service ist unabhängig, `depends_on` reicht |
| Auth-Bypass | **Mittel** | WS-Server muss JWT selbst validieren — bei Fehler ungeschützter Zugriff |

**Kritischer Punkt:** JWT-Validierung im Hocuspocus-Server muss denselben Secret und dieselbe Logik wie `src/lib/auth.ts` verwenden. Dafür das JWT-Secret als Env-Variable an beide Services übergeben.

**Fallback:** Wenn Hocuspocus-Service nicht erreichbar ist, zeigt der Editor eine kleine Statusmeldung ("Offline — lokaler Modus") und funktioniert weiterhin als Einzelnutzer-Editor.

---

## 9. Abnahmekriterien

- [ ] Zwei Browser-Tabs öffnen dieselbe Notiz — Tipp-Änderungen in Tab A erscheinen in Tab B innerhalb 500 ms
- [ ] Nach Verbindungsverlust und Reconnect ist der Inhalt konsistent
- [ ] Präsenz-Indikator zeigt korrekte Nutzeranzahl
- [ ] Beim Schließen der Notiz wird der Inhalt korrekt via PATCH gespeichert
- [ ] Ohne Auth-Token wird WS-Verbindung abgelehnt (wenn Auth aktiviert)
- [ ] Einzelnutzer-Betrieb (Hocuspocus offline) funktioniert weiterhin unverändert
- [ ] Checklisten-Häkchen (Phase 1) werden beim Schließen korrekt gespeichert

---

## 10. Offene Fragen (bitte vor Implementierung klären)

1. **Auth-Modus**: Soll Kollaboration nur funktionieren wenn Auth aktiviert ist, oder auch im Auth-losen Modus (single-password)?
2. **Checklist-Phase**: Soll Phase 2 (TaskList-Migration) Teil dieses Features sein oder separat behandelt werden?
3. **Hocuspocus-Port**: Port `1234` intern in Docker — soll er nach außen exposed werden (für Reverse-Proxy-Setups)?
4. **Max. gleichzeitige Bearbeiter**: Gibt es eine gewünschte Obergrenze?
