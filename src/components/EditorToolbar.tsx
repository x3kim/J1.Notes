'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Editor } from '@tiptap/react';
import {
  Bold, Italic, Underline, Strikethrough, Code, Code2,
  List, ListOrdered, Link2, Link2Off, AlignLeft, AlignCenter,
  AlignRight, AlignJustify, Highlighter, Type, Subscript, Superscript,
  RemoveFormatting, ChevronDown,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: Editor;
}

function ToolBtn({
  onClick, active, title, children,
}: {
  onClick: (e: React.MouseEvent) => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(e); }}
      className="p-1.5 rounded transition-colors text-sm flex items-center justify-center"
      title={title}
      style={active
        ? { backgroundColor: 'var(--theme-accent-muted)', color: 'var(--theme-accent)' }
        : { color: 'var(--theme-text-muted)' }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-hover)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
    >
      {children}
    </button>
  );
}

const TEXT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6b7280', '#1f2937', '#ffffff',
];

const HIGHLIGHT_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fde68a', '#fecaca', '#e9d5ff', '#fbcfe8',
];

export default function EditorToolbar({ editor }: EditorToolbarProps) {
  const { t } = useTranslation('notes');
  const [showHeadings, setShowHeadings] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const headingRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const linkRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (headingRef.current && !headingRef.current.contains(e.target as Node)) setShowHeadings(false);
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) setShowColorPicker(false);
      if (highlightRef.current && !highlightRef.current.contains(e.target as Node)) setShowHighlightPicker(false);
      if (linkRef.current && !linkRef.current.contains(e.target as Node)) setShowLinkInput(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const currentHeading = ([1, 2, 3, 4, 5] as const).find(l => editor.isActive('heading', { level: l }));
  const headingLabel = currentHeading ? `H${currentHeading}` : t('editor.paragraph', 'P');

  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (linkUrl) editor.chain().focus().setLink({ href: linkUrl }).run();
    setLinkUrl('');
    setShowLinkInput(false);
  };

  const dropdownStyle: React.CSSProperties = {
    backgroundColor: 'var(--theme-surface)',
    borderColor: 'var(--theme-border)',
    color: 'var(--theme-text)',
  };

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 px-2 py-1 border-b rounded-t-lg"
      style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-hover)' }}
    >
      {/* Heading dropdown */}
      <div ref={headingRef} className="relative">
        <button
          onMouseDown={e => { e.preventDefault(); setShowHeadings(!showHeadings); }}
          className="p-1.5 rounded transition-colors text-sm flex items-center justify-center gap-1 px-2 min-w-[44px] font-semibold text-xs"
          style={{ color: 'var(--theme-text-muted)' }}
          title={t('editor.heading', 'Heading')}
        >
          {headingLabel}
          <ChevronDown size={12} />
        </button>
        {showHeadings && (
          <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-[120] overflow-hidden w-28 border" style={dropdownStyle}>
            <button
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().setParagraph().run(); setShowHeadings(false); }}
              className="w-full text-left px-3 py-1.5 text-sm transition-colors"
              style={!currentHeading ? { backgroundColor: 'var(--theme-accent-muted)', color: 'var(--theme-accent)' } : { color: 'var(--theme-text)' }}
              onMouseEnter={e => { if (currentHeading) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-hover)'; }}
              onMouseLeave={e => { if (currentHeading) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              {t('editor.paragraph', 'Paragraph')}
            </button>
            {([1, 2, 3, 4, 5] as const).map(level => (
              <button
                key={level}
                onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level }).run(); setShowHeadings(false); }}
                className="w-full text-left px-3 py-1.5 font-semibold transition-colors"
                style={{
                  fontSize: `${1.1 - level * 0.1}rem`,
                  ...(editor.isActive('heading', { level })
                    ? { backgroundColor: 'var(--theme-accent-muted)', color: 'var(--theme-accent)' }
                    : { color: 'var(--theme-text)' }),
                }}
                onMouseEnter={e => { if (!editor.isActive('heading', { level })) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-hover)'; }}
                onMouseLeave={e => { if (!editor.isActive('heading', { level })) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                H{level}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--theme-border)' }} />

      <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)"><Bold size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)"><Italic size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)"><Underline size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough"><Strikethrough size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code"><Code size={15} /></ToolBtn>

      <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--theme-border)' }} />

      <ToolBtn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Subscript"><Subscript size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Superscript"><Superscript size={15} /></ToolBtn>

      <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--theme-border)' }} />

      {/* Text Color picker */}
      <div ref={colorRef} className="relative">
        <button
          onMouseDown={e => { e.preventDefault(); setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
          className="p-1.5 rounded transition-colors text-sm flex items-center justify-center gap-1"
          style={{ color: 'var(--theme-text-muted)' }}
          title={t('editor.textColor', 'Text color')}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Type size={15} />
          <div className="w-3 h-1 rounded-sm" style={{ backgroundColor: editor.getAttributes('textStyle').color || 'var(--theme-text-muted)' }} />
        </button>
        {showColorPicker && (
          <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-[120] p-2 flex flex-wrap gap-1 w-36 border" style={dropdownStyle}>
            <button
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
              className="w-5 h-5 rounded border flex items-center justify-center text-xs"
              style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-text-muted)' }}
              title="Reset color"
            >✕</button>
            {TEXT_COLORS.map(c => (
              <button key={c} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowColorPicker(false); }} className="w-5 h-5 rounded border border-gray-400 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        )}
      </div>

      {/* Highlight picker */}
      <div ref={highlightRef} className="relative">
        <button
          onMouseDown={e => { e.preventDefault(); setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
          className="p-1.5 rounded transition-colors text-sm flex items-center justify-center gap-1"
          style={editor.isActive('highlight')
            ? { backgroundColor: 'var(--theme-accent-muted)', color: 'var(--theme-accent)' }
            : { color: 'var(--theme-text-muted)' }}
          title={t('editor.highlight', 'Highlight')}
          onMouseEnter={e => { if (!editor.isActive('highlight')) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--theme-hover)'; }}
          onMouseLeave={e => { if (!editor.isActive('highlight')) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <Highlighter size={15} />
        </button>
        {showHighlightPicker && (
          <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-[120] p-2 flex flex-wrap gap-1 w-36 border" style={dropdownStyle}>
            <button
              onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetHighlight().run(); setShowHighlightPicker(false); }}
              className="w-5 h-5 rounded border flex items-center justify-center text-xs"
              style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-text-muted)' }}
              title="Remove highlight"
            >✕</button>
            {HIGHLIGHT_COLORS.map(c => (
              <button key={c} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setHighlight({ color: c }).run(); setShowHighlightPicker(false); }} className="w-5 h-5 rounded border border-gray-400 hover:scale-110 transition-transform" style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--theme-border)' }} />

      {/* Text Align */}
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Align left"><AlignLeft size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Align center"><AlignCenter size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Align right"><AlignRight size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="Justify"><AlignJustify size={15} /></ToolBtn>

      <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--theme-border)' }} />

      {/* Lists */}
      <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list"><List size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list"><ListOrdered size={15} /></ToolBtn>
      <ToolBtn onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive('codeBlock')} title="Code block"><Code2 size={15} /></ToolBtn>

      <div className="w-px h-5 mx-0.5" style={{ backgroundColor: 'var(--theme-border)' }} />

      {/* Link */}
      <div ref={linkRef} className="relative">
        {editor.isActive('link') ? (
          <ToolBtn onClick={() => editor.chain().focus().unsetLink().run()} active title="Remove link"><Link2Off size={15} /></ToolBtn>
        ) : (
          <ToolBtn onClick={() => { setShowLinkInput(!showLinkInput); setShowColorPicker(false); setShowHighlightPicker(false); }} active={showLinkInput} title="Add link"><Link2 size={15} /></ToolBtn>
        )}
        {showLinkInput && (
          <form
            onSubmit={handleLinkSubmit}
            className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-[120] p-2 flex gap-1 w-56 border"
            style={dropdownStyle}
            onMouseDown={e => e.stopPropagation()}
          >
            <input
              autoFocus
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-transparent text-sm outline-none border-b pb-0.5"
              style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border)' }}
            />
            <button type="submit" className="text-sm font-medium px-1" style={{ color: 'var(--theme-accent)' }}>OK</button>
          </form>
        )}
      </div>

      {/* Clear formatting */}
      <ToolBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title={t('editor.clearFormatting', 'Clear formatting')}>
        <RemoveFormatting size={15} />
      </ToolBtn>
    </div>
  );
}
