'use client';
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, RotateCcw, History, Pencil, ChevronDown, Users } from 'lucide-react';
import NoteActionBar from './NoteActionBar';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import { HocuspocusProvider } from '@hocuspocus/provider';
import * as Y from 'yjs';
import EditorToolbar from './EditorToolbar';
import dynamic from 'next/dynamic';

const DrawingModal = dynamic(() => import('./DrawingModal'), { ssr: false });

// ── Helpers ──────────────────────────────────────────────────────────────────

function getCollabUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:1234';
  const configured = process.env.NEXT_PUBLIC_COLLAB_URL;
  if (configured) return configured;
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:1234`;
}

function getOrCreateUserIdentity(): { name: string; color: string } {
  if (typeof window === 'undefined') return { name: 'Anonym', color: '#3b82f6' };
  try {
    const stored = localStorage.getItem('j1notes_collab_identity');
    if (stored) return JSON.parse(stored);
  } catch {}
  const names = ['Panda', 'Fuchs', 'Adler', 'Luchs', 'Bär', 'Wolf'];
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  const idx = Math.floor(Math.random() * names.length);
  const identity = { name: names[idx], color: colors[idx] };
  localStorage.setItem('j1notes_collab_identity', JSON.stringify(identity));
  return identity;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function checklistToTaskListHtml(items: { text: string; checked: boolean }[]): string {
  const lis = items
    .map(item => `<li data-type="taskItem" data-checked="${item.checked}"><p>${escapeHtml(item.text)}</p></li>`)
    .join('');
  return `<ul data-type="taskList">${lis || '<li data-type="taskItem" data-checked="false"><p></p></li>'}</ul>`;
}

function getNodeText(node: any): string {
  if (node.type === 'text') return node.text || '';
  return (node.content || []).map(getNodeText).join('');
}

function extractChecklistItems(editor: ReturnType<typeof useEditor>): { text: string; checked: boolean }[] {
  if (!editor) return [];
  const items: { text: string; checked: boolean }[] = [];
  const walk = (node: any) => {
    if (node.type === 'taskItem') {
      items.push({
        text: (node.content || []).map(getNodeText).join('').trim(),
        checked: node.attrs?.checked === true,
      });
    } else {
      (node.content || []).forEach(walk);
    }
  };
  (editor.getJSON().content || []).forEach(walk);
  return items;
}

function getInitialContent(note: any): string {
  if (note.checklist_items?.length > 0) {
    return checklistToTaskListHtml(note.checklist_items);
  }
  if (!note.content_text) return '';
  if (note.content_text.startsWith('<')) return note.content_text;
  return `<p>${note.content_text.replace(/\n/g, '</p><p>')}</p>`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditNoteModal({ note, availableLabels = [], onClose, onSave, onUpdate, onDelete, onDuplicate }: any) {
  const { t, i18n } = useTranslation(['notes', 'common']);
  const [title, setTitle] = useState(note.title || '');
  const [selectedColor, setSelectedColor] = useState(note.color || '');
  const [isListMode, setIsListMode] = useState(note.checklist_items?.length > 0);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(note.labels?.map((l: any) => l.id) || []);
  const [attachments, setAttachments] = useState<string[]>(note.attachments?.map((a: any) => a.url) || []);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [diffVersion, setDiffVersion] = useState<any | null>(null);
  const [selectedBgImage, setSelectedBgImage] = useState<string>(note.bg_image || '');
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [editingDrawingUrl, setEditingDrawingUrl] = useState<string | null>(null);
  const [reminderAt, setReminderAt] = useState<string>(
    note.reminder_at ? new Date(note.reminder_at).toISOString().slice(0, 16) : ''
  );
  const [restoreToast, setRestoreToast] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // ── Collaboration state ────────────────────────────────────────────────────
  const [hasSynced, setHasSynced] = useState(false);
  const [collabOffline, setCollabOffline] = useState(false);
  const [activeUsers, setActiveUsers] = useState<{ name: string; color: string }[]>([]);
  const userIdentity = useMemo(() => getOrCreateUserIdentity(), []);
  const initialContent = useMemo(() => getInitialContent(note), []);

  // Create Y.js doc + Hocuspocus provider once
  const [{ ydoc, provider }] = useState(() => {
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: getCollabUrl(),
      name: `note-${note.id}`,
      document: ydoc,
      onSynced: () => setHasSynced(true),
      onAwarenessChange: ({ states }: any) => {
        const users = (states as any[])
          .filter(s => s.user)
          .map(s => s.user as { name: string; color: string });
        setActiveUsers(users);
      },
    });
    return { ydoc, provider };
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      provider.destroy();
      ydoc.destroy();
    };
  }, []);

  // Set user identity in awareness
  useEffect(() => {
    provider.setAwarenessField('user', userIdentity);
  }, [userIdentity]);

  // Try to update identity with real user name from profile API
  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const name = data?.name || data?.username;
        if (name) {
          const updated = { ...userIdentity, name };
          localStorage.setItem('j1notes_collab_identity', JSON.stringify(updated));
          provider.setAwarenessField('user', updated);
        }
      })
      .catch(() => {});
  }, []);

  // Fallback: if Hocuspocus unreachable after 3s, use offline mode
  useEffect(() => {
    if (hasSynced) return;
    const t = setTimeout(() => {
      if (!hasSynced) {
        setCollabOffline(true);
        setHasSynced(true);
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [hasSynced]);

  const isTrash = note.deleted_at !== null;
  const isArchive = note.archived === true;

  // ── Tiptap editor ─────────────────────────────────────────────────────────
  const modalEditor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
      TaskList,
      TaskItem.configure({ nested: false }),
      Collaboration.configure({ document: ydoc }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor w-full bg-transparent p-4 outline-none min-h-[150px]',
      },
    },
    editable: !isTrash,
    immediatelyRender: false,
  });

  // Initialize editor content after Y.js sync (or fallback)
  useEffect(() => {
    if (!hasSynced || !modalEditor) return;
    const fragment = ydoc.getXmlFragment('default');
    if (fragment.length === 0 && initialContent) {
      modalEditor.commands.setContent(initialContent);
    } else if (collabOffline && initialContent) {
      modalEditor.commands.setContent(initialContent);
    }
  }, [hasSynced, modalEditor]);

  // ── Save logic ────────────────────────────────────────────────────────────
  const savingRef = useRef(false);

  const performSave = useCallback(async () => {
    if (isTrash || savingRef.current || !modalEditor) return;
    savingRef.current = true;
    try {
      const checklist_items = isListMode ? extractChecklistItems(modalEditor) : [];
      const content_text = isListMode ? null : modalEditor.getHTML();
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_text,
          color: selectedColor || null,
          bg_image: selectedBgImage || null,
          checklist_items,
          label_ids: selectedLabels,
          attachments,
          reminder_at: reminderAt || null,
        }),
      });
    } finally {
      savingRef.current = false;
    }
  }, [isTrash, modalEditor, isListMode, title, selectedColor, selectedBgImage, selectedLabels, attachments, reminderAt]);

  // Keep a ref to the latest performSave for debounced auto-save
  const performSaveRef = useRef(performSave);
  useEffect(() => { performSaveRef.current = performSave; }, [performSave]);

  // Debounced auto-save (2 s after last change)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const triggerAutoSave = useCallback(() => {
    if (isTrash) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => performSaveRef.current(), 2000);
  }, [isTrash]);

  // Wire auto-save to editor updates
  useEffect(() => {
    if (!modalEditor) return;
    const handler = () => triggerAutoSave();
    modalEditor.on('update', handler);
    return () => { modalEditor.off('update', handler); clearTimeout(autoSaveTimer.current); };
  }, [modalEditor, triggerAutoSave]);

  const handleSave = async () => {
    if (isTrash) { onClose(); return; }
    clearTimeout(autoSaveTimer.current);
    await performSave();
    onSave();
  };

  // ── List mode toggle ──────────────────────────────────────────────────────
  const toggleListMode = () => {
    if (!modalEditor) return;
    if (isListMode) {
      // TaskList → plain text
      const items = extractChecklistItems(modalEditor);
      const text = items.map(i => i.text).filter(t => t).join('\n');
      modalEditor.commands.setContent(
        text ? `<p>${text.replace(/\n/g, '</p><p>')}</p>` : ''
      );
      setIsListMode(false);
    } else {
      // Text → TaskList
      const text = modalEditor.getText();
      const lines = text.split('\n').filter(l => l.trim());
      modalEditor.commands.setContent(
        checklistToTaskListHtml(
          lines.length > 0
            ? lines.map(l => ({ text: l, checked: false }))
            : [{ text: '', checked: false }]
        )
      );
      setIsListMode(true);
    }
  };

  const addChecklistItem = () => {
    if (!modalEditor) return;
    modalEditor.chain().focus('end').run();
  };

  // ── Labels ────────────────────────────────────────────────────────────────
  const toggleLabel = (id: string) => {
    setSelectedLabels(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  // ── Version history ───────────────────────────────────────────────────────
  const fetchVersions = async () => {
    const res = await fetch(`/api/notes/${note.id}/versions`);
    if (res.ok) setVersions(await res.json());
    setShowVersions(true);
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

  const computeDiff = (oldText: string, newText: string) => {
    const oldLines = oldText.split('\n').filter(l => l.trim() !== '');
    const newLines = newText.split('\n').filter(l => l.trim() !== '');
    const result: { type: 'same' | 'add' | 'remove'; text: string }[] = [];
    let oi = 0; let ni = 0;
    while (oi < oldLines.length || ni < newLines.length) {
      const o = oldLines[oi]; const n = newLines[ni];
      if (oi >= oldLines.length) { result.push({ type: 'add', text: n }); ni++; }
      else if (ni >= newLines.length) { result.push({ type: 'remove', text: o }); oi++; }
      else if (o === n) { result.push({ type: 'same', text: o }); oi++; ni++; }
      else {
        const nextNewIdx = newLines.indexOf(o, ni);
        const nextOldIdx = oldLines.indexOf(n, oi);
        if (nextNewIdx !== -1 && (nextOldIdx === -1 || nextNewIdx <= nextOldIdx)) {
          result.push({ type: 'add', text: n }); ni++;
        } else {
          result.push({ type: 'remove', text: o }); oi++;
        }
      }
    }
    return result;
  };

  const getRelativeTime = (dateStr: string): string => {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHr / 24);
    if (diffSec < 60) return t('notes:versions.justNow');
    if (diffMin < 60) return t('notes:versions.minutesAgo', { count: diffMin });
    if (diffHr < 24) return t('notes:versions.hoursAgo', { count: diffHr });
    if (diffDays === 1) return t('notes:versions.yesterday');
    if (diffDays < 7) return t('notes:versions.daysAgo', { count: diffDays });
    return new Date(dateStr).toLocaleDateString(i18n.language);
  };

  const getVersionPreview = (snapshotJson: string): string => {
    try {
      const data = JSON.parse(snapshotJson);
      const text = data.content_text
        ? data.content_text.replace(/<[^>]*>/g, '').trim()
        : data.checklist_items?.map((i: any) => i.text).join(', ') || '';
      const preview = text.slice(0, 60);
      return preview ? (text.length > 60 ? preview + '…' : preview) : (data.title || t('notes:versions.noPreview'));
    } catch { return t('notes:versions.noPreview'); }
  };

  const getActionLabel = (userAction: string): string => {
    switch (userAction) {
      case 'restore': return t('notes:versions.actionRestore');
      case 'pre_restore': return t('notes:versions.actionPreRestore');
      case 'label_change': return t('notes:versions.actionLabelChange');
      default: return t('notes:versions.actionEdit');
    }
  };

  const restoreVersion = async (versionId: string) => {
    if (!confirm(t('notes:versions.confirmRestore'))) return;
    setRestoringId(versionId);
    try {
      const res = await fetch(`/api/notes/${note.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version_id: versionId }),
      });
      if (res.ok) {
        setRestoreToast(t('notes:versions.restored'));
        setTimeout(() => setRestoreToast(null), 3000);
        setShowVersions(false);
        onSave();
      } else {
        setRestoreToast(t('notes:versions.restoreError'));
        setTimeout(() => setRestoreToast(null), 3000);
      }
    } finally {
      setRestoringId(null);
    }
  };

  const handleExport = () => {
    if (!modalEditor) return;
    const plainContent = stripHtml(modalEditor.getHTML());
    const checklistMd = isListMode
      ? extractChecklistItems(modalEditor)
          .filter(i => i.text.trim())
          .map(i => `- [${i.checked ? 'x' : ' '}] ${i.text}`)
          .join('\n')
      : '';
    const attachmentsMd = attachments.length > 0
      ? '\n\n## Attachments\n' + attachments.map((url, i) => `![Attachment ${i + 1}](${url})`).join('\n')
      : '';
    const labelsMd = selectedLabels.length > 0
      ? `\n\n**Labels:** ${availableLabels.filter((l: any) => selectedLabels.includes(l.id)).map((l: any) => l.name).join(', ')}`
      : '';
    const content = `# ${title || 'Untitled'}\n\n${checklistMd || plainContent}${labelsMd}${attachmentsMd}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const isDrawingUrl = (url: string) => (url.split('/').pop() || '').startsWith('drawing-');

  const modalBgStyle: React.CSSProperties = {
    backgroundColor: selectedColor || (!selectedBgImage ? 'var(--theme-surface)' : undefined),
    ...(selectedBgImage
      ? (selectedBgImage.startsWith('/') || selectedBgImage.startsWith('http'))
        ? { backgroundImage: `url(${selectedBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundImage: selectedBgImage }
      : {}),
  };

  const otherUsers = activeUsers.filter(u => u.name !== userIdentity.name);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) handleSave(); }}
    >
      {/* Restore toast */}
      {restoreToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-xl shadow-xl text-sm font-medium text-white bg-gray-800 border border-gray-700 flex items-center gap-2 animate-fade-in">
          <RotateCcw size={15} />
          {restoreToast}
        </div>
      )}

      {/* Version history overlay */}
      {showVersions && (
        <div
          className="absolute inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          onClick={e => { e.stopPropagation(); setShowVersions(false); setDiffVersion(null); }}
        >
          <div
            className="p-6 rounded-xl w-full max-w-2xl shadow-2xl border flex flex-col"
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2"><History size={20} /> {t('notes:versions.title')}</h2>
              {!diffVersion && (
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text-muted)' }}>
                  {versions.length} {t('notes:versions.entries')}
                </span>
              )}
            </div>
            {diffVersion ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>{new Date(diffVersion.created_at).toLocaleString(i18n.language)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => restoreVersion(diffVersion.id)}
                      className="px-3 py-1 rounded text-sm font-medium text-white"
                      style={{ backgroundColor: '#3b82f6' }}
                    >
                      {t('notes:versions.restore')}
                    </button>
                    <button
                      onClick={() => setDiffVersion(null)}
                      className="px-3 py-1 rounded text-sm"
                      style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
                    >
                      ← {t('common:actions.back')}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto rounded-lg font-mono text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                  {(() => {
                    try {
                      const snap = JSON.parse(diffVersion.snapshot);
                      const oldText = stripHtml(snap.content_text || snap.title || '');
                      const newText = stripHtml(modalEditor?.getHTML() || note.content_text || note.title || '');
                      const diff = computeDiff(oldText, newText);
                      if (diff.length === 0) return <p className="p-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>—</p>;
                      return diff.map((line, i) => (
                        <div
                          key={i}
                          className="px-3 py-0.5 leading-5 whitespace-pre-wrap break-all"
                          style={
                            line.type === 'add' ? { backgroundColor: 'rgba(34,197,94,0.15)', color: '#86efac' }
                            : line.type === 'remove' ? { backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5' }
                            : { color: 'var(--theme-text-muted)' }
                          }
                        >
                          <span className="select-none mr-2 opacity-60">{line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}</span>
                          {line.text}
                        </div>
                      ));
                    } catch {
                      return <p className="p-4 text-center" style={{ color: 'var(--theme-text-muted)' }}>—</p>;
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                {versions.length === 0 ? (
                  <p className="text-center py-8" style={{ color: 'var(--theme-text-muted)' }}>{t('notes:versions.none')}</p>
                ) : versions.map((v: any, idx: number) => (
                  <div
                    key={v.id}
                    className="p-4 rounded-lg border transition-colors"
                    style={{ backgroundColor: 'var(--theme-hover)', borderColor: 'var(--theme-border)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                          {getRelativeTime(v.created_at)}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: v.user_action === 'restore' || v.user_action === 'pre_restore'
                              ? 'rgba(59,130,246,0.15)'
                              : 'rgba(107,114,128,0.15)',
                            color: v.user_action === 'restore' || v.user_action === 'pre_restore'
                              ? '#60a5fa'
                              : 'var(--theme-text-muted)'
                          }}
                        >
                          {getActionLabel(v.user_action)}
                        </span>
                      </div>
                      {idx === 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">
                          {t('notes:versions.latest')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mb-2" style={{ color: 'var(--theme-text-subtle)' }}>
                      {new Date(v.created_at).toLocaleString(i18n.language)}
                      {v.char_delta > 0 && (
                        <span className="ml-2" style={{ color: 'var(--theme-text-muted)' }}>
                          ±{v.char_delta} {t('notes:versions.chars')}
                        </span>
                      )}
                    </div>
                    <div className="text-sm italic mb-3 leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>
                      {getVersionPreview(v.snapshot)}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDiffVersion(v)}
                        className="px-3 py-1.5 rounded-lg text-sm transition-colors"
                        style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
                      >
                        {t('notes:versions.viewDiff')}
                      </button>
                      {v.user_action !== 'restore' && (
                        <button
                          onClick={() => restoreVersion(v.id)}
                          disabled={restoringId === v.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)' }}
                          onMouseEnter={e => { if (restoringId !== v.id) (e.currentTarget.style.backgroundColor = 'var(--theme-bg-secondary)'); }}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--theme-bg)')}
                        >
                          <RotateCcw size={13} />
                          {restoringId === v.id ? t('notes:versions.restoring') : t('notes:versions.restore')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => { setShowVersions(false); setDiffVersion(null); }}
              className="mt-4 w-full py-2 rounded-lg transition-colors text-sm"
              style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-bg-tertiary)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            >
              {t('common:actions.close')}
            </button>
          </div>
        </div>
      )}

      {/* Main modal */}
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl shadow-2xl border flex flex-col relative"
        style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)', ...modalBgStyle }}
      >
        {/* Attachment images */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap rounded-t-xl overflow-hidden">
            {attachments.map((url, i) => (
              <div key={i} className="relative w-full bg-black/10 group/att">
                <img src={url} alt="" className="w-full h-auto block" />
                {!isTrash && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    {isDrawingUrl(url) && (
                      <button
                        onClick={() => setEditingDrawingUrl(url)}
                        className="p-1 bg-black/50 hover:bg-black text-white rounded-full"
                        title="Zeichnung bearbeiten"
                      >
                        <Pencil size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        fetch(`/api/upload?file=${encodeURIComponent(url)}`, { method: 'DELETE' });
                        setAttachments(prev => prev.filter((_, idx) => idx !== i));
                      }}
                      className="p-1 bg-black/50 hover:bg-black text-white rounded-full"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Presence bar — shown when other users are active */}
        {otherUsers.length > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-1.5 border-b text-xs"
            style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
          >
            <Users size={12} />
            <div className="flex -space-x-1">
              {otherUsers.slice(0, 5).map((u, i) => (
                <div
                  key={i}
                  title={u.name}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2"
                  style={{ backgroundColor: u.color, borderColor: 'var(--theme-surface)' }}
                >
                  {(u.name || '?')[0].toUpperCase()}
                </div>
              ))}
            </div>
            <span>
              {otherUsers.length === 1
                ? `${otherUsers[0].name} bearbeitet gerade mit`
                : `${otherUsers.length} Nutzer bearbeiten gerade mit`}
            </span>
            <div className="ml-auto w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        )}

        {/* Title */}
        <input
          disabled={isTrash}
          type="text"
          placeholder={t('notes:placeholders.title')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent p-4 pb-2 outline-none font-semibold text-xl placeholder-gray-500 rounded-t-xl"
          style={{ color: 'var(--theme-text)' }}
        />

        {/* Loading state while Y.js syncs */}
        {!hasSynced ? (
          <div className="p-4 min-h-[120px] flex items-center justify-center">
            <span className="text-sm animate-pulse" style={{ color: 'var(--theme-text-muted)' }}>
              Verbinde…
            </span>
          </div>
        ) : (
          <>
            {/* Editor toolbar (hidden in list mode) */}
            {modalEditor && !isTrash && !isListMode && (
              <EditorToolbar editor={modalEditor} />
            )}

            {/* Tiptap editor — handles both rich text AND TaskList */}
            <EditorContent editor={modalEditor} />

            {/* "Add item" button in list mode */}
            {isListMode && !isTrash && (
              <div className="px-4 pb-2">
                <button
                  onClick={addChecklistItem}
                  className="flex items-center gap-2 text-sm px-1 py-1"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <Plus size={16} /> {t('notes:placeholders.addListItem')}
                </button>
              </div>
            )}
          </>
        )}

        {/* Label chips */}
        {selectedLabels.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {selectedLabels.map(id => {
              const l = availableLabels.find((al: any) => al.id === id);
              return l ? (
                <span
                  key={id}
                  className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
                >
                  {l.name} <X size={12} className="cursor-pointer" onClick={() => toggleLabel(id)} />
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Status bar */}
        <div className="px-4 py-2 text-xs flex justify-center items-center gap-2" style={{ color: 'var(--theme-text-subtle)' }}>
          {isTrash ? t('notes:statuses.inTrash') : isArchive ? t('notes:statuses.inArchive') : ''}
          {' '}{t('notes:statuses.editedAt', { date: new Date(note.updated_at).toLocaleString(i18n.language) })}
          {!isTrash && (
            <button onClick={fetchVersions} className="hover:text-blue-400 underline ml-2" title={t('notes:tooltips.viewHistory')}>
              {t('notes:statuses.history')}
            </button>
          )}
          {collabOffline && (
            <span className="ml-2 text-yellow-500/70" title="Kollaborations-Server nicht erreichbar">
              ● Offline
            </span>
          )}
        </div>

        {/* Action bar */}
        <div className="flex justify-between items-center p-3 rounded-b-xl">
          <div className="flex gap-1 relative">
            {isTrash ? (
              <>
                <ModalIconBtn onClick={() => { onDelete(note.id, true); onClose(); }} className="text-red-500"><Trash2 size={18} /></ModalIconBtn>
                <ModalIconBtn onClick={() => { onUpdate(note.id, { deleted_at: null }); onClose(); }} className="text-blue-500"><RotateCcw size={18} /></ModalIconBtn>
              </>
            ) : (
              <NoteActionBar
                selectedColor={selectedColor}
                selectedBgImage={selectedBgImage}
                onColorChange={setSelectedColor}
                onBgImageChange={setSelectedBgImage}
                isListMode={isListMode}
                onToggleListMode={toggleListMode}
                availableLabels={availableLabels}
                selectedLabels={selectedLabels}
                onToggleLabel={toggleLabel}
                onAttachImage={async (file) => {
                  const formData = new FormData();
                  formData.append('file', file);
                  const res = await fetch('/api/upload', { method: 'POST', body: formData });
                  if (res.ok) { const { url } = await res.json(); setAttachments(prev => [...prev, url]); }
                }}
                onDraw={() => setShowDrawingModal(true)}
                reminderAt={reminderAt}
                onReminderChange={setReminderAt}
                onDuplicate={() => { onDuplicate(note); onClose(); }}
                onArchive={() => { onUpdate(note.id, { archived: !note.archived, pinned: false }); onClose(); }}
                onExport={handleExport}
              />
            )}
          </div>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded font-medium transition-colors"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>

      {showDrawingModal && (
        <DrawingModal
          onClose={() => setShowDrawingModal(false)}
          onSave={(url: string) => { setAttachments(prev => [...prev, url]); setShowDrawingModal(false); }}
        />
      )}

      {editingDrawingUrl && (
        <DrawingModal
          initialImageUrl={editingDrawingUrl}
          onClose={() => setEditingDrawingUrl(null)}
          onSave={(newUrl: string, replacingUrl?: string) => {
            if (replacingUrl) {
              setAttachments(prev => prev.map(u => (u === replacingUrl ? newUrl : u)));
            } else {
              setAttachments(prev => [...prev, newUrl]);
            }
            setEditingDrawingUrl(null);
          }}
        />
      )}
    </div>
  );
}

function ModalIconBtn({ onClick, children, title, className = '' }: { onClick: () => void; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-full transition-colors ${className}`}
      style={{ color: className.includes('text-') ? undefined : 'var(--theme-text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  );
}
