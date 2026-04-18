'use client';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash2, Undo2 } from 'lucide-react';
import dynamic from 'next/dynamic';

// SSR-safe Import
const ReactSketchCanvas = dynamic(
  () => import('react-sketch-canvas').then(mod => ({ default: mod.ReactSketchCanvas })),
  { ssr: false, loading: () => <div className="flex-1 bg-white rounded-lg animate-pulse" /> }
);

interface DrawingModalProps {
  onClose: () => void;
  onSave: (imageUrl: string, replacingUrl?: string) => void;
  initialImageUrl?: string; // wenn gesetzt: editiere bestehende Zeichnung
}

type CanvasSize =
  | { width: string; height: string }
  | { width: number; height: number };

const CANVAS_PRESETS: { label: string; size: CanvasSize }[] = [
  { label: 'Frei',        size: { width: '100%',  height: 'calc(100vh - 220px)' } },
  { label: 'Querformat',  size: { width: 1280,     height: 720 } },
  { label: 'Hochformat',  size: { width: 600,      height: 900 } },
  { label: 'Quadrat',     size: { width: 800,      height: 800 } },
  { label: 'A5',          size: { width: 560,      height: 794 } },
];

export default function DrawingModal({ onClose, onSave, initialImageUrl }: DrawingModalProps) {
  const { t } = useTranslation(['notes', 'common']);
  const canvasRef = useRef<any>(null);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [canvasPresetIdx, setCanvasPresetIdx] = useState(0);

  const canvasSize = CANVAS_PRESETS[canvasPresetIdx].size;

  const COLORS = ['#000000', '#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setSaving(true);
    try {
      const dataUrl = await canvasRef.current.exportImage('png');
      // Base64 → Blob → FormData → Upload
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const formData = new FormData();
      formData.append('file', blob, `drawing-${Date.now()}.png`);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (uploadRes.ok) {
        const { url } = await uploadRes.json();
        onSave(url, initialImageUrl);
      }
    } catch (e) {
      console.error(t('notes:drawing.savingDrawingError'), e);
    }
    setSaving(false);
  };

  const isFreeSize = canvasPresetIdx === 0;

  return (
    <div className="fixed inset-0 bg-black/80 z-[80] flex flex-col" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#202124] border-b border-gray-700 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-white font-medium">
            {initialImageUrl ? 'Zeichnung bearbeiten' : t('notes:drawing.title')}
          </span>

          {/* Canvas-Größe */}
          <div className="flex items-center gap-1">
            {CANVAS_PRESETS.map((preset, idx) => (
              <button
                key={preset.label}
                onClick={() => setCanvasPresetIdx(idx)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  canvasPresetIdx === idx
                    ? 'bg-yellow-500 text-black font-semibold'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Farben */}
          <div className="flex gap-1">
            {COLORS.map(c => (
              <button key={c} onClick={() => { setStrokeColor(c); setIsEraser(false); }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${strokeColor === c && !isEraser ? 'border-yellow-500 scale-110' : 'border-gray-600'}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
          {/* Strichbreite */}
          <input type="range" min="1" max="20" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))}
            className="w-20 accent-yellow-500" />
          {/* Radierer */}
          <button onClick={() => setIsEraser(!isEraser)}
            className={`px-3 py-1 rounded text-sm ${isEraser ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
            {t('notes:drawing.eraser')}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => canvasRef.current?.undo()} className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/10">
            <Undo2 size={18} />
          </button>
          <button onClick={() => canvasRef.current?.clearCanvas()} className="p-2 text-gray-400 hover:text-red-400 rounded hover:bg-white/10">
            <Trash2 size={18} />
          </button>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/10">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Hinweis bei Bearbeitungsmodus */}
      {initialImageUrl && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-1.5 text-yellow-300 text-xs text-center shrink-0">
          Zeichne auf dem Bild — beim Speichern werden deine Striche mit dem Bild kombiniert
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 p-4 flex items-start justify-center overflow-auto">
        <div
          className="bg-white rounded-xl shadow-2xl overflow-hidden"
          style={
            isFreeSize
              ? { width: '100%', maxWidth: '56rem', height: 'calc(100vh - 220px)' }
              : { width: canvasSize.width, height: canvasSize.height, flexShrink: 0 }
          }
        >
          <ReactSketchCanvas
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
            strokeWidth={isEraser ? strokeWidth * 2 : strokeWidth}
            strokeColor={isEraser ? '#ffffff' : strokeColor}
            canvasColor="white"
            backgroundImage={initialImageUrl || ''}
            preserveBackgroundImageAspectRatio="xMidYMid meet"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 px-4 py-3 bg-[#202124] border-t border-gray-700 shrink-0">
        <button onClick={onClose} className="px-4 py-2 text-gray-300 hover:bg-white/10 rounded-lg">
          {t('common:actions.cancel')}
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-lg">
          {saving ? t('common:actions.savingAsNote') : t('notes:drawing.saveAsNote')}
        </button>
      </div>
    </div>
  );
}
