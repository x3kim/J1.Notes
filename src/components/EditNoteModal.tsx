'use client';
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, RotateCcw, History, GripVertical, Pencil } from 'lucide-react';
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
import EditorToolbar from './EditorToolbar';
import dynamic from 'next/dynamic';

const DrawingModal = dynamic(() => import('./DrawingModal'), { ssr: false });

export default function EditNoteModal({ note, availableLabels = [], onClose, onSave, onUpdate, onDelete, onDuplicate }: any) {
  const { t, i18n } = useTranslation(['notes', 'common']);
  const [title, setTitle] = useState(note.title || '');
  const [contentText, setContentText] = useState(note.content_text || '');
  const [selectedColor, setSelectedColor] = useState(note.color || '');

  const [isListMode, setIsListMode] = useState(note.checklist_items?.length > 0);
  const [listItems, setListItems] = useState<any[]>(note.checklist_items?.length > 0 ? note.checklist_items : [{ text: '', checked: false }]);
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
  const [dragListIdx, setDragListIdx] = useState<number | null>(null);

  const isTrash = note.deleted_at !== null;
  const isArchive = note.archived === true;

  const isDrawingUrl = (url: string) => {
    const filename = url.split('/').pop() || '';
    return filename.startsWith('drawing-');
  };

  const modalEditor = useEditor({
    extensions: [
      StarterKit.configure({
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      Subscript,
      Superscript,
    ],
    content: note.content_text && note.content_text.startsWith('<')
      ? note.content_text
      : (note.content_text ? `<p>${note.content_text.replace(/\n/g, '</p><p>')}</p>` : ''),
    editorProps: {
      attributes: {
        class: 'tiptap-editor w-full bg-transparent p-4 outline-none min-h-[150px]',
      },
    },
    onUpdate: ({ editor }) => setContentText(editor.getHTML()),
    editable: !isTrash,
    immediatelyRender: false,
  });


  const [restoreToast, setRestoreToast] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

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

  const handleExport = () => {
    const plainContent = contentText ? stripHtml(contentText) : '';
    const checklistMd = isListMode ? listItems.filter(i => i.text.trim()).map(i => `- [${i.checked ? 'x' : ' '}] ${i.text}`).join('\n') : '';
    const attachmentsMd = attachments.length > 0 ? '\n\n## Attachments\n' + attachments.map((url, i) => `![Attachment ${i + 1}](${url})`).join('\n') : '';
    const labelsMd = selectedLabels.length > 0 ? `\n\n**Labels:** ${availableLabels.filter((l: any) => selectedLabels.includes(l.id)).map((l: any) => l.name).join(', ')}` : '';
    const content = `# ${title || 'Untitled'}\n\n${checklistMd || plainContent}${labelsMd}${attachmentsMd}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'note').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
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

  const toggleListMode = () => {
    if (isListMode) {
      const text = listItems.map(i => i.text).filter(t => t.trim() !== '').join('\n');
      setContentText(text);
      setListItems([{ text: '', checked: false }]);
      const htmlContent = text ? `<p>${text.replace(/\n/g, '</p><p>')}</p>` : '';
      modalEditor?.commands.setContent(htmlContent);
    } else {
      const plainText = modalEditor?.getText() || '';
      const lines = plainText.split('\n').filter((t: string) => t.trim() !== '');
      if (lines.length > 0) setListItems(lines.map((line: string) => ({ text: line, checked: false })));
      setContentText('');
    }
    setIsListMode(!isListMode);
  };

  const toggleLabel = (id: string) => {
    if (selectedLabels.includes(id)) setSelectedLabels(selectedLabels.filter(l => l !== id));
    else setSelectedLabels([...selectedLabels, id]);
  };

  const savingRef = useRef(false);
  const handleSave = async () => {
    if (isTrash) { onClose(); return; }
    // Guard against double-save from rapid overlay clicks / close button
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      const cleanListItems = isListMode ? listItems.filter(i => i.text.trim() !== '') : [];
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content_text: isListMode ? null : contentText, color: selectedColor || null, bg_image: selectedBgImage || null, checklist_items: cleanListItems, label_ids: selectedLabels, attachments, reminder_at: reminderAt || null }),
      });
      onSave();
    } finally {
      savingRef.current = false;
    }
  };

  const modalBgStyle: React.CSSProperties = {
    backgroundColor: selectedColor || (!selectedBgImage ? 'var(--theme-surface)' : undefined),
    ...(selectedBgImage
      ? (selectedBgImage.startsWith('/') || selectedBgImage.startsWith('http'))
        ? { backgroundImage: `url(${selectedBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { backgroundImage: selectedBgImage }
      : {}),
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) handleSave(); }}>

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
                      const newText = stripHtml(note.content_text || note.title || '');
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
                  {/* Header row: time + action badge */}
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
                  {/* Absolute timestamp */}
                  <div className="text-xs mb-2" style={{ color: 'var(--theme-text-subtle)' }}>
                    {new Date(v.created_at).toLocaleString(i18n.language)}
                    {v.char_delta > 0 && (
                      <span className="ml-2" style={{ color: 'var(--theme-text-muted)' }}>
                        ±{v.char_delta} {t('notes:versions.chars')}
                      </span>
                    )}
                  </div>
                  {/* Content preview */}
                  <div className="text-sm italic mb-3 leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>
                    {getVersionPreview(v.snapshot)}
                  </div>
                  {/* Action buttons */}
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

        <input
          disabled={isTrash}
          type="text"
          placeholder={t('notes:placeholders.title')}
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent p-4 pb-2 outline-none font-semibold text-xl placeholder-gray-500 rounded-t-xl"
          style={{ color: 'var(--theme-text)' }}
        />

        {!isListMode ? (
          <>
            {modalEditor && !isTrash && <EditorToolbar editor={modalEditor} />}
            <EditorContent editor={modalEditor} />
          </>
        ) : (
          <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto">
            {listItems.map((item, index) => (
              <div
                key={index}
                draggable={!isTrash}
                onDragStart={() => setDragListIdx(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (dragListIdx === null || dragListIdx === index) return;
                  const next = [...listItems];
                  const [moved] = next.splice(dragListIdx, 1);
                  next.splice(index, 0, moved);
                  setListItems(next);
                  setDragListIdx(null);
                }}
                className={`flex items-center gap-2 group rounded-lg px-1 transition-colors ${dragListIdx === index ? 'opacity-40' : ''}`}
                onMouseEnter={e => { if (dragListIdx !== index) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                {!isTrash && (
                  <GripVertical size={14} className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                )}
                <input
                  disabled={isTrash}
                  type="checkbox"
                  checked={item.checked}
                  onChange={e => { const newI = [...listItems]; newI[index].checked = e.target.checked; setListItems(newI); }}
                  className="w-4 h-4 cursor-pointer shrink-0"
                />
                <input
                  disabled={isTrash}
                  type="text"
                  value={item.text}
                  onChange={e => { const newI = [...listItems]; newI[index].text = e.target.value; setListItems(newI); }}
                  className={`flex-1 bg-transparent outline-none placeholder-gray-500 py-1 ${item.checked ? 'line-through opacity-50' : ''}`}
                  style={{ color: 'var(--theme-text)' }}
                />
                {!isTrash && (
                  <button
                    onClick={() => setListItems(listItems.filter((_, i) => i !== index))}
                    className="opacity-0 group-hover:opacity-100 shrink-0"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {!isTrash && (
              <button
                onClick={() => setListItems([...listItems, { text: '', checked: false }])}
                className="flex items-center gap-2 text-sm mt-2 px-1"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                <Plus size={16} /> {t('notes:placeholders.addListItem')}
              </button>
            )}
          </div>
        )}

        {selectedLabels.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {selectedLabels.map(id => {
              const l = availableLabels.find((al: any) => al.id === id);
              return l ? (
                <span key={id} className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}>
                  {l.name} <X size={12} className="cursor-pointer" onClick={() => toggleLabel(id)} />
                </span>
              ) : null;
            })}
          </div>
        )}

        <div className="px-4 py-2 text-xs flex justify-center items-center gap-2" style={{ color: 'var(--theme-text-subtle)' }}>
          {isTrash ? t('notes:statuses.inTrash') : isArchive ? t('notes:statuses.inArchive') : ''}
          {' '}{t('notes:statuses.editedAt', { date: new Date(note.updated_at).toLocaleString(i18n.language) })}
          {!isTrash && (
            <button onClick={fetchVersions} className="hover:text-blue-400 underline ml-2" title={t('notes:tooltips.viewHistory')}>
              {t('notes:statuses.history')}
            </button>
          )}
        </div>

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
