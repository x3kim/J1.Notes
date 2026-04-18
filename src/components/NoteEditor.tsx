'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, GripVertical, ListTodo, Image as ImageIcon, Pencil } from 'lucide-react';
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

export default function NoteEditor({ onNoteAdded, availableLabels = [] }: any) {
  const { t } = useTranslation(['notes', 'common']);
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [contentText, setContentText] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [bgImage, setBgImage] = useState('');
  const [isListMode, setIsListMode] = useState(false);
  const [listItems, setListItems] = useState([{ text: '', checked: false }]);

  const [attachments, setAttachments] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [dragListIdx, setDragListIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
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
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor w-full bg-transparent p-4 outline-none placeholder-gray-500',
      },
    },
    onUpdate: ({ editor }) => {
      setContentText(editor.getHTML());
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
  }, [isExpanded, title, contentText, listItems, attachments, selectedLabels, selectedColor, bgImage, isListMode]);

  const toggleListMode = () => {
    if (isListMode) {
      const text = listItems.map(i => i.text).filter(t => t.trim() !== '').join('\n');
      setContentText(text);
      setListItems([{ text: '', checked: false }]);
      const htmlContent = text ? `<p>${text.replace(/\n/g, '</p><p>')}</p>` : '';
      editor?.commands.setContent(htmlContent);
    } else {
      const plainText = editor?.getText() || '';
      const lines = plainText.split('\n').filter(t => t.trim() !== '');
      if (lines.length > 0) setListItems(lines.map(line => ({ text: line, checked: false })));
      setContentText('');
    }
    setIsListMode(!isListMode);
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
    if (selectedLabels.includes(id)) setSelectedLabels(selectedLabels.filter(l => l !== id));
    else setSelectedLabels([...selectedLabels, id]);
  };

  const handleSave = async () => {
    const hasText = (editor?.getText() || '').trim().length > 0;
    const hasListItems = listItems.some(item => item.text.trim().length > 0);
    if (!title.trim() && !hasText && (!isListMode || !hasListItems) && attachments.length === 0) { resetEditor(); return; }

    const cleanListItems = isListMode ? listItems.filter(i => i.text.trim() !== '') : [];
    await fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, content_text: isListMode ? null : contentText, color: selectedColor || null, bg_image: bgImage || null,
        checklist_items: cleanListItems, attachments, label_ids: selectedLabels
      }),
    });

    resetEditor();
    onNoteAdded();
  };

  const resetEditor = () => {
    setTitle(''); setContentText(''); setListItems([{ text: '', checked: false }]);
    setSelectedColor(''); setBgImage(''); setIsExpanded(false);
    setIsListMode(false); setAttachments([]); setSelectedLabels([]);
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

        {!isListMode ? (
          <div onClick={() => setIsExpanded(true)}>
            {isExpanded ? (
              <>
                {editor && <EditorToolbar editor={editor} />}
                <EditorContent editor={editor} />
              </>
            ) : (
              <div
                className="w-full bg-transparent p-4 cursor-text text-sm flex items-center justify-between"
                style={{ color: 'var(--theme-text-muted)' }}
                onClick={() => setIsExpanded(true)}
              >
                <span>{t('notes:placeholders.takeANote')}</span>
                <div className="flex items-center gap-1">
                  <EditorIconBtn onClick={e => { e.stopPropagation(); setIsExpanded(true); setIsListMode(true); }} title={t('notes:tooltips.newList')}>
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
        ) : (
          <div className="p-4 space-y-1 max-h-64 overflow-y-auto">
            {listItems.map((item, index) => (
              <div
                key={index}
                draggable
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
                <GripVertical size={14} className="opacity-0 group-hover:opacity-100 cursor-grab shrink-0" style={{ color: 'var(--theme-text-muted)' }} />
                <input type="checkbox" disabled className="w-4 h-4 opacity-50 shrink-0" />
                <input
                  type="text"
                  autoFocus={index === listItems.length - 1}
                  placeholder={t('notes:placeholders.listItem')}
                  value={item.text}
                  onChange={e => { const n = [...listItems]; n[index].text = e.target.value; setListItems(n); }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setListItems([...listItems, { text: '', checked: false }]); } }}
                  className="flex-1 bg-transparent outline-none placeholder-gray-500 py-1"
                  style={{ color: 'var(--theme-text)' }}
                />
                <button
                  onClick={() => setListItems(listItems.filter((_, i) => i !== index))}
                  className="opacity-0 group-hover:opacity-100 shrink-0"
                  style={{ color: 'var(--theme-text-muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setListItems([...listItems, { text: '', checked: false }])}
              className="flex items-center gap-2 text-sm mt-2 px-1"
              style={{ color: 'var(--theme-text-muted)' }}
            >
              <Plus size={16} /> {t('notes:placeholders.addListItem')}
            </button>
          </div>
        )}

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
