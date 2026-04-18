'use client';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Pin, Palette, Archive, RotateCcw, Copy, X, Bell } from 'lucide-react';

const COLORS = ['#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'];
const DARK_COLORS = ['#5c2b29', '#614a19', '#635d19', '#345920', '#16504b', '#2d555e', '#1e3a5f', '#42275e', '#5b2245', '#442f19', '#3c3f43'];
const BG_PATTERNS = [
  'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'3\'/%3E%3C/g%3E%3C/svg%3E")',
  'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0V0zm20 20h20v20H20V20zM0 20h20v20H0V20z\' fill=\'%239C92AC\' fill-opacity=\'0.05\'/%3E%3C/svg%3E")',
  'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'20\' viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 19h100v1H0v-1z\' fill=\'%239C92AC\' fill-opacity=\'0.2\'/%3E%3C/svg%3E")'
];
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=400&q=80',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80',
  'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=400&q=80',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
];

export default function NoteListItem({ note, onDelete, onUpdate, onRefresh, onEdit, onDuplicate, currentView }: any) {
  const { t, i18n } = useTranslation('notes');
  const [showPalette, setShowPalette] = useState(false);
  const bgColor = note.color ? note.color : '';
  const rawBgImage = note.bg_image ? note.bg_image : '';
  const isTrash = currentView === 'trash';

  const bgStyle = rawBgImage
    ? (rawBgImage.startsWith('/') || rawBgImage.startsWith('http'))
      ? { backgroundImage: `url(${rawBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { backgroundImage: rawBgImage }
    : {};

  const handleAction = (e: React.MouseEvent, action: Function) => { e.stopPropagation(); action(); };

  const handleToggleCheckmark = async (itemId: string, currentStatus: boolean, e: React.ChangeEvent) => {
    e.stopPropagation();
    if (isTrash) return;
    await fetch(`/api/notes/${note.id}/checklist/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked: !currentStatus }) });
    onRefresh();
  };

  const getPlainTextPreview = (html: string) => {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  const checkedCount = note.checklist_items?.filter((i: any) => i.checked).length ?? 0;
  const totalCount = note.checklist_items?.length ?? 0;

  const formattedDate = note.updated_at
    ? new Date(note.updated_at).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })
    : '';

  return (
    <div
      onClick={() => onEdit(note)}
      className="group relative rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer flex items-stretch min-h-[64px] overflow-hidden"
      style={{
        borderColor: 'var(--theme-border)',
        backgroundColor: bgColor || (!rawBgImage ? 'var(--theme-surface)' : undefined),
        ...bgStyle,
      }}
    >
      {bgColor && (
        <div className="w-1 shrink-0 rounded-l-xl" style={{ backgroundColor: bgColor }} />
      )}

      {note.attachments && note.attachments.length > 0 && (
        <div className="w-16 shrink-0 overflow-hidden bg-black/10">
          <img src={note.attachments[0].url} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex-1 px-4 py-3 flex items-center gap-4 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {note.pinned && !isTrash && (
              <Pin size={13} className="shrink-0 fill-current" style={{ color: 'var(--theme-text-muted)' }} />
            )}
            {note.reminder_at && !isTrash && (
              <span title={t('reminders.tooltip', { date: new Date(note.reminder_at).toLocaleString(i18n.language) })}>
                <Bell size={13} className="shrink-0" style={{ color: 'var(--theme-accent)' }} />
              </span>
            )}
            {note.title && (
              <span className="font-semibold text-sm truncate" style={{ color: 'var(--theme-text)' }}>
                {note.title}
              </span>
            )}
          </div>

          {note.checklist_items && note.checklist_items.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs truncate" style={{ color: 'var(--theme-text-muted)' }} onClick={e => e.stopPropagation()}>
                {note.checklist_items.slice(0, 3).map((item: any) => (
                  <label key={item.id} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={item.checked} onChange={e => handleToggleCheckmark(item.id, item.checked, e)} disabled={isTrash} className="cursor-pointer" />
                    <span className={item.checked ? 'line-through opacity-50' : ''}>{item.text}</span>
                  </label>
                ))}
                {totalCount > 3 && <span className="opacity-50">+{totalCount - 3}</span>}
              </div>
              {totalCount > 0 && (
                <span className="text-xs shrink-0" style={{ color: 'var(--theme-text-subtle)' }}>{checkedCount}/{totalCount}</span>
              )}
            </div>
          ) : note.content_text ? (
            <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>
              {getPlainTextPreview(note.content_text)}
            </p>
          ) : null}

          {note.labels && note.labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {note.labels.map((l: any) => (
                <span key={l.id} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--theme-hover)', color: 'var(--theme-text-muted)' }}>
                  {l.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {formattedDate && (
            <span className="text-[11px]" style={{ color: 'var(--theme-text-subtle)' }}>{formattedDate}</span>
          )}

          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {isTrash ? (
              <>
                <ListActionBtn onClick={e => handleAction(e, () => onDelete(note.id, true))} title={t('tooltips.deleteForever') || 'Delete forever'} className="text-red-500">
                  <Trash2 size={14} />
                </ListActionBtn>
                <ListActionBtn onClick={e => handleAction(e, () => onUpdate(note.id, { deleted_at: null }))} title={t('tooltips.restore') || 'Restore'} className="text-blue-500">
                  <RotateCcw size={14} />
                </ListActionBtn>
              </>
            ) : (
              <>
                <div className="relative">
                  <ListActionBtn onClick={e => handleAction(e, () => setShowPalette(!showPalette))} title={t('tooltips.changeColor') || 'Change color'}>
                    <Palette size={14} />
                  </ListActionBtn>
                  {showPalette && (
                    <div
                      className="absolute right-0 top-8 rounded shadow-xl p-2 flex gap-1 z-50 w-56 flex-wrap cursor-default border"
                      style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={e => handleAction(e, () => { onUpdate(note.id, { color: null, bg_image: null }); setShowPalette(false); })}
                        className="w-5 h-5 rounded-full border flex items-center justify-center"
                        style={{ borderColor: 'var(--theme-border-strong)', color: 'var(--theme-text-muted)' }}
                      >
                        <X size={12} />
                      </button>
                      {DARK_COLORS.map(c => (
                        <button key={c} onClick={e => handleAction(e, () => { onUpdate(note.id, { color: c, bg_image: null }); setShowPalette(false); })} className="w-5 h-5 rounded-full border border-gray-400" style={{ backgroundColor: c }} />
                      ))}
                      {COLORS.map(c => (
                        <button key={c} onClick={e => handleAction(e, () => { onUpdate(note.id, { color: c, bg_image: null }); setShowPalette(false); })} className="w-5 h-5 rounded-full border border-gray-400" style={{ backgroundColor: c }} />
                      ))}
                      <div className="w-full h-px my-1" style={{ backgroundColor: 'var(--theme-border)' }} />
                      {BG_PATTERNS.map((bg, i) => (
                        <button key={i} onClick={e => handleAction(e, () => { onUpdate(note.id, { bg_image: bg, color: null }); setShowPalette(false); })} className="w-6 h-6 rounded-full border border-gray-400" style={{ backgroundImage: bg, backgroundColor: 'var(--theme-bg)' }} />
                      ))}
                      <div className="w-full h-px my-1" style={{ backgroundColor: 'var(--theme-border)' }} />
                      <div className="flex gap-1 flex-wrap">
                        {BG_IMAGES.map((url, i) => (
                          <button key={i} onClick={e => handleAction(e, () => { onUpdate(note.id, { bg_image: url, color: null }); setShowPalette(false); })} className="w-8 h-8 rounded-full border-2 border-gray-400 overflow-hidden" title={t('tooltips.backgroundImage')}>
                            <img src={url} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <ListActionBtn onClick={e => handleAction(e, () => onDuplicate(note))} title={t('tooltips.duplicate') || 'Duplicate'}>
                  <Copy size={14} />
                </ListActionBtn>
                <ListActionBtn onClick={e => handleAction(e, () => onUpdate(note.id, { archived: !note.archived, pinned: false }))} title={t('tooltips.archive') || 'Archive'}>
                  <Archive size={14} />
                </ListActionBtn>
                <ListActionBtn
                  onClick={e => handleAction(e, () => onUpdate(note.id, { pinned: !note.pinned }))}
                  title={note.pinned ? (t('tooltips.unpin') || 'Unpin') : (t('tooltips.pin') || 'Pin')}
                  className={note.pinned ? '' : ''}
                >
                  <Pin size={14} className={note.pinned ? 'fill-current' : ''} style={{ color: note.pinned ? 'var(--theme-text)' : undefined }} />
                </ListActionBtn>
                <ListActionBtn onClick={e => handleAction(e, () => onDelete(note.id, false))} title={t('tooltips.delete') || 'Delete'} className="hover:text-red-500">
                  <Trash2 size={14} />
                </ListActionBtn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListActionBtn({ onClick, children, title, className = '' }: { onClick: React.MouseEventHandler; children: React.ReactNode; title?: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-full transition-colors ${className}`}
      style={{ color: 'var(--theme-text-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  );
}
