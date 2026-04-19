'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, ListTodo, Image as ImageIcon, Pencil } from 'lucide-react';
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
import EditorToolbar from './EditorToolbar';
import dynamic from 'next/dynamic';

const DrawingModal = dynamic(() => import('./DrawingModal'), { ssr: false });

// ── Helpers (same as in EditNoteModal) ───────────────────────────────────────

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

// ── Component ─────────────────────────────────────────────────────────────────

export default function NoteEditor({ onNoteAdded, availableLabels = [] }: any) {
  const { t } = useTranslation(['notes', 'common']);
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [isListMode, setIsListMode] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showDrawingModal, setShowDrawingModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
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
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor w-full bg-transparent p-4 outline-none placeholder-gray-500',
      },
    },
    immediatelyRender: false,
  });

  // Outside-click collapses the expanded editor by invoking save
  useEffect(() => {
    if (!isExpanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleSave();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded, title, attachments, selectedLabels, selectedColor, bgImage, isListMode]);

  const toggleListMode = () => {
    if (!editor) return;
    if (isListMode) {
      // TaskList → plain text
      const items = extractChecklistItems(editor);
      const text = items.map(i => i.text).filter(t => t).join('\n');
      editor.commands.setContent(
        text ? `<p>${text.replace(/\n/g, '</p><p>')}</p>` : ''
      );
      setIsListMode(false);
    } else {
      // Text → TaskList
      const text = editor.getText();
      const lines = text.split('\n').filter(l => l.trim());
      editor.commands.setContent(
        checklistToTaskListHtml(
          lines.length > 0
            ? lines.map(l => ({ text: l, checked: false }))
            : [{ text: '', checked: false }]
        )
      );
      setIsListMode(true);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExpanded(true);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const { url } = await res.json();
      setAttachments([...attachments, url]);
    }
  };

  const toggleLabel = (id: string) => {
    setSelectedLabels(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const hasText = (editor?.getText() || '').trim().length > 0;
    if (!title.trim() && !hasText && attachments.length === 0) {
      resetEditor();
      return;
    }

    const checklist_items = isListMode && editor ? extractChecklistItems(editor) : [];
    const content_text = isListMode ? null : (editor?.getHTML() || null);

    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content_text,
          color: selectedColor || null,
          bg_image: bgImage || null,
          checklist_items,
          attachments,
          label_ids: selectedLabels,
        }),
      });
      if (!res.ok) throw new Error('save failed');
      resetEditor();
      onNoteAdded();
    } catch {
      // Speichern fehlgeschlagen — Inhalt bleibt erhalten
    }
  };

  const resetEditor = () => {
    setTitle('');
    setSelectedColor('');
    setBgImage('');
    setIsExpanded(false);
    setIsListMode(false);
    setAttachments([]);
    setSelectedLabels([]);
    editor?.commands.setContent('');
  };

  return (
    <div ref={containerRef} className="max-w-2xl mx-auto mb-8 relative">
      <div
        className="border rounded-xl shadow-lg transition-colors duration-200"
        style={{
          borderColor: 'var(--theme-border)',
          backgroundColor: selectedColor || (!bgImage ? 'var(--theme-surface)' : undefined),
          backgroundImage: bgImage
            ? (bgImage.startsWith('/') || bgImage.startsWith('http')) ? `url(${bgImage})` : bgImage
            : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap max-h-64 overflow-y-auto rounded-t-xl">
            {attachments.map((url, i) => (
              <div key={i} className="relative w-full h-48 bg-black/10">
                <img src={url} alt="Upload" className="w-full h-full object-contain" />
                <button
                  onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                  className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black text-white rounded-full z-10"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {(isExpanded || isListMode) && (
          <input
            type="text"
            placeholder={t('notes:placeholders.title')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent p-4 pb-2 outline-none font-semibold text-lg placeholder-gray-500 rounded-t-xl"
            style={{ color: 'var(--theme-text)' }}
          />
        )}

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />

        <div onClick={() => setIsExpanded(true)}>
          {isExpanded || isListMode ? (
            <>
              {editor && !isListMode && <EditorToolbar editor={editor} />}
              <EditorContent editor={editor} />
              {isListMode && (
                <div className="px-4 pb-2">
                  <button
                    onClick={() => editor?.chain().focus('end').run()}
                    className="flex items-center gap-2 text-sm px-1 py-1"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <Plus size={16} /> {t('notes:placeholders.addListItem')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div
              className="w-full bg-transparent p-4 cursor-text text-sm flex items-center justify-between"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <span>{t('notes:placeholders.takeANote')}</span>
              <div className="flex items-center gap-1">
                <EditorIconBtn
                  onClick={e => { e.stopPropagation(); setIsExpanded(true); toggleListMode(); }}
                  title={t('notes:tooltips.newList')}
                >
                  <ListTodo size={18} />
                </EditorIconBtn>
                <EditorIconBtn onClick={e => { e.stopPropagation(); setShowDrawingModal(true); }} title={t('notes:tooltips.newNoteWithDrawing')}>
                  <Pencil size={18} />
                </EditorIconBtn>
                <EditorIconBtn onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} title={t('notes:tooltips.newNoteWithImage')}>
                  <ImageIcon size={18} />
                </EditorIconBtn>
              </div>
            </div>
          )}
        </div>

        {selectedLabels.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {selectedLabels.map(id => {
              const l = availableLabels.find((al: any) => al.id === id);
              return l ? (
                <span
                  key={id}
                  className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text-muted)' }}
                >
                  {l.name} <X size={12} className="cursor-pointer" onClick={() => toggleLabel(id)} />
                </span>
              ) : null;
            })}
          </div>
        )}

        {(isExpanded || isListMode) && (
          <div className="flex justify-between items-center p-2">
            <NoteActionBar
              selectedColor={selectedColor}
              selectedBgImage={bgImage}
              onColorChange={setSelectedColor}
              onBgImageChange={setBgImage}
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
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded font-medium transition-colors"
              style={{ color: 'var(--theme-text-muted)' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              {t('common:actions.close')}
            </button>
          </div>
        )}
      </div>

      {showDrawingModal && (
        <DrawingModal
          onClose={() => setShowDrawingModal(false)}
          onSave={(imageUrl: string) => {
            setAttachments(prev => [...prev, imageUrl]);
            setShowDrawingModal(false);
            setIsExpanded(true);
          }}
        />
      )}
    </div>
  );
}

function EditorIconBtn({ onClick, children, title }: { onClick: React.MouseEventHandler | (() => void); children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick as React.MouseEventHandler}
      title={title}
      className="p-2 rounded-full transition-colors"
      style={{ color: 'var(--theme-text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  );
}
