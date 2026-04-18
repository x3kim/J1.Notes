'use client';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Check, Edit2 } from 'lucide-react';

const LABEL_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#06b6d4', '#84cc16', '#a855f7',
];

export default function EditLabelsModal({ labels, onClose, onRefresh }: any) {
  const { t } = useTranslation(['notes', 'common']);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await fetch('/api/labels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newLabel, color: newColor || null }),
    });
    setNewLabel('');
    setNewColor('');
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/labels/${id}`, { method: 'DELETE' });
    onRefresh();
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    await fetch(`/api/labels/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, color: editColor || null }),
    });
    setEditingId(null);
    onRefresh();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-xl shadow-2xl border p-4"
        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
      >
        <h2 className="text-lg font-medium mb-4">{t('notes:labels.editTitle')}</h2>

        {/* Neues Label erstellen */}
        <div className="mb-3">
          <div className="flex items-center gap-2 border-b pb-2 mb-2" style={{ borderColor: 'var(--theme-border)' }}>
            <Plus size={18} style={{ color: 'var(--theme-text-muted)' }} className="shrink-0" />
            <input
              type="text"
              placeholder={t('notes:labels.createNew')}
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="flex-1 bg-transparent outline-none placeholder-gray-500"
              style={{ color: 'var(--theme-text)' }}
            />
            {newLabel && (
              <button onClick={handleAdd}><Check size={18} className="text-blue-500" /></button>
            )}
          </div>
          {newLabel && (
            <div className="flex items-center gap-1 flex-wrap px-1">
              <button
                onClick={() => setNewColor('')}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!newColor ? 'border-blue-500' : 'border-gray-400'}`}
              >
                <X size={10} className="text-gray-400" />
              </button>
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${newColor === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {labels.map((l: any) => (
            <div key={l.id} className="rounded group">
              {editingId === l.id ? (
                <div className="p-2">
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(l.id)}
                      className="flex-1 bg-transparent border-b border-blue-500 outline-none"
                      style={{ color: 'var(--theme-text)' }}
                    />
                    <button onClick={() => handleUpdate(l.id)} className="text-blue-500 shrink-0"><Check size={16} /></button>
                    <button onClick={() => setEditingId(null)} className="shrink-0" style={{ color: 'var(--theme-text-muted)' }}><X size={14} /></button>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => setEditColor('')}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!editColor ? 'border-blue-500' : 'border-gray-400'}`}
                    >
                      <X size={10} className="text-gray-400" />
                    </button>
                    {LABEL_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${editColor === c ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between p-2 rounded"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => { setEditingId(l.id); setEditName(l.name); setEditColor(l.color || ''); }}
                      className="opacity-0 group-hover:opacity-100"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      <Edit2 size={14} />
                    </button>
                    {l.color && (
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    )}
                    <span
                      onClick={() => { setEditingId(l.id); setEditName(l.name); setEditColor(l.color || ''); }}
                      style={l.color ? { color: l.color } : { color: 'var(--theme-text)' }}
                      className="cursor-pointer hover:underline flex-1"
                    >
                      {l.name}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500"
                    style={{ color: 'var(--theme-text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded font-medium transition-colors"
            style={{ color: 'var(--theme-text)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--theme-hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            {t('common:actions.done')}
          </button>
        </div>
      </div>
    </div>
  );
}
