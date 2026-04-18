'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Palette, ListTodo, Type, Tag, Image as ImageIcon, Pencil, Bell,
  Copy, Archive, Download, X, Plus, MoreHorizontal,
} from 'lucide-react';

const COLORS = ['#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'];
const DARK_COLORS = ['#5c2b29', '#614a19', '#635d19', '#345920', '#16504b', '#2d555e', '#1e3a5f', '#42275e', '#5b2245', '#442f19', '#3c3f43'];
const BG_PATTERNS = [
  'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
  'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2020/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z\' fill=\'%239C92AC\' fill-opacity=\'0.05\'/%3E%3C/svg%3E")',
  'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'20\' viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 19h100v1H0v-1z\' fill=\'%239C92AC\' fill-opacity=\'0.2\'/%3E%3C/svg%3E")',
];
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
];

export interface NoteActionBarProps {
  /** Currently selected background color (hex). Pass '' for none. */
  selectedColor: string;
  /** Currently selected background image (url or data-uri). Pass '' for none. */
  selectedBgImage: string;
  /** Called when the user picks a color or image. */
  onColorChange: (color: string) => void;
  onBgImageChange: (image: string) => void;

  /** Whether the note is in list/checklist mode */
  isListMode: boolean;
  /** Toggle between text and list mode */
  onToggleListMode: () => void;

  /** Available labels for the label picker */
  availableLabels: { id: string; name: string }[];
  /** Currently selected label ids */
  selectedLabels: string[];
  /** Toggle a label by id */
  onToggleLabel: (id: string) => void;

  /** Called when user picks an image attachment file */
  onAttachImage?: (file: File) => void;

  /** Called when the draw button is clicked */
  onDraw?: () => void;

  /** Reminder ISO string ('' if none set) */
  reminderAt?: string;
  onReminderChange?: (value: string) => void;

  /** Optional: Duplicate */
  onDuplicate?: () => void;
  /** Optional: Archive/Unarchive */
  onArchive?: () => void;
  /** Optional: Export */
  onExport?: () => void;

  /** Icon size — defaults to 18 */
  iconSize?: number;

  /**
   * Compact mode: when true the bar shows only the 3 primary icons
   * (palette, labels, attach) and a "..." overflow button for the rest.
   */
  compact?: boolean;

  /** Extra wrapper class */
  className?: string;
}

export default function NoteActionBar({
  selectedColor,
  selectedBgImage,
  onColorChange,
  onBgImageChange,
  isListMode,
  onToggleListMode,
  availableLabels,
  selectedLabels,
  onToggleLabel,
  onAttachImage,
  onDraw,
  reminderAt = '',
  onReminderChange,
  onDuplicate,
  onArchive,
  onExport,
  iconSize = 18,
  compact = false,
  className = '',
}: NoteActionBarProps) {
  const { t } = useTranslation(['notes', 'common']);

  const [showPalette, setShowPalette] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const reminderRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // ── Outside-click: close any open panel when clicking outside ────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (paletteRef.current && !paletteRef.current.contains(target)) setShowPalette(false);
      if (labelRef.current && !labelRef.current.contains(target)) setShowLabels(false);
      if (reminderRef.current && !reminderRef.current.contains(target)) setShowReminder(false);
      if (moreRef.current && !moreRef.current.contains(target)) setShowMore(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAttachFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachImage) onAttachImage(file);
    e.target.value = '';
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: formData });
    if (res.ok) {
      const { url } = await res.json();
      onBgImageChange(url);
      onColorChange('');
    }
    e.target.value = '';
  };

  // ── Icon button helper ───────────────────────────────────────────────────
  const Btn = ({
    onClick,
    title,
    children,
    active = false,
  }: {
    onClick: React.MouseEventHandler;
    title?: string;
    children: React.ReactNode;
    active?: boolean;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={`p-2 rounded-full transition-colors ${active ? 'text-yellow-500' : ''}`}
      style={{ color: active ? undefined : 'var(--theme-text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  );

  // ── Palette panel ────────────────────────────────────────────────────────
  const PalettePanel = () => (
    <div
      className="absolute bottom-12 left-0 rounded shadow-xl p-2 flex gap-1 w-64 flex-wrap z-50 border"
      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={() => { onColorChange(''); onBgImageChange(''); }}
        className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
        style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-text-muted)' }}
        title={t('notes:tooltips.default')}
      >
        <X size={14} />
      </button>
      {DARK_COLORS.map(c => (
        <button
          key={c}
          onClick={() => { onColorChange(c); onBgImageChange(''); }}
          className={`w-6 h-6 rounded-full border-2 ${selectedColor === c ? 'border-blue-400' : 'border-transparent'}`}
          style={{ backgroundColor: c }}
        />
      ))}
      {COLORS.map(c => (
        <button
          key={c}
          onClick={() => { onColorChange(c); onBgImageChange(''); }}
          className={`w-6 h-6 rounded-full border-2 ${selectedColor === c ? 'border-blue-400' : 'border-gray-300'}`}
          style={{ backgroundColor: c }}
        />
      ))}
      <div className="w-full h-px my-1" style={{ backgroundColor: 'var(--theme-border)' }} />
      {BG_PATTERNS.map((bg, i) => (
        <button
          key={i}
          onClick={() => { onBgImageChange(bg); onColorChange(''); }}
          className="w-6 h-6 rounded-full border border-gray-400"
          style={{ backgroundImage: bg, backgroundColor: 'var(--theme-bg)' }}
        />
      ))}
      <div className="w-full h-px my-1" style={{ backgroundColor: 'var(--theme-border)' }} />
      <div className="flex gap-1 flex-wrap">
        {BG_IMAGES.map((url, i) => (
          <button
            key={i}
            onClick={() => { onBgImageChange(url); onColorChange(''); }}
            className="w-8 h-8 rounded-full border-2 border-gray-400 overflow-hidden"
            title={t('notes:tooltips.backgroundImage')}
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
        <label
          className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer"
          style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-text-muted)' }}
          title={t('notes:tooltips.uploadOwnImage')}
        >
          <Plus size={14} />
          <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} ref={bgFileInputRef} />
        </label>
      </div>
    </div>
  );

  // ── Labels panel ─────────────────────────────────────────────────────────
  const LabelsPanel = () => (
    <div
      className="absolute bottom-12 left-0 rounded shadow-xl py-2 z-50 w-48 max-h-48 overflow-y-auto border"
      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      onClick={e => e.stopPropagation()}
    >
      {availableLabels.map(l => (
        <label
          key={l.id}
          className="flex items-center gap-2 px-4 py-1 cursor-pointer text-sm"
          style={{ color: 'var(--theme-text)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <input type="checkbox" checked={selectedLabels.includes(l.id)} onChange={() => onToggleLabel(l.id)} />
          {l.name}
        </label>
      ))}
      {availableLabels.length === 0 && (
        <div className="px-4 text-sm" style={{ color: 'var(--theme-text-muted)' }}>
          {t('notes:editor.noLabelsYet')}
        </div>
      )}
    </div>
  );

  // ── Reminder panel ───────────────────────────────────────────────────────
  const ReminderPanel = () => (
    <div
      className="absolute bottom-12 left-0 rounded-xl p-3 shadow-xl z-50 w-64 border"
      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
      onClick={e => e.stopPropagation()}
    >
      <p className="text-sm mb-2" style={{ color: 'var(--theme-text-muted)' }}>{t('notes:reminders.set')}</p>
      <input
        type="datetime-local"
        value={reminderAt}
        onChange={e => onReminderChange?.(e.target.value)}
        className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-2"
        style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text)', border: '1px solid var(--theme-border)' }}
        min={new Date().toISOString().slice(0, 16)}
      />
      <div className="flex gap-2">
        <button
          onClick={() => { onReminderChange?.(''); setShowReminder(false); }}
          className="flex-1 py-1 text-sm rounded-lg transition-colors"
          style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text)' }}
        >
          {t('notes:reminders.delete')}
        </button>
        <button
          onClick={() => setShowReminder(false)}
          className="flex-1 py-1 text-sm font-medium rounded-lg text-black"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          {t('common:actions.ok')}
        </button>
      </div>
    </div>
  );

  // ── Secondary actions (for overflow or direct display) ───────────────────
  const SecondaryActions = ({ asDropdown = false }: { asDropdown?: boolean }) => {
    const inner = (
      <>
        {onDraw && (
          <Btn onClick={e => { e.stopPropagation(); setShowMore(false); onDraw(); }} title={t('notes:tooltips.draw')}>
            <Pencil size={iconSize} />
          </Btn>
        )}
        {onDuplicate && (
          <Btn onClick={e => { e.stopPropagation(); setShowMore(false); onDuplicate(); }} title={t('notes:tooltips.duplicate')}>
            <Copy size={iconSize} />
          </Btn>
        )}
        {onArchive && (
          <Btn onClick={e => { e.stopPropagation(); setShowMore(false); onArchive(); }} title={t('notes:tooltips.archive')}>
            <Archive size={iconSize} />
          </Btn>
        )}
        {onExport && (
          <Btn onClick={e => { e.stopPropagation(); setShowMore(false); onExport(); }} title={t('notes:tooltips.export')}>
            <Download size={iconSize} />
          </Btn>
        )}
      </>
    );

    if (!asDropdown) return <>{inner}</>;

    return (
      <div
        className="absolute bottom-12 right-0 rounded-xl shadow-xl border flex flex-col py-1 z-50 min-w-[40px] items-center"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {inner}
      </div>
    );
  };

  // ── Primary icons (always visible) ──────────────────────────────────────
  const primaryIcons = (
    <>
      {/* Palette */}
      <div ref={paletteRef} className="relative">
        <Btn onClick={e => { e.stopPropagation(); setShowPalette(p => !p); setShowLabels(false); setShowReminder(false); setShowMore(false); }}>
          <Palette size={iconSize} />
        </Btn>
        {showPalette && <PalettePanel />}
      </div>

      {/* Toggle list / text mode */}
      <Btn
        onClick={e => { e.stopPropagation(); onToggleListMode(); }}
        title={isListMode ? t('notes:tooltips.textMode') : t('notes:tooltips.listMode')}
      >
        {isListMode ? <Type size={iconSize} /> : <ListTodo size={iconSize} />}
      </Btn>

      {/* Labels */}
      <div ref={labelRef} className="relative">
        <Btn onClick={e => { e.stopPropagation(); setShowLabels(l => !l); setShowPalette(false); setShowReminder(false); setShowMore(false); }}>
          <Tag size={iconSize} />
        </Btn>
        {showLabels && <LabelsPanel />}
      </div>

      {/* Attach image */}
      {onAttachImage && (
        <Btn onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} title={t('notes:tooltips.addImage')}>
          <ImageIcon size={iconSize} />
        </Btn>
      )}

      {/* Reminder */}
      {onReminderChange && (
        <div ref={reminderRef} className="relative">
          <Btn
            onClick={e => { e.stopPropagation(); setShowReminder(r => !r); setShowPalette(false); setShowLabels(false); setShowMore(false); }}
            title={t('notes:reminders.title')}
            active={!!reminderAt}
          >
            <Bell size={iconSize} />
          </Btn>
          {!!reminderAt && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--theme-accent)' }} />
          )}
          {showReminder && <ReminderPanel />}
        </div>
      )}
    </>
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-1 relative ${className}`}>
        {primaryIcons}
        <div ref={moreRef} className="relative">
          <Btn
            onClick={e => { e.stopPropagation(); setShowMore(m => !m); setShowPalette(false); setShowLabels(false); setShowReminder(false); }}
            title={t('common:actions.more')}
          >
            <MoreHorizontal size={iconSize} />
          </Btn>
          {showMore && <SecondaryActions asDropdown />}
        </div>
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAttachFile} />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 relative ${className}`}>
      {primaryIcons}
      <SecondaryActions />
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAttachFile} />
    </div>
  );
}
